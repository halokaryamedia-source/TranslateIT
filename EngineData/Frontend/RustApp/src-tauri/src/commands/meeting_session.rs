use serde::Serialize;

use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::runtime_state::{
    begin_application_meeting_session, clear_runtime_handoff_state, clear_runtime_session_state,
    commit_application_meeting_session_live, latest_runtime_session_state,
    revoke_application_meeting_session_authority, RuntimeSessionStateReport,
};

use super::audio::get_input_status;
use super::helper_bridge::{cancel_helper_bridge_task, get_helper_bridge_status};
use super::pipeline_handoff::reset_live_pipeline_handoff_status;
use super::runtime_inventory::get_model_inventory;
use super::virtual_mic_route::get_virtual_mic_route_contract_status;

// Fail closed until the generation-aware continuous ASR -> translation -> TTS ->
// Meeting Microphone execution loop is attached to this application session owner.
// Developer pipeline payload/cache readiness is intentionally not accepted as a
// substitute for a user-facing continuous Meeting runtime.
const APPLICATION_OUTBOUND_RUNTIME_CONNECTED: bool = false;
const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionPreflightStatus {
    pub ready_for_start: bool,
    pub microphone_ready: bool,
    pub models_ready: bool,
    pub helper_ready: bool,
    pub provider_ready: bool,
    pub meeting_route_ready: bool,
    pub outbound_runtime_connected: bool,
    pub blockers: Vec<String>,
    pub summary: String,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionStatus {
    pub lifecycle: String,
    pub has_session: bool,
    pub authority_active: bool,
    pub session_id: Option<String>,
    pub generation: Option<u64>,
    pub started_unix_ms: Option<u128>,
    pub active_age_ms: Option<u128>,
    pub capture_active: bool,
    pub owner_id: Option<String>,
    pub blocker: String,
    pub note: String,
    pub preflight: MeetingSessionPreflightStatus,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionActionResult {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub status: MeetingSessionStatus,
}

fn build_preflight() -> MeetingSessionPreflightStatus {
    let input = get_input_status();
    let models = get_model_inventory();
    let helper = get_helper_bridge_status();
    let route = get_virtual_mic_route_contract_status();

    let microphone_ready = input.prepared;
    let models_ready = models.ok;
    let helper_ready = helper.state == "ready";
    let provider_ready = helper.provider_ready;
    let meeting_route_ready = route.route_ready;
    let outbound_runtime_connected = APPLICATION_OUTBOUND_RUNTIME_CONNECTED;

    let mut blockers = Vec::new();
    if !microphone_ready {
        blockers.push("meeting_session:microphone_not_ready".to_string());
    }
    if !models_ready {
        blockers.push("meeting_session:required_models_not_ready".to_string());
    }
    if !helper_ready || !provider_ready {
        blockers.push("meeting_session:local_runtime_not_ready".to_string());
    }
    if !meeting_route_ready {
        blockers.push(if route.blocker.is_empty() {
            "meeting_session:meeting_microphone_route_not_ready".to_string()
        } else {
            route.blocker.clone()
        });
    }
    if !outbound_runtime_connected {
        blockers.push("meeting_session:continuous_outbound_runtime_not_connected".to_string());
    }

    let ready_for_start = blockers.is_empty();
    MeetingSessionPreflightStatus {
        ready_for_start,
        microphone_ready,
        models_ready,
        helper_ready,
        provider_ready,
        meeting_route_ready,
        outbound_runtime_connected,
        blockers,
        summary: if ready_for_start {
            "Required outbound Meeting capabilities are ready for transactional Start.".to_string()
        } else {
            "Start Translation remains blocked until every required outbound capability, including the continuous generation-aware runtime, is ready.".to_string()
        },
        runtime_claim: "meeting_start_preflight_source_contract_not_windows_runtime_proof".to_string(),
    }
}

fn status_from_report(
    report: RuntimeSessionStateReport,
    preflight: MeetingSessionPreflightStatus,
) -> MeetingSessionStatus {
    let snapshot = report.snapshot.as_ref();
    MeetingSessionStatus {
        lifecycle: snapshot
            .map(|value| value.phase.clone())
            .unwrap_or_else(|| "idle".to_string()),
        has_session: report.has_active_session,
        authority_active: snapshot.map(|value| value.authority_active).unwrap_or(false),
        session_id: snapshot.map(|value| value.session_id.clone()),
        generation: snapshot.map(|value| value.generation),
        started_unix_ms: snapshot.map(|value| value.started_unix_ms),
        active_age_ms: report.active_age_ms,
        capture_active: snapshot
            .map(|value| value.live_capture_stream_active)
            .unwrap_or(false),
        owner_id: snapshot.map(|value| value.owner_id.clone()),
        blocker: report.blocker,
        note: report.note,
        preflight,
        runtime_claim: "application_meeting_session_source_contract_not_windows_runtime_proof"
            .to_string(),
    }
}

fn current_status() -> MeetingSessionStatus {
    status_from_report(latest_runtime_session_state(), build_preflight())
}

fn blocked_result(state: &str, message: String) -> MeetingSessionActionResult {
    MeetingSessionActionResult {
        ok: false,
        state: state.to_string(),
        message,
        status: current_status(),
    }
}

#[tauri::command]
pub fn get_meeting_session_status() -> MeetingSessionStatus {
    current_status()
}

#[tauri::command]
pub fn start_meeting_translation() -> MeetingSessionActionResult {
    let current = latest_runtime_session_state();
    if let Some(snapshot) = current.snapshot.as_ref() {
        if snapshot.owner_id == APPLICATION_MEETING_OWNER_ID
            && snapshot.authority_active
            && snapshot.phase == "live"
        {
            return MeetingSessionActionResult {
                ok: true,
                state: "already_live".to_string(),
                message: "Translation is already live. Duplicate Start did not create another Meeting session."
                    .to_string(),
                status: status_from_report(current, build_preflight()),
            };
        }
        return blocked_result(
            "active_session_conflict",
            "Another runtime session already owns Meeting resources. Stop it before starting a new Translation session."
                .to_string(),
        );
    }

    let preflight = build_preflight();
    if !preflight.ready_for_start {
        return MeetingSessionActionResult {
            ok: false,
            state: "blocked".to_string(),
            message: preflight.summary.clone(),
            status: status_from_report(latest_runtime_session_state(), preflight),
        };
    }

    let starting = begin_application_meeting_session();
    let Some(start_snapshot) = starting.snapshot.as_ref() else {
        return blocked_result(
            "start_authority_failed",
            "Start Translation could not establish application-level Meeting authority. No Meeting resources were opened."
                .to_string(),
        );
    };
    if start_snapshot.owner_id != APPLICATION_MEETING_OWNER_ID || !start_snapshot.authority_active {
        return blocked_result(
            "start_authority_conflict",
            "Start Translation did not receive the expected Meeting session authority. No additional resources were opened."
                .to_string(),
        );
    }

    let generation = start_snapshot.generation;
    let capture = start_live_capture_runtime(starting.clone());
    if !capture.ok {
        let _ = revoke_application_meeting_session_authority(
            generation,
            "Start Translation failed while opening the required microphone resource. Authority was revoked before rollback.",
        );
        let _ = stop_live_capture_runtime();
        let _ = reset_live_pipeline_handoff_status();
        let _ = clear_runtime_handoff_state();
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation was rolled back safely because the microphone resource could not be opened: {}",
                capture.message
            ),
        );
    }

    let committed = commit_application_meeting_session_live(
        generation,
        true,
        "Required Start resources were opened and the authoritative Meeting generation committed Live.",
    );
    if committed.blocker.is_empty() {
        return MeetingSessionActionResult {
            ok: true,
            state: "live".to_string(),
            message: "Translation Live session authority committed successfully.".to_string(),
            status: status_from_report(committed, build_preflight()),
        };
    }

    let _ = revoke_application_meeting_session_authority(
        generation,
        "Meeting Live commit failed after resource open. Authority was revoked before rollback.",
    );
    let _ = stop_live_capture_runtime();
    let _ = reset_live_pipeline_handoff_status();
    let _ = clear_runtime_handoff_state();
    let _ = clear_runtime_session_state();
    blocked_result(
        "rolled_back",
        "Start Translation could not commit the Meeting generation Live, so all opened Meeting resources were rolled back."
            .to_string(),
    )
}

#[tauri::command]
pub fn stop_meeting_translation() -> MeetingSessionActionResult {
    let current = latest_runtime_session_state();
    let Some(snapshot) = current.snapshot.as_ref() else {
        return MeetingSessionActionResult {
            ok: true,
            state: "already_stopped".to_string(),
            message: "Translation is already stopped. Stop remains idempotent.".to_string(),
            status: status_from_report(current, build_preflight()),
        };
    };

    let generation = snapshot.generation;

    // Safety order: revoke old generation authority before touching cleanup resources.
    // Any future generation-aware pipeline stage must reject this generation from
    // this point onward, even if cleanup takes time or partially fails.
    let revoked = revoke_application_meeting_session_authority(
        generation,
        "Stop Translation accepted. Old Meeting generation authority was revoked before cleanup.",
    );
    if revoked
        .snapshot
        .as_ref()
        .map(|value| value.authority_active)
        .unwrap_or(false)
    {
        return blocked_result(
            "stop_authority_failed",
            "Stop Translation could not revoke Meeting generation authority, so cleanup was not allowed to proceed under an ambiguous owner."
                .to_string(),
        );
    }

    let helper_cancel = cancel_helper_bridge_task();
    let capture_stop = stop_live_capture_runtime();
    let _ = reset_live_pipeline_handoff_status();
    let _ = clear_runtime_handoff_state();
    let cleared = clear_runtime_session_state();

    MeetingSessionActionResult {
        ok: true,
        state: "stopped".to_string(),
        message: format!(
            "Translation stopped. Session authority was revoked before cleanup. Microphone cleanup: {} Helper task cleanup: {}",
            capture_stop.message, helper_cancel.message
        ),
        status: status_from_report(cleared, build_preflight()),
    }
}

use serde::Serialize;
use serde_json::{json, Value};
use std::fs;
use std::sync::{Mutex, OnceLock};

use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::runtime_state::{
    begin_application_meeting_session, clear_runtime_handoff_state, clear_runtime_session_state,
    commit_application_meeting_session_live, latest_runtime_session_state,
    revoke_application_meeting_session_authority, runtime_generation_is_authoritative,
    RuntimeSessionStateReport,
};

use super::audio::get_input_status;
use super::helper_bridge::{
    cancel_helper_bridge_task, get_helper_bridge_status, send_helper_worker_task,
    HelperBridgeWorkerResponse,
};
use super::helper_bridge_runtime::unix_ms;
use super::pipeline_handoff::reset_live_pipeline_handoff_status;
use super::runtime_inventory::get_model_inventory;
use super::virtual_audio_route_runtime::{
    cancel_meeting_virtual_audio_route_provider, dispatch_meeting_virtual_audio_route_provider,
    meeting_route_execution_guard_status,
};
use super::virtual_mic_route::get_virtual_mic_route_contract_status;

const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionPreflightStatus {
    pub ready_for_start: bool,
    pub microphone_ready: bool,
    pub models_ready: bool,
    pub helper_ready: bool,
    pub provider_ready: bool,
    pub meeting_route_ready: bool,
    pub route_execution_guard_ready: bool,
    pub generation_aware_outbound_stages_ready: bool,
    pub finalized_utterance_source_connected: bool,
    pub outbound_runtime_connected: bool,
    pub blockers: Vec<String>,
    pub summary: String,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingOutboundRuntimeStatus {
    pub generation: Option<u64>,
    pub session_id: Option<String>,
    pub stage: String,
    pub utterance_sequence: u64,
    pub output_active: bool,
    pub last_stage_ok: bool,
    pub blocker: String,
    pub note: String,
    pub updated_unix_ms: u128,
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
    pub outbound: MeetingOutboundRuntimeStatus,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionActionResult {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub status: MeetingSessionStatus,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingOutboundProcessResult {
    pub ok: bool,
    pub delivered: bool,
    pub state: String,
    pub blocker: String,
    pub note: String,
    pub generation: u64,
    pub utterance_sequence: u64,
    pub runtime_claim: String,
}

static MEETING_OUTBOUND_STATUS: OnceLock<Mutex<MeetingOutboundRuntimeStatus>> = OnceLock::new();

fn idle_outbound_status() -> MeetingOutboundRuntimeStatus {
    MeetingOutboundRuntimeStatus {
        generation: None,
        session_id: None,
        stage: "idle".to_string(),
        utterance_sequence: 0,
        output_active: false,
        last_stage_ok: true,
        blocker: "meeting_outbound:finalized_utterance_source_not_connected".to_string(),
        note: "Generation-aware outbound AI and Meeting route stages exist, but the current rolling capture boundary does not yet produce finalized utterances for product output."
            .to_string(),
        updated_unix_ms: unix_ms(),
        runtime_claim: "meeting_outbound_finalized_segment_contract_source_side_not_windows_runtime_proof"
            .to_string(),
    }
}

fn outbound_status_store() -> &'static Mutex<MeetingOutboundRuntimeStatus> {
    MEETING_OUTBOUND_STATUS.get_or_init(|| Mutex::new(idle_outbound_status()))
}

fn current_outbound_status() -> MeetingOutboundRuntimeStatus {
    outbound_status_store()
        .lock()
        .map(|status| status.clone())
        .unwrap_or_else(|_| idle_outbound_status())
}

fn update_outbound_status(
    generation: u64,
    session_id: &str,
    stage: &str,
    utterance_sequence: u64,
    output_active: bool,
    last_stage_ok: bool,
    blocker: &str,
    note: &str,
) {
    if let Ok(mut status) = outbound_status_store().lock() {
        *status = MeetingOutboundRuntimeStatus {
            generation: Some(generation),
            session_id: Some(session_id.to_string()),
            stage: stage.to_string(),
            utterance_sequence,
            output_active,
            last_stage_ok,
            blocker: blocker.to_string(),
            note: note.to_string(),
            updated_unix_ms: unix_ms(),
            runtime_claim: "meeting_outbound_finalized_segment_contract_source_side_not_windows_runtime_proof"
                .to_string(),
        };
    }
}

fn generation_aware_outbound_stages_ready() -> bool {
    true
}

// The current capture boundary is a rolling VAD/ASR-ready window. It is not a
// stable/final utterance boundary and therefore cannot be promoted into Meeting
// output without violating the approved partial-vs-final speech contract.
fn finalized_utterance_source_connected() -> bool {
    false
}

fn application_outbound_runtime_connected() -> bool {
    generation_aware_outbound_stages_ready() && finalized_utterance_source_connected()
}

fn build_preflight() -> MeetingSessionPreflightStatus {
    let input = get_input_status();
    let models = get_model_inventory();
    let helper = get_helper_bridge_status();
    let route = get_virtual_mic_route_contract_status();
    let route_execution = meeting_route_execution_guard_status();

    let microphone_ready = input.prepared;
    let models_ready = models.ok;
    let helper_ready = helper.state == "ready";
    let provider_ready = helper.provider_ready;
    let meeting_route_ready = route.route_ready;
    let route_execution_guard_ready = route_execution.ready;
    let generation_aware_outbound_stages_ready = generation_aware_outbound_stages_ready();
    let finalized_utterance_source_connected = finalized_utterance_source_connected();
    let outbound_runtime_connected = application_outbound_runtime_connected();

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
    if !route_execution_guard_ready {
        blockers.push(if route_execution.blocker.is_empty() {
            "meeting_session:meeting_route_execution_not_ready".to_string()
        } else {
            route_execution.blocker.clone()
        });
    }
    if !generation_aware_outbound_stages_ready {
        blockers.push("meeting_session:generation_aware_outbound_stages_not_ready".to_string());
    }
    if !finalized_utterance_source_connected {
        blockers.push("meeting_session:finalized_utterance_source_not_connected".to_string());
    }
    if !outbound_runtime_connected {
        blockers.push("meeting_session:continuous_outbound_runtime_not_connected".to_string());
    }
    blockers.sort();
    blockers.dedup();

    let ready_for_start = blockers.is_empty();
    MeetingSessionPreflightStatus {
        ready_for_start,
        microphone_ready,
        models_ready,
        helper_ready,
        provider_ready,
        meeting_route_ready,
        route_execution_guard_ready,
        generation_aware_outbound_stages_ready,
        finalized_utterance_source_connected,
        outbound_runtime_connected,
        blockers,
        summary: if ready_for_start {
            "Required outbound Meeting capabilities are ready for transactional Start."
                .to_string()
        } else {
            "Start Translation remains blocked until finalized outbound speech can enter the generation-aware Meeting pipeline safely."
                .to_string()
        },
        runtime_claim: "meeting_start_preflight_source_contract_not_windows_runtime_proof"
            .to_string(),
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
        outbound: current_outbound_status(),
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

fn worker_json(response: &HelperBridgeWorkerResponse) -> Value {
    serde_json::from_str::<Value>(&response.worker_response_json).unwrap_or_else(|_| json!({}))
}

fn worker_text(response: &HelperBridgeWorkerResponse, key: &str) -> Option<String> {
    let value = worker_json(response);
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(str::to_string)
}

fn worker_blocker(response: &HelperBridgeWorkerResponse, fallback: &str) -> String {
    worker_text(response, "blocker").unwrap_or_else(|| fallback.to_string())
}

fn generation_is_live(generation: u64) -> bool {
    if !runtime_generation_is_authoritative(generation) {
        return false;
    }
    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| snapshot.generation == generation && snapshot.phase == "live")
        .unwrap_or(false)
}

fn tts_output_path(session_id: &str, generation: u64, utterance_sequence: u64) -> String {
    format!(
        "UserData/CacheData/meeting_tts/{}_g{}_u{}.wav",
        session_id, generation, utterance_sequence
    )
}

fn remove_temporary_tts(path: &str) {
    if !path.trim().is_empty() {
        let _ = fs::remove_file(path);
    }
}

fn stale_outbound_result(generation: u64, utterance_sequence: u64) -> MeetingOutboundProcessResult {
    MeetingOutboundProcessResult {
        ok: false,
        delivered: false,
        state: "stale_generation".to_string(),
        blocker: "meeting_outbound:generation_not_authoritative".to_string(),
        note: "Outbound work was discarded because its Meeting generation no longer owns output authority."
            .to_string(),
        generation,
        utterance_sequence,
        runtime_claim: "meeting_outbound_generation_rejected_before_promotion".to_string(),
    }
}

// Canonical generation-aware AI/output boundary for a speech segment that has
// ALREADY been finalized by the audio/segmentation owner. This function does not
// decide whether rolling microphone audio is final; that responsibility stays with
// the audio boundary so partial speech cannot accidentally become Meeting output.
pub fn process_authoritative_finalized_outbound_wav(
    generation: u64,
    session_id: &str,
    utterance_sequence: u64,
    audio_path: String,
) -> MeetingOutboundProcessResult {
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, utterance_sequence);
    }

    update_outbound_status(
        generation,
        session_id,
        "transcribing",
        utterance_sequence,
        false,
        true,
        "",
        "Finalized Indonesian speech is being transcribed locally.",
    );
    let asr = send_helper_worker_task(
        "transcribe",
        json!({
            "audio_path": audio_path,
            "language": "id",
            "beam_size": 1,
            "vad_filter": true,
            "meeting_session_id": session_id,
            "meeting_generation": generation,
            "utterance_id": utterance_sequence,
        }),
    );
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, utterance_sequence);
    }
    let transcript = worker_text(&asr, "transcript_text");
    if !asr.ok || transcript.is_none() {
        let blocker = worker_blocker(&asr, "asr:empty_transcript");
        update_outbound_status(
            generation,
            session_id,
            "listening",
            utterance_sequence,
            false,
            blocker.contains("empty_transcript"),
            if blocker.contains("empty_transcript") { "" } else { &blocker },
            if blocker.contains("empty_transcript") {
                "Finalized speech did not produce a stable transcript. No Meeting output was generated."
            } else {
                "Local ASR failed before translation. No Meeting output was generated."
            },
        );
        return MeetingOutboundProcessResult {
            ok: blocker.contains("empty_transcript"),
            delivered: false,
            state: if blocker.contains("empty_transcript") {
                "no_stable_transcript"
            } else {
                "asr_failed"
            }
            .to_string(),
            blocker: if blocker.contains("empty_transcript") {
                String::new()
            } else {
                blocker
            },
            note: "No Meeting output was generated from this finalized segment.".to_string(),
            generation,
            utterance_sequence,
            runtime_claim: "meeting_outbound_finalized_segment_not_delivered".to_string(),
        };
    }
    let transcript = transcript.unwrap_or_default();

    update_outbound_status(
        generation,
        session_id,
        "translating",
        utterance_sequence,
        false,
        true,
        "",
        "Final Indonesian transcript is being translated to English.",
    );
    let translation = send_helper_worker_task(
        "translate",
        json!({
            "text": transcript,
            "source_language": "id",
            "target_language": "en",
            "mode": "Realtime",
            "max_new_tokens": 96,
            "meeting_session_id": session_id,
            "meeting_generation": generation,
            "utterance_id": utterance_sequence,
        }),
    );
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, utterance_sequence);
    }
    let translated_text = worker_text(&translation, "translated_text");
    if !translation.ok || translated_text.is_none() {
        let blocker = worker_blocker(&translation, "translation:empty_output");
        update_outbound_status(
            generation,
            session_id,
            "attention_needed",
            utterance_sequence,
            false,
            false,
            &blocker,
            "Local translation failed before TTS. No Meeting output was generated.",
        );
        return MeetingOutboundProcessResult {
            ok: false,
            delivered: false,
            state: "translation_failed".to_string(),
            blocker,
            note: "No Meeting output was generated from this finalized segment.".to_string(),
            generation,
            utterance_sequence,
            runtime_claim: "meeting_outbound_translation_failed_before_output".to_string(),
        };
    }
    let translated_text = translated_text.unwrap_or_default();

    update_outbound_status(
        generation,
        session_id,
        "synthesizing",
        utterance_sequence,
        false,
        true,
        "",
        "Translated English text is being synthesized locally.",
    );
    let requested_tts_path = tts_output_path(session_id, generation, utterance_sequence);
    let tts = send_helper_worker_task(
        "synthesize",
        json!({
            "text": translated_text,
            "output_path": requested_tts_path,
            "meeting_session_id": session_id,
            "meeting_generation": generation,
            "utterance_id": utterance_sequence,
        }),
    );
    let tts_path = worker_text(&tts, "output_path").unwrap_or_default();
    if !generation_is_live(generation) {
        remove_temporary_tts(&tts_path);
        return stale_outbound_result(generation, utterance_sequence);
    }
    if !tts.ok || tts_path.is_empty() {
        let blocker = worker_blocker(&tts, "tts:missing_output");
        remove_temporary_tts(&tts_path);
        update_outbound_status(
            generation,
            session_id,
            "attention_needed",
            utterance_sequence,
            false,
            false,
            &blocker,
            "Local TTS failed before Meeting delivery. No Meeting output was generated.",
        );
        return MeetingOutboundProcessResult {
            ok: false,
            delivered: false,
            state: "tts_failed".to_string(),
            blocker,
            note: "No Meeting output was generated from this finalized segment.".to_string(),
            generation,
            utterance_sequence,
            runtime_claim: "meeting_outbound_tts_failed_before_output".to_string(),
        };
    }

    update_outbound_status(
        generation,
        session_id,
        "delivering",
        utterance_sequence,
        true,
        true,
        "",
        "Translated voice is being delivered through TranslateIT Meeting Microphone.",
    );
    let route = dispatch_meeting_virtual_audio_route_provider(tts_path.clone(), generation);
    remove_temporary_tts(&tts_path);
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, utterance_sequence);
    }
    if !route.ok || !route.route_execution_attempted {
        let blocker = if route.blocker.is_empty() {
            "meeting_outbound:meeting_route_delivery_failed".to_string()
        } else {
            route.blocker
        };
        update_outbound_status(
            generation,
            session_id,
            "attention_needed",
            utterance_sequence,
            false,
            false,
            &blocker,
            "Translated voice could not be safely delivered to the Meeting microphone route.",
        );
        return MeetingOutboundProcessResult {
            ok: false,
            delivered: false,
            state: "delivery_failed".to_string(),
            blocker,
            note: "Meeting output was not accepted as complete.".to_string(),
            generation,
            utterance_sequence,
            runtime_claim: "meeting_outbound_delivery_failed_or_unproved".to_string(),
        };
    }

    update_outbound_status(
        generation,
        session_id,
        "listening",
        utterance_sequence,
        false,
        true,
        "",
        "Translated voice output completed for the authoritative Meeting generation.",
    );
    MeetingOutboundProcessResult {
        ok: true,
        delivered: true,
        state: "output_complete".to_string(),
        blocker: String::new(),
        note: "Generation-aware outbound stages completed. Windows delivery remains local proof."
            .to_string(),
        generation,
        utterance_sequence,
        runtime_claim: "meeting_outbound_output_execution_attempted_needs_windows_runtime_validation"
            .to_string(),
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

    // This path remains unreachable while finalized_utterance_source_connected() is
    // false. It is intentionally retained as the transactional resource boundary for
    // the next audio-finalization slice.
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
    let _ = cancel_meeting_virtual_audio_route_provider(generation);
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

    // Safety order: revoke old generation authority first. Route playback is then
    // cancellation-signalled before capture/helper cleanup, so stale AI results can
    // no longer be promoted to a new Meeting output after Stop is accepted.
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

    let _ = cancel_meeting_virtual_audio_route_provider(generation);
    let capture_stop = stop_live_capture_runtime();
    let helper_cancel = cancel_helper_bridge_task();
    let _ = reset_live_pipeline_handoff_status();
    let _ = clear_runtime_handoff_state();
    let cleared = clear_runtime_session_state();

    MeetingSessionActionResult {
        ok: true,
        state: "stopped".to_string(),
        message: format!(
            "Translation stopped. Session authority was revoked before route/capture/helper cleanup. Microphone cleanup: {} Helper task cleanup: {}",
            capture_stop.message, helper_cancel.message
        ),
        status: status_from_report(cleared, build_preflight()),
    }
}

use serde::Serialize;
use serde_json::{json, Value};
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;

use crate::engine::audio::live_audio_buffer::{
    live_audio_buffer_status, live_target_segment_snapshot,
};
use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::audio::live_segment_writer::write_latest_live_target_segment_wav;
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
const OUTBOUND_LOOP_POLL_MS: u64 = 40;

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionPreflightStatus {
    pub ready_for_start: bool,
    pub microphone_ready: bool,
    pub models_ready: bool,
    pub helper_ready: bool,
    pub provider_ready: bool,
    pub meeting_route_ready: bool,
    pub route_execution_guard_ready: bool,
    pub outbound_runtime_connected: bool,
    pub outbound_runtime_available: bool,
    pub blockers: Vec<String>,
    pub summary: String,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingOutboundRuntimeStatus {
    pub running: bool,
    pub generation: Option<u64>,
    pub session_id: Option<String>,
    pub stage: String,
    pub utterance_sequence: u64,
    pub processed_frame_cursor: u64,
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

#[derive(Clone)]
struct MeetingOutboundRuntimeControl {
    generation: u64,
    stop_requested: Arc<AtomicBool>,
    running: Arc<AtomicBool>,
}

static MEETING_OUTBOUND_CONTROL: OnceLock<Mutex<Option<MeetingOutboundRuntimeControl>>> =
    OnceLock::new();
static MEETING_OUTBOUND_STATUS: OnceLock<Mutex<MeetingOutboundRuntimeStatus>> = OnceLock::new();

fn outbound_control() -> &'static Mutex<Option<MeetingOutboundRuntimeControl>> {
    MEETING_OUTBOUND_CONTROL.get_or_init(|| Mutex::new(None))
}

fn idle_outbound_status() -> MeetingOutboundRuntimeStatus {
    MeetingOutboundRuntimeStatus {
        running: false,
        generation: None,
        session_id: None,
        stage: "idle".to_string(),
        utterance_sequence: 0,
        processed_frame_cursor: 0,
        output_active: false,
        last_stage_ok: true,
        blocker: String::new(),
        note: "No application Meeting outbound runtime is active.".to_string(),
        updated_unix_ms: unix_ms(),
        runtime_claim: "meeting_outbound_runtime_source_contract_not_windows_runtime_proof"
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

fn set_outbound_status(status: MeetingOutboundRuntimeStatus) {
    if let Ok(mut stored) = outbound_status_store().lock() {
        *stored = status;
    }
}

fn update_outbound_stage(
    generation: u64,
    session_id: &str,
    stage: &str,
    utterance_sequence: u64,
    processed_frame_cursor: u64,
    output_active: bool,
    last_stage_ok: bool,
    blocker: &str,
    note: &str,
) {
    set_outbound_status(MeetingOutboundRuntimeStatus {
        running: true,
        generation: Some(generation),
        session_id: Some(session_id.to_string()),
        stage: stage.to_string(),
        utterance_sequence,
        processed_frame_cursor,
        output_active,
        last_stage_ok,
        blocker: blocker.to_string(),
        note: note.to_string(),
        updated_unix_ms: unix_ms(),
        runtime_claim: "meeting_outbound_runtime_source_contract_not_windows_runtime_proof"
            .to_string(),
    });
}

fn outbound_runtime_is_running() -> bool {
    outbound_control()
        .lock()
        .ok()
        .and_then(|control| control.clone())
        .map(|control| control.running.load(Ordering::Acquire))
        .unwrap_or(false)
}

fn application_outbound_runtime_connected() -> bool {
    true
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
    let outbound_runtime_connected = application_outbound_runtime_connected();
    let outbound_runtime_available = !outbound_runtime_is_running();

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
    if !outbound_runtime_connected {
        blockers.push("meeting_session:continuous_outbound_runtime_not_connected".to_string());
    }
    if !outbound_runtime_available {
        blockers.push("meeting_session:previous_outbound_runtime_stopping".to_string());
    }

    let ready_for_start = blockers.is_empty();
    MeetingSessionPreflightStatus {
        ready_for_start,
        microphone_ready,
        models_ready,
        helper_ready,
        provider_ready,
        meeting_route_ready,
        route_execution_guard_ready,
        outbound_runtime_connected,
        outbound_runtime_available,
        blockers,
        summary: if ready_for_start {
            "Required outbound Meeting capabilities are ready for transactional Start."
                .to_string()
        } else {
            "Start Translation is blocked until every required outbound capability is ready."
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
    worker_json(response)
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn worker_blocker(response: &HelperBridgeWorkerResponse, fallback: &str) -> String {
    worker_text(response, "blocker").unwrap_or_else(|| fallback.to_string())
}

fn generation_still_live(generation: u64) -> bool {
    if !runtime_generation_is_authoritative(generation) {
        return false;
    }
    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| snapshot.generation == generation && snapshot.phase == "live")
        .unwrap_or(false)
}

fn fail_outbound_generation(
    generation: u64,
    session_id: &str,
    utterance_sequence: u64,
    processed_frame_cursor: u64,
    blocker: &str,
    note: &str,
) {
    update_outbound_stage(
        generation,
        session_id,
        "attention_needed",
        utterance_sequence,
        processed_frame_cursor,
        false,
        false,
        blocker,
        note,
    );
    if runtime_generation_is_authoritative(generation) {
        let _ = revoke_application_meeting_session_authority(
            generation,
            "Outbound Meeting runtime failed. Generation authority was revoked before further output.",
        );
    }
    let _ = cancel_meeting_virtual_audio_route_provider(generation);
    let _ = stop_live_capture_runtime();
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

fn run_meeting_outbound_loop(
    generation: u64,
    session_id: String,
    stop_requested: Arc<AtomicBool>,
    running: Arc<AtomicBool>,
) {
    let mut processed_frame_cursor = 0u64;
    let mut utterance_sequence = 0u64;

    update_outbound_stage(
        generation,
        &session_id,
        "starting",
        utterance_sequence,
        processed_frame_cursor,
        false,
        true,
        "",
        "Outbound runtime is waiting for the authoritative Meeting generation to commit Live.",
    );

    loop {
        if stop_requested.load(Ordering::Acquire)
            || !runtime_generation_is_authoritative(generation)
        {
            break;
        }
        if !generation_still_live(generation) {
            thread::sleep(Duration::from_millis(OUTBOUND_LOOP_POLL_MS));
            continue;
        }

        let buffer = live_audio_buffer_status();
        if !buffer.ready_for_target_asr_frame {
            update_outbound_stage(
                generation,
                &session_id,
                "listening",
                utterance_sequence,
                processed_frame_cursor,
                false,
                true,
                "",
                "Listening for a finalized outbound speech segment.",
            );
            thread::sleep(Duration::from_millis(OUTBOUND_LOOP_POLL_MS));
            continue;
        }

        let segment = live_target_segment_snapshot();
        if !segment.ready || segment.source_sample_count == 0 {
            thread::sleep(Duration::from_millis(OUTBOUND_LOOP_POLL_MS));
            continue;
        }

        let new_frames = buffer.frames_received.saturating_sub(processed_frame_cursor);
        let required_new_frames = segment.source_sample_count as u64;
        if processed_frame_cursor > 0 && new_frames < required_new_frames {
            thread::sleep(Duration::from_millis(OUTBOUND_LOOP_POLL_MS));
            continue;
        }

        // Claim the current rolling segment before the blocking AI stages. Capture may
        // continue while inference runs; on return the next iteration favors fresh
        // audio instead of replaying a stale backlog.
        processed_frame_cursor = buffer.frames_received;
        utterance_sequence = utterance_sequence.saturating_add(1);

        let write = write_latest_live_target_segment_wav();
        if !write.ok {
            fail_outbound_generation(
                generation,
                &session_id,
                utterance_sequence,
                processed_frame_cursor,
                &write.blocker,
                "Outbound audio segment could not be prepared for local ASR.",
            );
            break;
        }
        let Some(audio_path) = write.audio_path.clone() else {
            fail_outbound_generation(
                generation,
                &session_id,
                utterance_sequence,
                processed_frame_cursor,
                "meeting_outbound:missing_asr_audio_path",
                "Outbound audio segment was prepared without a usable ASR path.",
            );
            break;
        };
        if !runtime_generation_is_authoritative(generation) {
            break;
        }

        update_outbound_stage(
            generation,
            &session_id,
            "transcribing",
            utterance_sequence,
            processed_frame_cursor,
            false,
            true,
            "",
            "Finalized outbound speech is being transcribed locally.",
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
        if !runtime_generation_is_authoritative(generation) {
            break;
        }
        let transcript = worker_text(&asr, "transcript_text");
        if !asr.ok || transcript.is_none() {
            let blocker = worker_blocker(&asr, "asr:empty_transcript");
            if blocker.contains("empty_transcript") {
                update_outbound_stage(
                    generation,
                    &session_id,
                    "listening",
                    utterance_sequence,
                    processed_frame_cursor,
                    false,
                    true,
                    "",
                    "Speech segment did not produce a stable transcript. No Meeting output was generated.",
                );
                continue;
            }
            fail_outbound_generation(
                generation,
                &session_id,
                utterance_sequence,
                processed_frame_cursor,
                &blocker,
                "Local ASR failed before translation. No Meeting output was generated.",
            );
            break;
        }
        let transcript = transcript.unwrap_or_default();

        update_outbound_stage(
            generation,
            &session_id,
            "translating",
            utterance_sequence,
            processed_frame_cursor,
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
        if !runtime_generation_is_authoritative(generation) {
            break;
        }
        let translated_text = worker_text(&translation, "translated_text");
        if !translation.ok || translated_text.is_none() {
            let blocker = worker_blocker(&translation, "translation:empty_output");
            fail_outbound_generation(
                generation,
                &session_id,
                utterance_sequence,
                processed_frame_cursor,
                &blocker,
                "Local translation failed before TTS. No Meeting output was generated.",
            );
            break;
        }
        let translated_text = translated_text.unwrap_or_default();

        update_outbound_stage(
            generation,
            &session_id,
            "synthesizing",
            utterance_sequence,
            processed_frame_cursor,
            false,
            true,
            "",
            "Translated English text is being synthesized locally.",
        );
        let requested_tts_path = tts_output_path(&session_id, generation, utterance_sequence);
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
        if !runtime_generation_is_authoritative(generation) {
            remove_temporary_tts(&tts_path);
            break;
        }
        if !tts.ok || tts_path.is_empty() {
            let blocker = worker_blocker(&tts, "tts:missing_output");
            remove_temporary_tts(&tts_path);
            fail_outbound_generation(
                generation,
                &session_id,
                utterance_sequence,
                processed_frame_cursor,
                &blocker,
                "Local TTS failed before Meeting delivery. No Meeting output was generated.",
            );
            break;
        }

        update_outbound_stage(
            generation,
            &session_id,
            "delivering",
            utterance_sequence,
            processed_frame_cursor,
            true,
            true,
            "",
            "Translated voice is being delivered through TranslateIT Meeting Microphone.",
        );
        let route = dispatch_meeting_virtual_audio_route_provider(tts_path.clone(), generation);
        remove_temporary_tts(&tts_path);
        if !runtime_generation_is_authoritative(generation) {
            break;
        }
        if !route.ok || !route.route_execution_attempted {
            let blocker = if route.blocker.is_empty() {
                "meeting_outbound:meeting_route_delivery_failed"
            } else {
                route.blocker.as_str()
            };
            fail_outbound_generation(
                generation,
                &session_id,
                utterance_sequence,
                processed_frame_cursor,
                blocker,
                "Translated voice could not be safely delivered to the Meeting microphone route.",
            );
            break;
        }

        update_outbound_stage(
            generation,
            &session_id,
            "listening",
            utterance_sequence,
            processed_frame_cursor,
            false,
            true,
            "",
            "Outbound translation output completed. Listening for the next speech segment.",
        );
    }

    running.store(false, Ordering::Release);
    if let Ok(mut control) = outbound_control().lock() {
        if control
            .as_ref()
            .map(|value| value.generation == generation)
            .unwrap_or(false)
        {
            if let Some(value) = control.as_mut() {
                value.running.store(false, Ordering::Release);
            }
        }
    }

    let current = current_outbound_status();
    if current.generation == Some(generation) && current.stage != "attention_needed" {
        set_outbound_status(MeetingOutboundRuntimeStatus {
            running: false,
            generation: Some(generation),
            session_id: Some(session_id),
            stage: "stopped".to_string(),
            utterance_sequence,
            processed_frame_cursor,
            output_active: false,
            last_stage_ok: true,
            blocker: String::new(),
            note: "Outbound runtime stopped after Meeting generation authority ended."
                .to_string(),
            updated_unix_ms: unix_ms(),
            runtime_claim: "meeting_outbound_runtime_source_contract_not_windows_runtime_proof"
                .to_string(),
        });
    }
}

fn start_meeting_outbound_runtime(generation: u64, session_id: &str) -> Result<(), String> {
    if !runtime_generation_is_authoritative(generation) {
        return Err("Meeting generation is not authoritative before outbound runtime start.".to_string());
    }

    let stop_requested = Arc::new(AtomicBool::new(false));
    let running = Arc::new(AtomicBool::new(true));
    {
        let mut control = outbound_control()
            .lock()
            .map_err(|_| "Outbound runtime state lock failed.".to_string())?;
        if let Some(existing) = control.as_ref() {
            if existing.running.load(Ordering::Acquire) {
                return Err("A previous outbound runtime is still stopping.".to_string());
            }
        }
        *control = Some(MeetingOutboundRuntimeControl {
            generation,
            stop_requested: Arc::clone(&stop_requested),
            running: Arc::clone(&running),
        });
    }

    let thread_session_id = session_id.to_string();
    let spawn = thread::Builder::new()
        .name(format!("translateit-meeting-outbound-{generation}"))
        .spawn(move || {
            run_meeting_outbound_loop(
                generation,
                thread_session_id,
                stop_requested,
                running,
            )
        });

    if let Err(error) = spawn {
        if let Ok(mut control) = outbound_control().lock() {
            *control = None;
        }
        set_outbound_status(MeetingOutboundRuntimeStatus {
            running: false,
            generation: Some(generation),
            session_id: Some(session_id.to_string()),
            stage: "attention_needed".to_string(),
            utterance_sequence: 0,
            processed_frame_cursor: 0,
            output_active: false,
            last_stage_ok: false,
            blocker: "meeting_outbound:thread_spawn_failed".to_string(),
            note: format!("Outbound runtime thread could not start: {error}"),
            updated_unix_ms: unix_ms(),
            runtime_claim: "meeting_outbound_runtime_source_contract_not_windows_runtime_proof"
                .to_string(),
        });
        return Err("Outbound Meeting runtime could not start.".to_string());
    }

    Ok(())
}

fn request_stop_meeting_outbound_runtime(generation: u64) {
    if let Ok(control) = outbound_control().lock() {
        if let Some(control) = control.as_ref() {
            if control.generation == generation {
                control.stop_requested.store(true, Ordering::Release);
            }
        }
    }
    let _ = cancel_meeting_virtual_audio_route_provider(generation);
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
    let session_id = start_snapshot.session_id.clone();
    if let Err(error) = start_meeting_outbound_runtime(generation, &session_id) {
        let _ = revoke_application_meeting_session_authority(
            generation,
            "Start Translation failed before microphone open because outbound runtime ownership could not start.",
        );
        request_stop_meeting_outbound_runtime(generation);
        let _ = clear_runtime_session_state();
        return blocked_result("rolled_back", error);
    }

    let capture = start_live_capture_runtime(starting.clone());
    if !capture.ok {
        let _ = revoke_application_meeting_session_authority(
            generation,
            "Start Translation failed while opening the required microphone resource. Authority was revoked before rollback.",
        );
        request_stop_meeting_outbound_runtime(generation);
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
        "Required Start resources were opened and the authoritative Meeting generation committed Live. Continuous outbound execution is generation-owned.",
    );
    if committed.blocker.is_empty() {
        return MeetingSessionActionResult {
            ok: true,
            state: "live".to_string(),
            message: "Translation Live session authority and outbound runtime committed successfully."
                .to_string(),
            status: status_from_report(committed, build_preflight()),
        };
    }

    let _ = revoke_application_meeting_session_authority(
        generation,
        "Meeting Live commit failed after resource open. Authority was revoked before rollback.",
    );
    request_stop_meeting_outbound_runtime(generation);
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
    // The outbound loop checks this authority after every blocking AI stage and the
    // route provider is cancellable while playback is in progress.
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

    request_stop_meeting_outbound_runtime(generation);
    let helper_cancel = cancel_helper_bridge_task();
    let capture_stop = stop_live_capture_runtime();
    let _ = reset_live_pipeline_handoff_status();
    let _ = clear_runtime_handoff_state();
    let cleared = clear_runtime_session_state();

    MeetingSessionActionResult {
        ok: true,
        state: "stopped".to_string(),
        message: format!(
            "Translation stopped. Session authority was revoked before outbound/helper/capture cleanup. Microphone cleanup: {} Helper task cleanup: {}",
            capture_stop.message, helper_cancel.message
        ),
        status: status_from_report(cleared, build_preflight()),
    }
}

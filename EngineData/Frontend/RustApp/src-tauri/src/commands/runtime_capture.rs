use serde::Serialize;
use serde_json::{json, Value};
use std::sync::{Mutex, OnceLock};

use crate::engine;
use crate::engine::audio::input::InputPreparationStatus;
use crate::engine::runtime_settings::RuntimeSettings;
use crate::engine::state::CommandResult;

use super::helper_bridge::start_helper_bridge;
use super::helper_bridge::{
    cancel_helper_bridge_task, get_helper_bridge_status, send_helper_bridge_request,
};
use super::helper_bridge_runtime::{
    unix_ms, HelperBridgeActionResult, HelperBridgeRequest, HelperBridgeStatus,
};
use super::runtime_preview::{compact_preview_text, voice_capture_blockers};

#[derive(Debug, Clone, Serialize)]
pub struct CaptureHelperBridgeRequestPreview {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub command: String,
    pub helper_task: String,
    pub generation_token: u64,
    pub provider_ready: bool,
    pub cuda_ready: bool,
    pub requires_provider_ready: bool,
    pub migration_ready: bool,
    pub preview_only: bool,
    pub runtime_claim: String,
    pub payload_json: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CaptureHelperDispatchStatus {
    pub attempted: bool,
    pub command: String,
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub generation_token: u64,
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
pub struct CaptureTranscriptBoundaryStatus {
    pub capture_dispatch_attempted: bool,
    pub capture_dispatch_ok: bool,
    pub helper_capture_command: String,
    pub helper_capture_state: String,
    pub existing_capture_active: bool,
    pub frames_received: u64,
    pub buffered_duration_ms: u32,
    pub ready_for_vad: bool,
    pub ready_for_target_asr_frame: bool,
    pub transcript_handoff_ready: bool,
    pub blocker: String,
    pub next_action: String,
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
pub struct AsrHandoffRequestStatus {
    pub boundary_ready: bool,
    pub request_prepared: bool,
    pub dispatch_attempted: bool,
    pub dispatch_ok: bool,
    pub task: String,
    pub state: String,
    pub message: String,
    pub blocker: String,
    pub next_action: String,
    pub frames_received: u64,
    pub buffered_duration_ms: u32,
    pub generation_token: u64,
    pub runtime_claim: String,
    pub payload_json: String,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
pub struct VoiceCapturePreparationReport {
    pub ok: bool,
    pub state: String,
    pub microphone_ready: bool,
    pub helper_state: String,
    pub helper_ready: bool,
    pub provider_ready: bool,
    pub cuda_ready: bool,
    pub missing: Vec<String>,
    pub next_actions: Vec<String>,
    pub message: String,
    pub input_status: InputPreparationStatus,
    pub helper_status: HelperBridgeStatus,
}

impl Default for CaptureHelperDispatchStatus {
    fn default() -> Self {
        Self {
            attempted: false,
            command: "none".to_string(),
            ok: false,
            state: "not_attempted".to_string(),
            message: "Helper capture dispatch has not been attempted in this app session.".to_string(),
            generation_token: 0,
            runtime_claim: "not_attempted".to_string(),
            updated_unix_ms: unix_ms(),
        }
    }
}

static CAPTURE_HELPER_DISPATCH_STATUS: OnceLock<Mutex<CaptureHelperDispatchStatus>> = OnceLock::new();
static ASR_HANDOFF_STATUS: OnceLock<Mutex<Option<AsrHandoffRequestStatus>>> = OnceLock::new();

fn capture_dispatch_status_runtime() -> &'static Mutex<CaptureHelperDispatchStatus> {
    CAPTURE_HELPER_DISPATCH_STATUS.get_or_init(|| Mutex::new(CaptureHelperDispatchStatus::default()))
}

fn asr_handoff_status_runtime() -> &'static Mutex<Option<AsrHandoffRequestStatus>> {
    ASR_HANDOFF_STATUS.get_or_init(|| Mutex::new(None))
}

fn record_asr_handoff_status(status: &AsrHandoffRequestStatus) {
    if let Ok(mut cached) = asr_handoff_status_runtime().lock() {
        *cached = Some(status.clone());
    }
}

pub fn get_cached_asr_handoff_status() -> Option<AsrHandoffRequestStatus> {
    asr_handoff_status_runtime()
        .lock()
        .ok()
        .and_then(|cached| cached.clone())
}

fn record_capture_helper_dispatch(command: &str, result: &HelperBridgeActionResult) {
    if let Ok(mut status) = capture_dispatch_status_runtime().lock() {
        *status = CaptureHelperDispatchStatus {
            attempted: true,
            command: command.to_string(),
            ok: result.ok,
            state: result.state.clone(),
            message: result.message.clone(),
            generation_token: result.generation_token,
            runtime_claim: result.runtime_claim.clone(),
            updated_unix_ms: unix_ms(),
        };
    }
}

fn capture_helper_payload(command: &str, status: &HelperBridgeStatus, settings: &RuntimeSettings) -> Value {
    if command == "capture_start" {
        json!({
            "command": "capture_start",
            "generation_token": status.generation_token,
            "source_language": settings.source_language,
            "target_language": settings.target_language,
            "runtime_profile": settings.runtime_profile,
            "input_device_id": settings.audio.input_device_id,
            "output_device_id": settings.audio.output_device_id,
            "provider_ready": status.provider_ready,
            "cuda_ready": status.cuda_ready,
            "runtime_claim": "capture_helper_dispatch_migration_stub"
        })
    } else {
        json!({
            "command": "capture_stop",
            "generation_token": status.generation_token,
            "provider_ready": status.provider_ready,
            "cuda_ready": status.cuda_ready,
            "runtime_claim": "capture_helper_dispatch_migration_stub"
        })
    }
}

fn capture_requires_provider(command: &str) -> bool {
    command == "capture_start"
}

fn capture_request_preview(command: &str) -> CaptureHelperBridgeRequestPreview {
    let status = get_helper_bridge_status();
    let settings = engine::load_settings();
    let payload = capture_helper_payload(command, &status, &settings);
    let requires_provider_ready = capture_requires_provider(command);
    let migration_ready = status.state == "ready" && (!requires_provider_ready || status.provider_ready);
    let status_message = compact_preview_text(&status.message);
    CaptureHelperBridgeRequestPreview {
        ok: migration_ready,
        state: if migration_ready { "request_ready" } else { "provider_blocked" }.to_string(),
        message: if migration_ready {
            format!("Prepared {command} helper bridge request envelope. Dispatch is available from Developer Diagnostics, but main capture is not migrated yet.")
        } else if requires_provider_ready {
            format!("Prepared {command} preview. Full ASR/translation/TTS is blocked until helper provider readiness is verified, but microphone-only capture can still start when the input device is usable. Current helper state: {}; message: {}", compact_preview_text(&status.state), status_message)
        } else {
            format!("Prepared {command} preview. Helper bridge migration is waiting for a running helper bridge. Current helper state: {}; message: {}", compact_preview_text(&status.state), status_message)
        },
        command: command.to_string(),
        helper_task: command.to_string(),
        generation_token: status.generation_token,
        provider_ready: status.provider_ready,
        cuda_ready: status.cuda_ready,
        requires_provider_ready,
        migration_ready,
        preview_only: true,
        runtime_claim: "preview_only_no_capture_runtime_claim".to_string(),
        payload_json: payload.to_string(),
    }
}

pub fn build_capture_helper_bridge_request(command: &str) -> HelperBridgeRequest {
    let preview = capture_request_preview(command);
    HelperBridgeRequest {
        task: preview.helper_task,
        payload_json: Some(preview.payload_json),
    }
}

fn dispatch_capture_helper_bridge_request(command: &str) -> HelperBridgeActionResult {
    let request = build_capture_helper_bridge_request(command);
    let result = send_helper_bridge_request(request);
    record_capture_helper_dispatch(command, &result);
    result
}

fn helper_capture_dispatch_candidate(status: &HelperBridgeStatus) -> bool {
    matches!(status.state.as_str(), "ready" | "blocked")
        && status.runtime_claim != "bridge_lifecycle_visible_process_not_ready"
}

fn dispatch_capture_before_fallback(command: &str) -> Option<HelperBridgeActionResult> {
    let status = get_helper_bridge_status();
    if !helper_capture_dispatch_candidate(&status) {
        return None;
    }
    Some(dispatch_capture_helper_bridge_request(command))
}

fn append_helper_dispatch_note(result: &mut CommandResult, dispatch: Option<HelperBridgeActionResult>) {
    if let Some(dispatch) = dispatch {
        let outcome = if dispatch.ok { "accepted" } else { "blocked" };
        result.message = format!(
            "{} Helper capture dispatch {} before fallback path: {}",
            result.message, outcome, dispatch.message
        );
    }
}

#[tauri::command]
pub fn get_capture_helper_dispatch_status() -> CaptureHelperDispatchStatus {
    capture_dispatch_status_runtime()
        .lock()
        .map(|status| status.clone())
        .unwrap_or_else(|_| CaptureHelperDispatchStatus {
            attempted: false,
            command: "error".to_string(),
            ok: false,
            state: "error".to_string(),
            message: "Capture helper dispatch status lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "state_error".to_string(),
            updated_unix_ms: unix_ms(),
        })
}

#[tauri::command]
pub fn get_capture_transcript_boundary_status() -> CaptureTranscriptBoundaryStatus {
    let dispatch = get_capture_helper_dispatch_status();
    let live_capture = crate::engine::audio::live_capture::live_capture_status();
    let live_buffer = crate::engine::audio::live_audio_buffer::live_audio_buffer_status();
    let transcript_handoff_ready = live_capture.stream_active && live_buffer.ready_for_target_asr_frame;
    let blocker = if transcript_handoff_ready {
        "".to_string()
    } else if !live_capture.stream_active {
        live_capture.blocker.clone()
    } else if live_capture.frames_received == 0 {
        "capture_transcript_boundary:no_capture_frames".to_string()
    } else if !live_buffer.ready_for_target_asr_frame {
        live_buffer.blocker.clone()
    } else {
        "capture_transcript_boundary:not_ready".to_string()
    };
    let next_action = if transcript_handoff_ready {
        "call_native_asr_decoder".to_string()
    } else if !live_capture.stream_active {
        "start_capture".to_string()
    } else if live_capture.frames_received == 0 {
        "continue_listening_until_frames_arrive".to_string()
    } else if !live_buffer.ready_for_target_asr_frame {
        "continue_collecting_until_target_asr_frame".to_string()
    } else {
        "inspect_capture_transcript_boundary".to_string()
    };

    CaptureTranscriptBoundaryStatus {
        capture_dispatch_attempted: dispatch.attempted,
        capture_dispatch_ok: dispatch.ok,
        helper_capture_command: dispatch.command,
        helper_capture_state: dispatch.state,
        existing_capture_active: live_capture.stream_active,
        frames_received: live_capture.frames_received,
        buffered_duration_ms: live_buffer.buffered_duration_ms,
        ready_for_vad: live_buffer.ready_for_vad,
        ready_for_target_asr_frame: live_buffer.ready_for_target_asr_frame,
        transcript_handoff_ready,
        blocker,
        next_action,
        runtime_claim: "source_side_boundary_status_not_runtime_proof".to_string(),
        updated_unix_ms: unix_ms(),
    }
}

fn asr_handoff_payload(boundary: &CaptureTranscriptBoundaryStatus, helper: &HelperBridgeStatus) -> Value {
    json!({
        "command": "asr_handoff",
        "generation_token": helper.generation_token,
        "boundary_ready": boundary.transcript_handoff_ready,
        "existing_capture_active": boundary.existing_capture_active,
        "frames_received": boundary.frames_received,
        "buffered_duration_ms": boundary.buffered_duration_ms,
        "ready_for_vad": boundary.ready_for_vad,
        "ready_for_target_asr_frame": boundary.ready_for_target_asr_frame,
        "capture_dispatch_attempted": boundary.capture_dispatch_attempted,
        "capture_dispatch_ok": boundary.capture_dispatch_ok,
        "source": "capture_transcript_boundary",
        "runtime_claim": "asr_handoff_request_stub_no_audio_payload"
    })
}

fn asr_handoff_status_from_parts(
    boundary: CaptureTranscriptBoundaryStatus,
    helper: HelperBridgeStatus,
    request_prepared: bool,
    dispatch: Option<HelperBridgeActionResult>,
    payload_json: String,
) -> AsrHandoffRequestStatus {
    let dispatch_attempted = dispatch.is_some();
    let dispatch_ok = dispatch.as_ref().map(|result| result.ok).unwrap_or(false);
    let state = dispatch
        .as_ref()
        .map(|result| result.state.clone())
        .unwrap_or_else(|| if request_prepared { "request_ready".to_string() } else { "blocked".to_string() });
    let message = dispatch
        .as_ref()
        .map(|result| result.message.clone())
        .unwrap_or_else(|| {
            if request_prepared {
                "ASR handoff request prepared. Dispatch is available, but no audio payload is sent yet.".to_string()
            } else {
                format!("ASR handoff request blocked before dispatch: {}", boundary.blocker)
            }
        });
    let blocker = if dispatch_ok || request_prepared {
        "".to_string()
    } else {
        boundary.blocker.clone()
    };
    let next_action = if dispatch_ok {
        "implement_worker_asr_decode".to_string()
    } else if request_prepared {
        "dispatch_asr_handoff_request".to_string()
    } else {
        boundary.next_action.clone()
    };

    AsrHandoffRequestStatus {
        boundary_ready: boundary.transcript_handoff_ready,
        request_prepared,
        dispatch_attempted,
        dispatch_ok,
        task: "asr_handoff".to_string(),
        state,
        message,
        blocker,
        next_action,
        frames_received: boundary.frames_received,
        buffered_duration_ms: boundary.buffered_duration_ms,
        generation_token: dispatch
            .as_ref()
            .map(|result| result.generation_token)
            .unwrap_or(helper.generation_token),
        runtime_claim: "asr_handoff_request_stub_no_transcript_runtime_claim".to_string(),
        payload_json,
        updated_unix_ms: unix_ms(),
    }
}

#[tauri::command]
pub fn prepare_asr_handoff_request() -> AsrHandoffRequestStatus {
    let boundary = get_capture_transcript_boundary_status();
    let helper = get_helper_bridge_status();
    let payload_json = asr_handoff_payload(&boundary, &helper).to_string();
    let status = asr_handoff_status_from_parts(
        boundary.clone(),
        helper,
        boundary.transcript_handoff_ready,
        None,
        payload_json,
    );
    record_asr_handoff_status(&status);
    status
}

#[tauri::command]
pub fn dispatch_asr_handoff_request() -> AsrHandoffRequestStatus {
    let boundary = get_capture_transcript_boundary_status();
    let helper = get_helper_bridge_status();
    let payload_json = asr_handoff_payload(&boundary, &helper).to_string();
    let status = if !boundary.transcript_handoff_ready {
        asr_handoff_status_from_parts(boundary, helper, false, None, payload_json)
    } else {
        let request = HelperBridgeRequest {
            task: "asr_handoff".to_string(),
            payload_json: Some(payload_json.clone()),
        };
        let dispatch = send_helper_bridge_request(request);
        asr_handoff_status_from_parts(boundary, helper, true, Some(dispatch), payload_json)
    };
    record_asr_handoff_status(&status);
    status
}

#[tauri::command]
pub fn prepare_capture_start_request() -> CaptureHelperBridgeRequestPreview {
    capture_request_preview("capture_start")
}

#[tauri::command]
pub fn prepare_capture_stop_request() -> CaptureHelperBridgeRequestPreview {
    capture_request_preview("capture_stop")
}

#[tauri::command]
pub fn dispatch_capture_start_request() -> HelperBridgeActionResult {
    dispatch_capture_helper_bridge_request("capture_start")
}

#[tauri::command]
pub fn dispatch_capture_stop_request() -> HelperBridgeActionResult {
    dispatch_capture_helper_bridge_request("capture_stop")
}

#[tauri::command]
pub fn check_helper_bridge_health() -> HelperBridgeActionResult {
    let status = get_helper_bridge_status();
    if status.state != "ready" {
        return HelperBridgeActionResult {
            ok: false,
            state: status.state,
            message: "Helper bridge health check skipped because worker is not ready. Use Start Helper first.".to_string(),
            generation_token: status.generation_token,
            runtime_claim: status.runtime_claim,
        };
    }
    send_helper_bridge_request(HelperBridgeRequest {
        task: "status".to_string(),
        payload_json: None,
    })
}

#[tauri::command]
pub fn prepare_voice_capture(auto_start: bool) -> VoiceCapturePreparationReport {
    let input_status = crate::commands::audio::get_input_status();
    let mut helper_status = get_helper_bridge_status();
    if auto_start
        && (helper_status.state == "not_started"
            || helper_status.state == "stopped"
            || helper_status.state == "error"
            || helper_status.state == "blocked")
    {
        let _ = start_helper_bridge();
        helper_status = get_helper_bridge_status();
    }
    let (mut missing, mut next_actions, state, message) =
        voice_capture_blockers(&input_status, &helper_status);
    if !input_status.prepared
        && !next_actions.iter().any(|action| action == "Check microphone device")
    {
        next_actions.push("Check microphone device".to_string());
    }
    if !helper_status.provider_ready
        && !next_actions.iter().any(|action| action == "Open Developer Diagnostics")
    {
        next_actions.push("Open Developer Diagnostics".to_string());
    }
    if input_status.prepared
        && !helper_status.provider_ready
        && !next_actions.iter().any(|action| action == "Start microphone-only capture")
    {
        next_actions.insert(0, "Start microphone-only capture".to_string());
    }
    if helper_status.provider_ready
        && helper_status.cuda_ready
        && !missing.iter().any(|item| item == "cuda")
    {
        next_actions.retain(|action| action != "Continue with CPU fallback if models are ready");
    }
    let ok = helper_status.provider_ready && input_status.prepared;
    if ok {
        missing.clear();
        next_actions = vec!["Start Voice Capture".to_string()];
    }
    let user_message = if ok {
        "Voice capture is ready.".to_string()
    } else if input_status.prepared && !helper_status.provider_ready {
        format!("Microphone is ready. Full ASR/translation/TTS is blocked until helper provider readiness is verified. You can start microphone-only capture now, then use Developer Diagnostics to fix the helper pipeline. {message}")
    } else {
        message
    };
    VoiceCapturePreparationReport {
        ok,
        state,
        microphone_ready: input_status.prepared,
        helper_state: helper_status.state.clone(),
        helper_ready: helper_status.state == "ready",
        provider_ready: helper_status.provider_ready,
        cuda_ready: helper_status.cuda_ready,
        missing,
        next_actions,
        message: user_message,
        input_status,
        helper_status,
    }
}

#[tauri::command]
pub fn start_capture() -> CommandResult {
    let dispatch = dispatch_capture_before_fallback("capture_start");
    let status = get_helper_bridge_status();
    if !status.provider_ready {
        let _ = cancel_helper_bridge_task();
    }
    let mut result = engine::start_capture();
    append_helper_dispatch_note(&mut result, dispatch);
    result
}

#[tauri::command]
pub fn stop_capture() -> CommandResult {
    let dispatch = dispatch_capture_before_fallback("capture_stop");
    let _ = cancel_helper_bridge_task();
    let mut result = engine::stop_capture();
    append_helper_dispatch_note(&mut result, dispatch);
    result
}

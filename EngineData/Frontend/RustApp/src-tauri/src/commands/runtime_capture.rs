use serde::Serialize;
use serde_json::{json, Value};

use crate::engine;
use crate::engine::audio::input::InputPreparationStatus;
use crate::engine::runtime_settings::RuntimeSettings;
use crate::engine::state::CommandResult;

use super::helper_bridge::start_helper_bridge;
use super::helper_bridge::{
    cancel_helper_bridge_task, get_helper_bridge_status, send_helper_bridge_request,
};
use super::helper_bridge_runtime::{HelperBridgeActionResult, HelperBridgeRequest, HelperBridgeStatus};
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
            "runtime_claim": "preview_only_capture_not_started"
        })
    } else {
        json!({
            "command": "capture_stop",
            "generation_token": status.generation_token,
            "provider_ready": status.provider_ready,
            "cuda_ready": status.cuda_ready,
            "runtime_claim": "preview_only_capture_not_stopped"
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
    let ready = migration_ready;
    let status_message = compact_preview_text(&status.message);
    CaptureHelperBridgeRequestPreview {
        ok: ready,
        state: if ready { "request_ready" } else { "provider_blocked" }.to_string(),
        message: if ready {
            format!("Prepared {command} helper bridge request preview. Capture has not been started from this command.")
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

#[tauri::command]
pub fn prepare_capture_start_request() -> CaptureHelperBridgeRequestPreview {
    capture_request_preview("capture_start")
}

#[tauri::command]
pub fn prepare_capture_stop_request() -> CaptureHelperBridgeRequestPreview {
    capture_request_preview("capture_stop")
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
    let status = get_helper_bridge_status();
    if !status.provider_ready {
        let _ = cancel_helper_bridge_task();
    }
    engine::start_capture()
}

#[tauri::command]
pub fn stop_capture() -> CommandResult {
    let _ = cancel_helper_bridge_task();
    engine::stop_capture()
}

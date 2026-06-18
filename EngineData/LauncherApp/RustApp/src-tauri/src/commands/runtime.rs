use serde::Serialize;
use serde_json::json;

use crate::engine;
use crate::engine::adapters::runtime_lifecycle_logic::{
    analyze_start_lifecycle_gate, analyze_stop_lifecycle_gate, RuntimeLifecycleGateReport,
};
use crate::engine::runtime_state::{
    latest_runtime_handoff_state, latest_runtime_session_state, RuntimeHandoffStateReport,
    RuntimeSessionStateReport,
};
use crate::engine::state::{CommandResult, LifecycleState};

use super::helper_bridge::{
    cancel_helper_bridge_task, get_helper_bridge_status, send_helper_bridge_request,
    HelperBridgeActionResult, HelperBridgeRequest,
};

const MAX_CAPTURE_PREVIEW_MESSAGE_CHARS: usize = 360;

#[derive(Debug, Clone, Serialize)]
pub struct CaptureHelperBridgeRequestPreview {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub command: String,
    pub generation_token: u64,
    pub provider_ready: bool,
    pub cuda_ready: bool,
    pub runtime_claim: String,
    pub payload_json: String,
}

fn is_unsafe_preview_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn compact_preview_text(value: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_preview_character(*character))
        .take(MAX_CAPTURE_PREVIEW_MESSAGE_CHARS)
        .collect::<String>();
    if clean.is_empty() {
        "status unavailable".to_string()
    } else {
        clean
    }
}

fn capture_request_preview(command: &str) -> CaptureHelperBridgeRequestPreview {
    let status = get_helper_bridge_status();
    let settings = engine::load_settings();
    let payload = if command == "capture_start" {
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
            "runtime_claim": "preview_only_capture_not_stopped"
        })
    };
    let ready = status.provider_ready;
    let status_message = compact_preview_text(&status.message);
    CaptureHelperBridgeRequestPreview {
        ok: ready,
        state: if ready {
            "request_ready"
        } else {
            "provider_blocked"
        }
        .to_string(),
        message: if ready {
            format!("Prepared {command} helper bridge request preview. Capture has not been started from this command.")
        } else {
            format!("Prepared {command} preview, but capture remains blocked until helper provider readiness is verified. Current helper state: {}; message: {}", compact_preview_text(&status.state), status_message)
        },
        command: command.to_string(),
        generation_token: status.generation_token,
        provider_ready: status.provider_ready,
        cuda_ready: status.cuda_ready,
        runtime_claim: "preview_only_no_capture_runtime_claim".to_string(),
        payload_json: payload.to_string(),
    }
}

#[tauri::command]
pub fn get_runtime_handoff_state() -> RuntimeHandoffStateReport {
    latest_runtime_handoff_state()
}

#[tauri::command]
pub fn get_runtime_session_state() -> RuntimeSessionStateReport {
    latest_runtime_session_state()
}

#[tauri::command]
pub fn analyze_start_gate() -> RuntimeLifecycleGateReport {
    analyze_start_lifecycle_gate()
}

#[tauri::command]
pub fn analyze_stop_gate() -> RuntimeLifecycleGateReport {
    analyze_stop_lifecycle_gate()
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
pub fn start_capture() -> CommandResult {
    let status = get_helper_bridge_status();
    if !status.provider_ready {
        let _ = cancel_helper_bridge_task();
        return CommandResult::blocked(
            LifecycleState::ConversionPending,
            format!(
                "Voice capture is blocked because helper provider readiness is not verified yet. Start Helper, run Worker Status, and check Developer diagnostics first. Current helper state: {}; CUDA ready: {}; provider ready: {}; message: {}",
                compact_preview_text(&status.state),
                status.cuda_ready,
                status.provider_ready,
                compact_preview_text(&status.message)
            ),
        );
    }
    let _ = cancel_helper_bridge_task();
    engine::start_capture()
}

#[tauri::command]
pub fn stop_capture() -> CommandResult {
    let _ = cancel_helper_bridge_task();
    engine::stop_capture()
}

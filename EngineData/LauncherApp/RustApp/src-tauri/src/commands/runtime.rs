use serde::Serialize;
use serde_json::json;

use crate::engine;
use crate::engine::adapters::runtime_lifecycle_logic::{
    analyze_start_lifecycle_gate, analyze_stop_lifecycle_gate, RuntimeLifecycleGateReport,
};
use crate::engine::audio::input::InputPreparationStatus;
use crate::engine::runtime_state::{
    latest_runtime_handoff_state, latest_runtime_session_state, RuntimeHandoffStateReport,
    RuntimeSessionStateReport,
};
use crate::engine::state::{CommandResult, LifecycleState};

use super::helper_bridge::start_helper_bridge;
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
    pub helper_status: super::helper_bridge::HelperBridgeStatus,
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

fn voice_capture_blockers(
    input_status: &InputPreparationStatus,
    helper_status: &super::helper_bridge::HelperBridgeStatus,
) -> (Vec<String>, Vec<String>, String, String) {
    let mut missing = Vec::new();
    let mut next_actions = Vec::new();
    let helper_state = helper_status.state.clone();
    let mut message = "Voice capture is ready.".to_string();
    let mut state = "ready".to_string();

    if !input_status.prepared {
        missing.push("microphone".to_string());
        next_actions.push("Check microphone device".to_string());
        message = input_status.note.clone();
        state = "missing_microphone".to_string();
    }

    if helper_state == "not_started"
        || helper_state == "stopped"
        || helper_state == "error"
        || helper_state == "blocked"
    {
        next_actions.push("Start Helper".to_string());
        state = "starting".to_string();
    }

    if !helper_status.provider_ready {
        if helper_status.state == "blocked" || helper_status.state == "error" {
            missing.push("worker".to_string());
            next_actions.push("Run Worker Status".to_string());
            message = helper_status.message.clone();
            state = "missing_worker".to_string();
        } else {
            missing.push("models".to_string());
            next_actions.push("Open Developer Diagnostics".to_string());
            message = if helper_status.cuda_ready {
                "Local helper started, but voice models are not ready yet.".to_string()
            } else {
                "Local helper started, but provider readiness is still incomplete. CPU fallback may be available, but voice capture is not ready yet.".to_string()
            };
            state = "missing_models".to_string();
        }
    }

    if helper_status.provider_ready && input_status.prepared {
        state = "ready".to_string();
        message = "Voice provider and microphone are ready.".to_string();
    }

    if !helper_status.cuda_ready {
        next_actions.push("Continue with CPU fallback if models are ready".to_string());
    }

    (missing, next_actions, state, message)
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
        && !next_actions
            .iter()
            .any(|action| action == "Check microphone device")
    {
        next_actions.push("Check microphone device".to_string());
    }
    if !helper_status.provider_ready
        && !next_actions
            .iter()
            .any(|action| action == "Open Developer Diagnostics")
    {
        next_actions.push("Open Developer Diagnostics".to_string());
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
        message: if ok {
            "Voice capture is ready.".to_string()
        } else {
            message
        },
        input_status,
        helper_status,
    }
}

#[tauri::command]
pub fn start_capture() -> CommandResult {
    let status = get_helper_bridge_status();
    if !status.provider_ready {
        let _ = cancel_helper_bridge_task();
        return CommandResult::blocked(
            LifecycleState::ConversionPending,
            format!(
                "Voice capture is blocked until helper provider readiness is verified. State: {}; CUDA: {}; provider: {}; next: Start Helper, Check Worker Status, Open Developer Diagnostics.",
                compact_preview_text(&status.state),
                status.cuda_ready,
                status.provider_ready
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

use crate::engine;
use crate::engine::adapters::runtime_lifecycle_logic::{analyze_start_lifecycle_gate, analyze_stop_lifecycle_gate, RuntimeLifecycleGateReport};
use crate::engine::runtime_state::{latest_runtime_handoff_state, latest_runtime_session_state, RuntimeHandoffStateReport, RuntimeSessionStateReport};
use crate::engine::state::{CommandResult, LifecycleState};

use super::helper_bridge::{
    cancel_helper_bridge_task,
    get_helper_bridge_status,
    send_helper_bridge_request,
    HelperBridgeActionResult,
    HelperBridgeRequest,
};

#[tauri::command]
pub fn get_runtime_handoff_state() -> RuntimeHandoffStateReport { latest_runtime_handoff_state() }

#[tauri::command]
pub fn get_runtime_session_state() -> RuntimeSessionStateReport { latest_runtime_session_state() }

#[tauri::command]
pub fn analyze_start_gate() -> RuntimeLifecycleGateReport { analyze_start_lifecycle_gate() }

#[tauri::command]
pub fn analyze_stop_gate() -> RuntimeLifecycleGateReport { analyze_stop_lifecycle_gate() }

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
                status.state,
                status.cuda_ready,
                status.provider_ready,
                status.message
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

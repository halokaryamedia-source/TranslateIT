use crate::engine::runtime_state::latest_runtime_session_state;

use super::helper_bridge::{self, HelperBridgeActionResult};
use super::runtime_inventory::{self, ModelInventoryReport};

#[tauri::command]
pub fn start_helper_bridge() -> HelperBridgeActionResult {
    if latest_runtime_session_state().snapshot.is_some() {
        let helper = helper_bridge::get_helper_bridge_status();
        return HelperBridgeActionResult {
            ok: false,
            state: "active_runtime_session".to_string(),
            message: "Stop Translation or Mic Test before restarting the local translation runtime. The active session was left unchanged."
                .to_string(),
            generation_token: helper.generation_token,
            runtime_claim: "public_helper_restart_deferred_until_runtime_session_stop".to_string(),
        };
    }

    helper_bridge::start_helper_bridge()
}

#[tauri::command]
pub fn verify_models() -> ModelInventoryReport {
    runtime_inventory::verify_models()
}

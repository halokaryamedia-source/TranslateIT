use crate::engine::runtime_state::latest_runtime_session_state;

use super::helper_bridge;
use super::helper_bridge_runtime::HelperBridgeActionResult;
use super::meeting_session::{self, MeetingSessionActionResult};
use super::runtime_inventory::{self, ModelInventoryReport};
use super::virtual_mic_route::{
    bind_prepared_virtual_mic_route_to_generation, clear_prepared_virtual_mic_route_selection,
    prepare_current_virtual_mic_route_for_meeting,
};

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
pub fn start_meeting_translation() -> MeetingSessionActionResult {
    // Duplicate Start and runtime-owner conflicts remain owned by the canonical
    // Meeting command. Only a genuinely new Start prepares a fresh route pair.
    if latest_runtime_session_state().snapshot.is_some() {
        return meeting_session::start_meeting_translation();
    }

    clear_prepared_virtual_mic_route_selection();
    if let Err(blocker) = prepare_current_virtual_mic_route_for_meeting() {
        return MeetingSessionActionResult {
            ok: false,
            state: "meeting_route_pair_prepare_failed".to_string(),
            message: format!(
                "Start Translation needs one matched Windows virtual-audio route pair before it can start. Route detail: {blocker}"
            ),
            status: meeting_session::get_meeting_session_status(),
        };
    }

    let result = meeting_session::start_meeting_translation();
    if result.ok {
        if let Some(generation) = result.status.generation {
            // The route owner also binds lazily on the first active-session read so
            // playback cannot race this wrapper. This explicit bind records the same
            // generation relationship once the Start result returns.
            let _ = bind_prepared_virtual_mic_route_to_generation(generation);
        }
    } else {
        clear_prepared_virtual_mic_route_selection();
    }
    result
}

#[tauri::command]
pub fn verify_models() -> ModelInventoryReport {
    runtime_inventory::verify_models()
}

use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
pub struct HelperBridgeStatus {
    pub state: String,
    pub message: String,
    pub cuda_ready: bool,
    pub provider_ready: bool,
    pub degraded_mode: bool,
    pub active_task: Option<String>,
    pub last_error: Option<String>,
    pub updated_unix_ms: u128,
    pub runtime_claim: String,
}

fn unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[tauri::command]
pub fn get_helper_bridge_status() -> HelperBridgeStatus {
    HelperBridgeStatus {
        state: "not_started".to_string(),
        message: "Helper bridge contract exists; runtime process bridge is not implemented yet.".to_string(),
        cuda_ready: false,
        provider_ready: false,
        degraded_mode: false,
        active_task: None,
        last_error: None,
        updated_unix_ms: unix_ms(),
        runtime_claim: "bridge_contract_only".to_string(),
    }
}

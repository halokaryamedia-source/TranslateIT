use crate::engine::adapters::runtime_lifecycle_logic::{
    analyze_start_lifecycle_gate, analyze_stop_lifecycle_gate, RuntimeLifecycleGateReport,
};
use crate::engine::runtime_state::{
    latest_runtime_handoff_state, latest_runtime_session_state, RuntimeHandoffStateReport,
    RuntimeSessionStateReport,
};

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

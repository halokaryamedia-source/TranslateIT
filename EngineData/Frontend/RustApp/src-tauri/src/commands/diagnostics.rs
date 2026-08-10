use crate::commands::diagnostic_trace::{trace_command_end, trace_command_start};
use crate::engine;
use crate::engine::diagnostics::RuntimeDiagnostics;

#[tauri::command]
pub fn get_runtime_diagnostics() -> RuntimeDiagnostics {
    let started = trace_command_start("get_runtime_diagnostics", "collecting runtime diagnostics");
    let result = engine::runtime_diagnostics();
    trace_command_end("get_runtime_diagnostics", started, "ok");
    result
}

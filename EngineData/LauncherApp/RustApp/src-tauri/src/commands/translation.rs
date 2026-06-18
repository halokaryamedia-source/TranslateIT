use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use crate::engine;
use crate::engine::state::CommandResult;

#[tauri::command]
pub fn translate_text(source: String) -> CommandResult {
    let started = trace_command_start(
        "translate_text",
        format!("source_chars={}", source.chars().count()),
    );
    let result = engine::translate_text(source);
    if result.ok {
        trace_command_end("translate_text", started, format!("state={}", result.state));
    } else {
        trace_command_error("translate_text", started, format!("state={}", result.state));
    }
    result
}

use crate::engine;
use crate::engine::state::CommandResult;

#[tauri::command]
pub fn start_capture() -> CommandResult {
    engine::start_capture()
}

#[tauri::command]
pub fn stop_capture() -> CommandResult {
    engine::stop_capture()
}

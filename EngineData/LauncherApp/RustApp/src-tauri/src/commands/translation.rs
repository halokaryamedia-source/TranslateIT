use crate::engine;
use crate::engine::state::CommandResult;

#[tauri::command]
pub fn translate_text(source: String) -> CommandResult {
    engine::translate_text(source)
}

use crate::engine;
use crate::engine::session_store::{LauncherChatActionResult, LauncherChatSession, LauncherChatSummary};

#[tauri::command]
pub fn create_chat_session(kind: String) -> LauncherChatSession { engine::session_store::create_launcher_chat(kind) }

#[tauri::command]
pub fn list_chat_sessions(kind: Option<String>) -> Vec<LauncherChatSummary> { engine::session_store::list_launcher_chats(kind) }

#[tauri::command]
pub fn append_chat_message(session_id: String, role: String, content: String) -> LauncherChatActionResult {
    engine::session_store::append_launcher_chat_message(session_id, role, content)
}

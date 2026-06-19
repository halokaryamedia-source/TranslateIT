use crate::engine::session_chat::{
    append_launcher_chat_message, create_launcher_chat, list_launcher_chats,
    LauncherChatActionResult, LauncherChatSession, LauncherChatSummary,
};

#[tauri::command]
pub fn create_chat_session(kind: String) -> LauncherChatSession {
    create_launcher_chat(kind)
}

#[tauri::command]
pub fn list_chat_sessions(kind: Option<String>) -> Vec<LauncherChatSummary> {
    list_launcher_chats(kind)
}

#[tauri::command]
pub fn append_chat_message(
    session_id: String,
    role: String,
    content: String,
) -> LauncherChatActionResult {
    append_launcher_chat_message(session_id, role, content)
}

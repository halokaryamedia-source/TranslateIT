use crate::engine::history_store::{
    clear_recent_history as clear_recent_history_store,
    create_text_recent as create_text_recent_store,
    get_history as get_history_store,
    list_history as list_history_store,
    remove_saved_history as remove_saved_history_store,
    save_history as save_history_store,
    HistoryClearResult, HistoryEntry, HistorySummary, HistoryWriteResult,
};

#[tauri::command]
pub fn create_text_history_entry(
    source: String,
    target: String,
    source_language: String,
    target_language: String,
    tone: String,
    mode: String,
) -> HistoryWriteResult {
    create_text_recent_store(
        source,
        target,
        source_language,
        target_language,
        tone,
        mode,
    )
}

#[tauri::command]
pub fn list_history_entries(scope: String, entry_type: Option<String>) -> Vec<HistorySummary> {
    list_history_store(scope, entry_type)
}

#[tauri::command]
pub fn get_history_entry(scope: String, entry_id: String) -> Option<HistoryEntry> {
    get_history_store(scope, entry_id)
}

#[tauri::command]
pub fn save_history_entry(entry_id: String) -> HistoryWriteResult {
    save_history_store(entry_id)
}

#[tauri::command]
pub fn remove_saved_history_entry(entry_id: String) -> HistoryWriteResult {
    remove_saved_history_store(entry_id)
}

#[tauri::command]
pub fn clear_recent_history() -> HistoryClearResult {
    clear_recent_history_store()
}

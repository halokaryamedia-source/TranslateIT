use std::path::PathBuf;

use crate::engine;
use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};
use crate::engine::paths::ProjectPaths;
use crate::engine::settings::RuntimeSettings;
use crate::engine::state::{CommandResult, LifecycleState};

#[tauri::command]
pub fn load_runtime_settings() -> RuntimeSettings { engine::load_settings() }

#[tauri::command]
pub fn save_default_runtime_settings() -> CommandResult { engine::save_default_settings() }

#[tauri::command]
pub fn save_runtime_settings(settings: RuntimeSettings) -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let settings_path = PathBuf::from(&project_paths.user_cache_dir).join("rust_runtime_settings.json");
    let log_dir = PathBuf::from(project_paths.user_log_dir);
    match settings.save_pretty(&settings_path) {
        Ok(()) => {
            let _ = write_jsonl_event(
                &log_dir,
                "rust_runtime_latest.jsonl",
                &RuntimeLogEvent::info("settings", "Runtime settings saved."),
            );
            CommandResult::ok(LifecycleState::Idle, "Runtime settings saved.")
        }
        Err(_) => {
            let _ = write_jsonl_event(
                &log_dir,
                "rust_runtime_latest.jsonl",
                &RuntimeLogEvent::warning("settings", "Runtime settings save failed."),
            );
            CommandResult::blocked(
                LifecycleState::Error,
                "Failed to save runtime settings. Open Developer diagnostics for details.",
            )
        }
    }
}

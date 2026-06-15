use std::path::PathBuf;

use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};
use crate::engine::paths::ProjectPaths;
use crate::engine::settings::RuntimeSettings;
use crate::engine::state::{CommandResult, LifecycleState};

pub fn load_settings() -> RuntimeSettings {
    let project_paths = ProjectPaths::discover();
    let settings_path = PathBuf::from(project_paths.user_cache_dir).join("rust_runtime_settings.json");
    RuntimeSettings::load_or_default(&settings_path)
}

pub fn save_default_settings() -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let settings_path = PathBuf::from(&project_paths.user_cache_dir).join("rust_runtime_settings.json");
    let log_dir = PathBuf::from(project_paths.user_log_dir);
    let settings = RuntimeSettings::default();

    match settings.save_pretty(&settings_path) {
        Ok(()) => {
            let _ = write_jsonl_event(
                &log_dir,
                "rust_runtime_latest.jsonl",
                &RuntimeLogEvent::info("settings", "Default runtime settings restored."),
            );
            CommandResult::ok(LifecycleState::Idle, "Default runtime settings restored.")
        }
        Err(_) => {
            let _ = write_jsonl_event(
                &log_dir,
                "rust_runtime_latest.jsonl",
                &RuntimeLogEvent::warning("settings", "Default runtime settings restore failed."),
            );
            CommandResult::blocked(
                LifecycleState::Error,
                "Failed to restore default runtime settings. Open Developer diagnostics for details.",
            )
        }
    }
}

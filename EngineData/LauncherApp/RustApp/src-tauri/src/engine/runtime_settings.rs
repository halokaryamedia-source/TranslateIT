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
    let settings = RuntimeSettings::default();

    match settings.save_pretty(&settings_path) {
        Ok(()) => {
            let _ = write_jsonl_event(
                &PathBuf::from(project_paths.user_log_dir),
                "rust_runtime_latest.jsonl",
                &RuntimeLogEvent::info(
                    "settings",
                    format!("Default Rust runtime settings saved to {}", settings_path.to_string_lossy()),
                ),
            );
            CommandResult::ok(
                LifecycleState::Idle,
                format!("Default Rust runtime settings saved to {}", settings_path.to_string_lossy()),
            )
        }
        Err(error) => CommandResult::blocked(
            LifecycleState::Error,
            format!("Failed to save Rust runtime settings: {error}"),
        ),
    }
}

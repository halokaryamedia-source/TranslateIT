use std::path::PathBuf;

use crate::commands::diagnostic_trace::{trace_command_end, trace_command_start};
use crate::engine;
use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};
use crate::engine::paths::ProjectPaths;
use crate::engine::settings::RuntimeSettings;
use crate::engine::state::{CommandResult, LifecycleState};

#[tauri::command]
pub fn load_runtime_settings() -> RuntimeSettings {
    let started = trace_command_start(
        "load_runtime_settings",
        "loading runtime settings for launcher startup",
    );
    let settings = engine::load_settings();
    trace_command_end("load_runtime_settings", started, "ok");
    settings
}

#[tauri::command]
pub fn save_default_runtime_settings() -> CommandResult {
    let started = trace_command_start("save_default_runtime_settings", "restoring defaults");
    let result = engine::save_default_settings();
    trace_command_end(
        "save_default_runtime_settings",
        started,
        format!("state={}", result.state),
    );
    result
}

#[tauri::command]
pub fn save_runtime_settings(settings: RuntimeSettings) -> CommandResult {
    let started = trace_command_start("save_runtime_settings", "saving runtime settings");
    let project_paths = ProjectPaths::discover();
    let settings_path =
        PathBuf::from(&project_paths.user_cache_dir).join("rust_runtime_settings.json");
    let log_dir = PathBuf::from(project_paths.user_log_dir);
    let result = match settings.save_pretty(&settings_path) {
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
    };
    trace_command_end(
        "save_runtime_settings",
        started,
        format!("state={}", result.state),
    );
    result
}

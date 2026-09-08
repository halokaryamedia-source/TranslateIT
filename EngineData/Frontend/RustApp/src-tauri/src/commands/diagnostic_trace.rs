use std::time::Instant;

use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};
use crate::engine::paths::ProjectPaths;

fn log_event(message: impl Into<String>) {
    let event = RuntimeLogEvent::info("startup", message);
    println!("[TranslateIT Rust Trace] {}", event.message);
    let project_paths = ProjectPaths::discover();
    let log_dir = std::path::PathBuf::from(project_paths.user_log_dir);
    let _ = write_jsonl_event(&log_dir, "rust_runtime_latest.jsonl", &event);
}

pub fn trace_command_start(command: &str, detail: impl Into<String>) -> Instant {
    log_event(format!("{command}:start {}", detail.into()));
    Instant::now()
}

pub fn trace_command_end(command: &str, started: Instant, detail: impl Into<String>) {
    log_event(format!(
        "{command}:complete duration_ms={} {}",
        started.elapsed().as_millis(),
        detail.into()
    ));
}

pub fn trace_command_error(command: &str, started: Instant, detail: impl Into<String>) {
    log_event(format!(
        "{command}:error duration_ms={} {}",
        started.elapsed().as_millis(),
        detail.into()
    ));
}

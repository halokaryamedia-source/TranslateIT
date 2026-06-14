pub mod adapters;
pub mod audio;
pub mod config;
pub mod cuda_policy;
pub mod diagnostics;
pub mod inference;
pub mod logging;
pub mod models;
pub mod native_execution;
pub mod native_runners;
pub mod paths;
pub mod runtime_job;
pub mod runtime_state;
pub mod session_store;
pub mod settings;
pub mod state;
pub mod transcript;
pub mod transcript_session;

use std::path::PathBuf;

use config::EngineConfig;
use cuda_policy::CudaPolicyReport;
use diagnostics::RuntimeDiagnostics;
use logging::{write_jsonl_event, RuntimeLogEvent};
use paths::ProjectPaths;
use runtime_state::{clear_runtime_handoff_state, latest_runtime_handoff_state};
use settings::RuntimeSettings;
use state::{CommandResult, EngineStatus, LifecycleState, RuntimeStage};

pub fn current_status() -> EngineStatus {
    let config = EngineConfig::default();
    let cuda_report = CudaPolicyReport::strict_pending();
    let project_paths = ProjectPaths::discover();

    EngineStatus {
        app_version: config.app_version,
        runtime_stage: RuntimeStage::RustContractBaseline,
        lifecycle_state: LifecycleState::Idle,
        cuda_policy: cuda_report.status_label,
        asr_engine: config.asr.primary_engine_id,
        translation_engine: config.translation.primary_engine_id,
        tts_engine: config.tts.primary_engine_id,
        notes: vec![
            "Rust runtime contract layer is available.".to_string(),
            "Final target is full Rust ownership of app lifecycle and runtime orchestration.".to_string(),
            "Python runtime remains only as behavior reference until native Rust parity is implemented.".to_string(),
            "CUDA inference must be implemented through native CUDA-capable backends, not false Rust-only placeholders.".to_string(),
            format!("Runtime logs path: {}", project_paths.user_log_dir),
            cuda_report.operator_note,
        ],
    }
}

pub fn runtime_diagnostics() -> RuntimeDiagnostics {
    RuntimeDiagnostics::collect()
}

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

pub fn start_capture() -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let handoff_state = latest_runtime_handoff_state();
    let message = if let Some(snapshot) = &handoff_state.snapshot {
        format!(
            "Rust Start gate checked realtime handoff snapshot: session_id={}, owner_id={}, ready={}, blocker_count={}, note={}",
            snapshot.session_id,
            snapshot.owner_id,
            handoff_state.ready_for_start,
            snapshot.blocker_count,
            handoff_state.note
        )
    } else {
        format!(
            "Rust Start gate blocked: {}, note={}",
            handoff_state.blocker, handoff_state.note
        )
    };

    let event = if handoff_state.ready_for_start {
        RuntimeLogEvent::info("start_gate", message.clone())
    } else {
        RuntimeLogEvent::warning("start_gate", message.clone())
    };
    let _ = write_jsonl_event(
        &PathBuf::from(project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &event,
    );

    if handoff_state.ready_for_start {
        CommandResult::ok(
            LifecycleState::Preparing,
            format!("{message}. Real microphone stream creation is still deferred to runtime integration."),
        )
    } else {
        CommandResult::blocked(LifecycleState::ConversionPending, message)
    }
}

pub fn stop_capture() -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let cleared_state = clear_runtime_handoff_state();
    let message = format!(
        "Stop was received by Rust runtime. No Rust input session is active yet. {}",
        cleared_state.note
    );
    let _ = write_jsonl_event(
        &PathBuf::from(project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("stop_gate", message.clone()),
    );
    CommandResult::ok(LifecycleState::Stopped, message)
}

pub fn translate_text(source: String) -> CommandResult {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return CommandResult::blocked(LifecycleState::EmptyInput, "No source text provided.");
    }

    CommandResult::blocked(
        LifecycleState::TranslationAdapterPending,
        format!(
            "Native Rust translation adapter is not connected yet. Source was received safely: {trimmed}"
        ),
    )
}

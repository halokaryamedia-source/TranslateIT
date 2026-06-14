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
pub mod session_store;
pub mod settings;
pub mod state;
pub mod transcript;
pub mod transcript_session;

use std::path::PathBuf;

use audio::input::InputPreparationStatus;
use config::EngineConfig;
use cuda_policy::CudaPolicyReport;
use diagnostics::RuntimeDiagnostics;
use logging::{write_jsonl_event, RuntimeLogEvent};
use paths::ProjectPaths;
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
    let input_status = InputPreparationStatus::inspect_default_input();
    let message = format!(
        "Rust input preparation: prepared={}, running={}, note={}",
        input_status.prepared, input_status.running, input_status.note
    );

    let _ = write_jsonl_event(
        &PathBuf::from(project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::warning("input", message.clone()),
    );

    CommandResult::blocked(LifecycleState::ConversionPending, message)
}

pub fn stop_capture() -> CommandResult {
    CommandResult::ok(
        LifecycleState::Stopped,
        "Stop was received by Rust runtime. No Rust input session is active yet.",
    )
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

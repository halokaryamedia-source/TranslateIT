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

use adapters::runtime_lifecycle_logic::analyze_start_lifecycle_gate;
use config::EngineConfig;
use cuda_policy::CudaPolicyReport;
use diagnostics::RuntimeDiagnostics;
use logging::{write_jsonl_event, RuntimeLogEvent};
use paths::ProjectPaths;
use runtime_state::{clear_runtime_handoff_state, clear_runtime_session_state, record_runtime_session_start};
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
    let gate = analyze_start_lifecycle_gate();
    let handoff_state = &gate.handoff_state;
    let message = if let Some(snapshot) = &handoff_state.snapshot {
        format!(
            "Rust Start gate checked lifecycle preflight: allowed={}, lifecycle_state={}, session_id={}, owner_id={}, age_ms={}, stale={}, blocker={}, note={}",
            gate.allowed,
            gate.lifecycle_state,
            snapshot.session_id,
            snapshot.owner_id,
            handoff_state.snapshot_age_ms.map_or_else(|| "none".to_string(), |age| age.to_string()),
            handoff_state.snapshot_stale,
            gate.blocker,
            gate.note
        )
    } else {
        format!(
            "Rust Start gate blocked by lifecycle preflight: allowed={}, lifecycle_state={}, blocker={}, note={}",
            gate.allowed, gate.lifecycle_state, gate.blocker, gate.note
        )
    };

    let event = if gate.allowed {
        RuntimeLogEvent::info("start_gate", message.clone())
    } else {
        RuntimeLogEvent::warning("start_gate", message.clone())
    };
    let _ = write_jsonl_event(
        &PathBuf::from(&project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &event,
    );

    if gate.allowed {
        let session_state = record_runtime_session_start(handoff_state);
        let session_note = format!(
            "Runtime session ownership recorded: active={}, ready_for_stop={}, note={}",
            session_state.has_active_session, session_state.ready_for_stop, session_state.note
        );
        let _ = write_jsonl_event(
            &PathBuf::from(project_paths.user_log_dir),
            "rust_runtime_latest.jsonl",
            &RuntimeLogEvent::info("runtime_session", session_note.clone()),
        );
        CommandResult::ok(
            LifecycleState::Preparing,
            format!("{message}. {session_note}. Real microphone stream creation is still deferred to runtime integration."),
        )
    } else {
        CommandResult::blocked(LifecycleState::ConversionPending, message)
    }
}

pub fn stop_capture() -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let cleared_session = clear_runtime_session_state();
    let cleared_handoff = clear_runtime_handoff_state();
    let message = format!(
        "Stop was received by Rust runtime. {} {}",
        cleared_session.note, cleared_handoff.note
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

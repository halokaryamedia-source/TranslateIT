pub mod adapters;
pub mod audio;
pub mod config;
pub mod cuda_policy;
pub mod diagnostics;
pub mod hardware;
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
use adapters::translation_logic::{run_translation_logic, TranslationLogicRequest};
use audio::live_capture::{live_capture_status, start_live_capture_runtime, stop_live_capture_runtime, LiveCaptureStatusReport};
use config::EngineConfig;
use cuda_policy::CudaPolicyReport;
use diagnostics::RuntimeDiagnostics;
use logging::{write_jsonl_event, RuntimeLogEvent};
use paths::ProjectPaths;
use runtime_state::{clear_runtime_handoff_state, clear_runtime_session_state, record_direct_live_capture_session, record_runtime_session_start};
use settings::RuntimeSettings;
use state::{CommandResult, EngineStatus, LifecycleState, RuntimeStage};

pub fn current_status() -> EngineStatus {
    let config = EngineConfig::default();
    let cuda_report = CudaPolicyReport::strict_pending();
    let project_paths = ProjectPaths::discover();
    let live_capture = live_capture_status();

    EngineStatus {
        app_version: config.app_version,
        runtime_stage: if live_capture.stream_active { RuntimeStage::AudioPending } else { RuntimeStage::RustContractBaseline },
        lifecycle_state: if live_capture.stream_active { LifecycleState::Listening } else { LifecycleState::Idle },
        cuda_policy: cuda_report.status_label,
        asr_engine: config.asr.primary_engine_id,
        translation_engine: config.translation.primary_engine_id,
        tts_engine: config.tts.primary_engine_id,
        notes: vec![
            "Rust runtime contract layer is available.".to_string(),
            "CPAL live capture ownership is now connected to Start/Stop lifecycle.".to_string(),
            "ASR, translation, and TTS execution remain pending and must not be claimed as complete.".to_string(),
            "Python runtime remains only as behavior reference until native Rust parity is implemented.".to_string(),
            "CUDA inference must be implemented through native CUDA-capable backends, not false Rust-only placeholders.".to_string(),
            format!("Live capture active: {}", live_capture.stream_active),
            format!("Runtime logs path: {}", project_paths.user_log_dir),
            cuda_report.operator_note,
        ],
    }
}

pub fn runtime_diagnostics() -> RuntimeDiagnostics {
    RuntimeDiagnostics::collect()
}

pub fn live_capture_runtime_status() -> LiveCaptureStatusReport {
    live_capture_status()
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
            "Rust Start gate checked lifecycle preflight: allowed={}, lifecycle_state={}, blocker={}, note={}",
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

    if gate.session_state.has_active_session {
        return CommandResult::blocked(LifecycleState::ConversionPending, message);
    }

    let session_state = if gate.allowed {
        record_runtime_session_start(handoff_state)
    } else if gate.blocker == "handoff:no_snapshot" || gate.blocker == "handoff:snapshot_stale" {
        record_direct_live_capture_session()
    } else {
        return CommandResult::blocked(LifecycleState::ConversionPending, message);
    };

    let session_note = format!(
        "Runtime session ownership recorded: active={}, ready_for_stop={}, note={}",
        session_state.has_active_session, session_state.ready_for_stop, session_state.note
    );
    let live_capture = start_live_capture_runtime(session_state.clone());
    let live_note = format!(
        "Live capture start result: ok={}, active={}, frames_received={}, note={}",
        live_capture.ok,
        live_capture.status.stream_active,
        live_capture.status.frames_received,
        live_capture.status.note
    );
    let _ = write_jsonl_event(
        &PathBuf::from(&project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("runtime_session", session_note.clone()),
    );
    let _ = write_jsonl_event(
        &PathBuf::from(project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("live_capture", live_note.clone()),
    );

    if live_capture.ok {
        let mode_note = if gate.allowed {
            "Full realtime handoff session was used."
        } else {
            "Direct microphone-only session was used because full realtime handoff is not ready yet."
        };
        CommandResult::ok(
            LifecycleState::Listening,
            format!("{message}. {mode_note} {session_note}. {live_note}. ASR, translation, and TTS are still pending stages."),
        )
    } else {
        let cleared_session = clear_runtime_session_state();
        CommandResult::blocked(
            LifecycleState::Error,
            format!("{message}. {session_note}. {live_note}. {}", cleared_session.note),
        )
    }
}

pub fn stop_capture() -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let stopped_live_capture = stop_live_capture_runtime();
    let cleared_session = clear_runtime_session_state();
    let cleared_handoff = clear_runtime_handoff_state();
    let message = format!(
        "Stop was received by Rust runtime. Live capture: {} {} {}",
        stopped_live_capture.message, cleared_session.note, cleared_handoff.note
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

    let result = run_translation_logic(TranslationLogicRequest {
        segment_id: "manual_text_input".to_string(),
        source_text: trimmed.to_string(),
        source_language: "id".to_string(),
        target_language: "en".to_string(),
        detected_language: None,
        context_window: Vec::new(),
        backend_ready: false,
        primary_engine_name: Some("marianmt-id-en".to_string()),
        fallback_engine_name: Some("nllb-200-distilled-600M-quality".to_string()),
    });

    if !result.translated_text.trim().is_empty() && result.status == "Completed" {
        return CommandResult::ok(
            LifecycleState::Idle,
            format!("{}", result.translated_text.trim()),
        );
    }

    CommandResult::blocked(
        LifecycleState::TranslationAdapterPending,
        format!(
            "Realtime local translation worker is not connected yet. Source was received safely: {trimmed}. Planner status: {} / {}",
            result.status, result.mode
        ),
    )
}

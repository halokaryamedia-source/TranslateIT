use crate::engine::audio::live_capture::{live_capture_status, LiveCaptureStatusReport};
use crate::engine::config::EngineConfig;
use crate::engine::cuda_policy::CudaPolicyReport;
use crate::engine::diagnostics::RuntimeDiagnostics;
use crate::engine::paths::ProjectPaths;
use crate::engine::state::{EngineStatus, LifecycleState, RuntimeStage};

pub fn current_status() -> EngineStatus {
    let config = EngineConfig::default();
    let cuda_report = CudaPolicyReport::strict_pending();
    let project_paths = ProjectPaths::discover();
    let live_capture = live_capture_status();
    let logs_resolved = !project_paths.user_log_dir.trim().is_empty();

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
            format!("Runtime logs path resolved: {logs_resolved}"),
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

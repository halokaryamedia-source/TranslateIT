pub mod adapters;
pub mod config;
pub mod cuda_policy;
pub mod state;

use config::EngineConfig;
use cuda_policy::CudaPolicyReport;
use state::{CommandResult, EngineStatus, LifecycleState, RuntimeStage};

pub fn current_status() -> EngineStatus {
    let config = EngineConfig::default();
    let cuda_report = CudaPolicyReport::strict_pending();

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
            cuda_report.operator_note,
        ],
    }
}

pub fn start_capture() -> CommandResult {
    CommandResult::blocked(
        LifecycleState::ConversionPending,
        "Start was received by Rust runtime, but native Rust audio capture is not implemented yet.",
    )
}

pub fn stop_capture() -> CommandResult {
    CommandResult::ok(
        LifecycleState::Stopped,
        "Stop was received by Rust runtime. No native Rust capture worker is active yet.",
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

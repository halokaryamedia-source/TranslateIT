use serde::Serialize;

use crate::engine::adapters::live_pipeline_compact_status_logic::{
    build_live_pipeline_compact_status, LivePipelineCompactStatusReport,
};

#[derive(Debug, Clone, Serialize)]
pub struct InternalValidationGateReport {
    pub ready_for_owner_validation: bool,
    pub ready_for_release_candidate: bool,
    pub live_pipeline: LivePipelineCompactStatusReport,
    pub tauri_command_status_exposed: bool,
    pub build_validation_passed: bool,
    pub rust_check_passed: bool,
    pub frontend_typecheck_passed: bool,
    pub packaging_validation_passed: bool,
    pub required_evidence: Vec<String>,
    pub blockers: Vec<String>,
    pub progress_percent: u8,
    pub note: String,
}

pub fn analyze_internal_validation_gate() -> InternalValidationGateReport {
    let live_pipeline = build_live_pipeline_compact_status();
    let tauri_command_status_exposed = true;
    let build_validation_passed = false;
    let rust_check_passed = false;
    let frontend_typecheck_passed = false;
    let packaging_validation_passed = false;

    let mut blockers = Vec::new();
    if !live_pipeline.ready_for_user_runtime {
        blockers.push(format!("live_pipeline:{}", live_pipeline.next_blocker));
    }
    if !rust_check_passed {
        blockers.push("validation:rust_check_not_run".to_string());
    }
    if !frontend_typecheck_passed {
        blockers.push("validation:frontend_typecheck_not_run".to_string());
    }
    if !build_validation_passed {
        blockers.push("validation:tauri_build_not_run".to_string());
    }
    if !packaging_validation_passed {
        blockers.push("validation:packaging_not_validated".to_string());
    }

    let ready_for_owner_validation = live_pipeline.ready_for_user_runtime
        && tauri_command_status_exposed
        && rust_check_passed
        && frontend_typecheck_passed
        && build_validation_passed
        && packaging_validation_passed;
    let ready_for_release_candidate = ready_for_owner_validation;
    let progress_percent = if ready_for_owner_validation {
        100
    } else {
        live_pipeline.progress_percent.saturating_add(2).min(98)
    };

    InternalValidationGateReport {
        ready_for_owner_validation,
        ready_for_release_candidate,
        live_pipeline,
        tauri_command_status_exposed,
        build_validation_passed,
        rust_check_passed,
        frontend_typecheck_passed,
        packaging_validation_passed,
        required_evidence: vec![
            "cargo check --manifest-path src-tauri/Cargo.toml".to_string(),
            "npm run typecheck".to_string(),
            "npm run build".to_string(),
            "npm run build:frontend".to_string(),
            "tauri build / package launcher validation".to_string(),
            "manual microphone capture smoke test".to_string(),
            "ASR transcript smoke test".to_string(),
            "translation smoke test".to_string(),
            "TTS/playback smoke test".to_string(),
        ],
        blockers,
        progress_percent,
        note: "Internal validation gate blocks owner validation until runtime pipeline and build/package evidence are both complete.".to_string(),
    }
}

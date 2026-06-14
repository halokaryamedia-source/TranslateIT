use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::engine::adapters::live_pipeline_compact_status_logic::{
    build_live_pipeline_compact_status, LivePipelineCompactStatusReport,
};
use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationEvidenceFile {
    pub schema: Option<String>,
    pub generated_at_utc: Option<String>,
    pub status: Option<String>,
    pub rust_check_passed: Option<bool>,
    pub frontend_typecheck_passed: Option<bool>,
    pub frontend_build_passed: Option<bool>,
    pub tauri_build_passed: Option<bool>,
    pub packaging_validation_passed: Option<bool>,
    pub owner_validation_allowed: Option<bool>,
    pub release_candidate_allowed: Option<bool>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InternalValidationGateReport {
    pub ready_for_owner_validation: bool,
    pub ready_for_release_candidate: bool,
    pub live_pipeline: LivePipelineCompactStatusReport,
    pub tauri_command_status_exposed: bool,
    pub build_validation_passed: bool,
    pub rust_check_passed: bool,
    pub frontend_typecheck_passed: bool,
    pub frontend_build_passed: bool,
    pub packaging_validation_passed: bool,
    pub validation_evidence_path: String,
    pub validation_evidence_loaded: bool,
    pub validation_evidence_generated_at_utc: Option<String>,
    pub required_evidence: Vec<String>,
    pub blockers: Vec<String>,
    pub progress_percent: u8,
    pub note: String,
}

pub fn analyze_internal_validation_gate() -> InternalValidationGateReport {
    let live_pipeline = build_live_pipeline_compact_status();
    let tauri_command_status_exposed = true;
    let project_paths = ProjectPaths::discover();
    let validation_evidence_path = Path::new(&project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_validation_evidence.json");
    let evidence = read_validation_evidence(&validation_evidence_path);
    let validation_evidence_loaded = evidence.is_some();
    let evidence_ref = evidence.as_ref();

    let rust_check_passed = evidence_ref.and_then(|value| value.rust_check_passed).unwrap_or(false);
    let frontend_typecheck_passed = evidence_ref.and_then(|value| value.frontend_typecheck_passed).unwrap_or(false);
    let frontend_build_passed = evidence_ref.and_then(|value| value.frontend_build_passed).unwrap_or(false);
    let build_validation_passed = evidence_ref.and_then(|value| value.tauri_build_passed).unwrap_or(false);
    let packaging_validation_passed = evidence_ref.and_then(|value| value.packaging_validation_passed).unwrap_or(false);

    let mut blockers = Vec::new();
    if !live_pipeline.ready_for_user_runtime {
        blockers.push(format!("live_pipeline:{}", live_pipeline.next_blocker));
    }
    if !validation_evidence_loaded {
        blockers.push("validation:evidence_file_missing".to_string());
    }
    if !rust_check_passed {
        blockers.push("validation:rust_check_not_passed".to_string());
    }
    if !frontend_typecheck_passed {
        blockers.push("validation:frontend_typecheck_not_passed".to_string());
    }
    if !frontend_build_passed {
        blockers.push("validation:frontend_build_not_passed".to_string());
    }
    if !build_validation_passed {
        blockers.push("validation:tauri_build_not_passed".to_string());
    }
    if !packaging_validation_passed {
        blockers.push("validation:packaging_not_validated".to_string());
    }

    let ready_for_owner_validation = live_pipeline.ready_for_user_runtime
        && tauri_command_status_exposed
        && rust_check_passed
        && frontend_typecheck_passed
        && frontend_build_passed
        && build_validation_passed
        && packaging_validation_passed
        && evidence_ref.and_then(|value| value.owner_validation_allowed).unwrap_or(false);
    let ready_for_release_candidate = ready_for_owner_validation
        && evidence_ref.and_then(|value| value.release_candidate_allowed).unwrap_or(false);
    let progress_percent = if ready_for_release_candidate {
        100
    } else if ready_for_owner_validation {
        95
    } else {
        live_pipeline.progress_percent.saturating_add(if validation_evidence_loaded { 4 } else { 2 }).min(98)
    };

    InternalValidationGateReport {
        ready_for_owner_validation,
        ready_for_release_candidate,
        live_pipeline,
        tauri_command_status_exposed,
        build_validation_passed,
        rust_check_passed,
        frontend_typecheck_passed,
        frontend_build_passed,
        packaging_validation_passed,
        validation_evidence_path: validation_evidence_path.to_string_lossy().replace('\\', "/"),
        validation_evidence_loaded,
        validation_evidence_generated_at_utc: evidence_ref.and_then(|value| value.generated_at_utc.clone()),
        required_evidence: vec![
            "cargo check --manifest-path src-tauri/Cargo.toml".to_string(),
            "npm run typecheck".to_string(),
            "npm run build:frontend".to_string(),
            "npm run build".to_string(),
            "tauri build / package launcher validation".to_string(),
            "manual microphone capture smoke test".to_string(),
            "ASR transcript smoke test".to_string(),
            "translation smoke test".to_string(),
            "TTS/playback smoke test".to_string(),
        ],
        blockers,
        progress_percent,
        note: "Internal validation gate reads validation evidence from UserData/LogData and blocks owner validation until runtime pipeline, build/package evidence, and manual runtime smoke tests are complete.".to_string(),
    }
}

fn read_validation_evidence(path: &Path) -> Option<ValidationEvidenceFile> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str::<ValidationEvidenceFile>(&text).ok()
}

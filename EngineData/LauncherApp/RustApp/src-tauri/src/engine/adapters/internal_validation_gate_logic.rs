use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::engine::adapters::live_pipeline_compact_status_logic::{
    build_live_pipeline_compact_status, LivePipelineCompactStatusReport,
};
use crate::engine::adapters::local_worker_manifest_logic::{
    analyze_local_worker_manifest, LocalWorkerManifestReport,
};
use crate::engine::paths::ProjectPaths;

const VALIDATION_EVIDENCE_LABEL: &str =
    "UserData/LogData/RustAppValidation/latest_validation_evidence.json";
const MAX_INTERNAL_VALIDATION_BLOCKERS: usize = 80;
const MAX_INTERNAL_VALIDATION_BLOCKER_CHARS: usize = 180;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ManualRuntimeEvidence {
    pub microphone_capture_smoke_test: Option<bool>,
    pub asr_transcript_smoke_test: Option<bool>,
    pub translation_smoke_test: Option<bool>,
    pub tts_playback_smoke_test: Option<bool>,
    pub launcher_package_open_test: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LocalWorkerSmokeEvidenceSummary {
    pub loaded: Option<bool>,
    pub ok: Option<bool>,
    pub persistent_worker: Option<bool>,
    pub evidence_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationEvidenceFile {
    pub schema: Option<String>,
    pub generated_at_utc: Option<String>,
    pub manual_evidence_updated_at_utc: Option<String>,
    pub status: Option<String>,
    pub rust_check_passed: Option<bool>,
    pub frontend_typecheck_passed: Option<bool>,
    pub frontend_build_passed: Option<bool>,
    pub tauri_build_passed: Option<bool>,
    pub packaging_validation_passed: Option<bool>,
    pub local_worker_stack_passed: Option<bool>,
    pub local_worker_smoke_evidence: Option<LocalWorkerSmokeEvidenceSummary>,
    pub manual_runtime_evidence: Option<ManualRuntimeEvidence>,
    pub owner_validation_allowed: Option<bool>,
    pub release_candidate_allowed: Option<bool>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InternalValidationGateReport {
    pub ready_for_owner_validation: bool,
    pub ready_for_release_candidate: bool,
    pub live_pipeline: LivePipelineCompactStatusReport,
    pub local_worker_manifest: LocalWorkerManifestReport,
    pub tauri_command_status_exposed: bool,
    pub local_worker_stack_passed: bool,
    pub persistent_worker_smoke_passed: bool,
    pub build_validation_passed: bool,
    pub rust_check_passed: bool,
    pub frontend_typecheck_passed: bool,
    pub frontend_build_passed: bool,
    pub packaging_validation_passed: bool,
    pub microphone_capture_smoke_test_passed: bool,
    pub asr_transcript_smoke_test_passed: bool,
    pub translation_smoke_test_passed: bool,
    pub tts_playback_smoke_test_passed: bool,
    pub launcher_package_open_test_passed: bool,
    pub validation_evidence_path: String,
    pub validation_evidence_loaded: bool,
    pub validation_evidence_generated_at_utc: Option<String>,
    pub manual_evidence_updated_at_utc: Option<String>,
    pub required_evidence: Vec<String>,
    pub blockers: Vec<String>,
    pub progress_percent: u8,
    pub note: String,
}

pub fn analyze_internal_validation_gate() -> InternalValidationGateReport {
    let live_pipeline = build_live_pipeline_compact_status();
    let local_worker_manifest = analyze_local_worker_manifest();
    let tauri_command_status_exposed = true;
    let project_paths = ProjectPaths::discover();
    let validation_evidence_path = Path::new(&project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_validation_evidence.json");
    let evidence = read_validation_evidence(&validation_evidence_path);
    let validation_evidence_loaded = evidence.is_some();
    let evidence_ref = evidence.as_ref();
    let manual = evidence_ref
        .and_then(|value| value.manual_runtime_evidence.clone())
        .unwrap_or_default();
    let worker_smoke = evidence_ref
        .and_then(|value| value.local_worker_smoke_evidence.clone())
        .unwrap_or_default();

    let rust_check_passed = evidence_ref
        .and_then(|value| value.rust_check_passed)
        .unwrap_or(false);
    let frontend_typecheck_passed = evidence_ref
        .and_then(|value| value.frontend_typecheck_passed)
        .unwrap_or(false);
    let frontend_build_passed = evidence_ref
        .and_then(|value| value.frontend_build_passed)
        .unwrap_or(false);
    let build_validation_passed = evidence_ref
        .and_then(|value| value.tauri_build_passed)
        .unwrap_or(false);
    let packaging_validation_passed = evidence_ref
        .and_then(|value| value.packaging_validation_passed)
        .unwrap_or(false);
    let local_worker_stack_passed = evidence_ref
        .and_then(|value| value.local_worker_stack_passed)
        .unwrap_or(false)
        && local_worker_manifest.ok;
    let persistent_worker_smoke_passed = worker_smoke.loaded.unwrap_or(false)
        && worker_smoke.ok.unwrap_or(false)
        && worker_smoke.persistent_worker.unwrap_or(false);
    let microphone_capture_smoke_test_passed =
        manual.microphone_capture_smoke_test.unwrap_or(false);
    let asr_transcript_smoke_test_passed = manual.asr_transcript_smoke_test.unwrap_or(false);
    let translation_smoke_test_passed = manual.translation_smoke_test.unwrap_or(false);
    let tts_playback_smoke_test_passed = manual.tts_playback_smoke_test.unwrap_or(false);
    let launcher_package_open_test_passed = manual.launcher_package_open_test.unwrap_or(false);
    let manual_runtime_passed = microphone_capture_smoke_test_passed
        && asr_transcript_smoke_test_passed
        && translation_smoke_test_passed
        && tts_playback_smoke_test_passed
        && launcher_package_open_test_passed;

    let mut blockers = Vec::new();
    if !live_pipeline.ready_for_user_runtime {
        blockers.push(format!("live_pipeline:{}", live_pipeline.next_blocker));
    }
    if !local_worker_manifest.ok {
        blockers.extend(
            local_worker_manifest
                .blockers
                .iter()
                .map(|item| format!("local_worker:{item}")),
        );
    }
    if !validation_evidence_loaded {
        blockers.push("validation:evidence_file_missing".to_string());
    }
    if !local_worker_stack_passed {
        blockers.push("validation:local_worker_stack_not_passed".to_string());
    }
    if !persistent_worker_smoke_passed {
        blockers.push("validation:persistent_worker_smoke_not_passed".to_string());
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
    if !microphone_capture_smoke_test_passed {
        blockers.push("manual:microphone_capture_smoke_test_not_passed".to_string());
    }
    if !asr_transcript_smoke_test_passed {
        blockers.push("manual:asr_transcript_smoke_test_not_passed".to_string());
    }
    if !translation_smoke_test_passed {
        blockers.push("manual:translation_smoke_test_not_passed".to_string());
    }
    if !tts_playback_smoke_test_passed {
        blockers.push("manual:tts_playback_smoke_test_not_passed".to_string());
    }
    if !launcher_package_open_test_passed {
        blockers.push("manual:launcher_package_open_test_not_passed".to_string());
    }
    blockers = compact_blockers(blockers);

    let build_and_package_passed = rust_check_passed
        && frontend_typecheck_passed
        && frontend_build_passed
        && build_validation_passed
        && packaging_validation_passed
        && local_worker_stack_passed
        && persistent_worker_smoke_passed;
    let ready_for_owner_validation = live_pipeline.ready_for_user_runtime
        && local_worker_manifest.ok
        && tauri_command_status_exposed
        && build_and_package_passed
        && manual_runtime_passed
        && evidence_ref
            .and_then(|value| value.owner_validation_allowed)
            .unwrap_or(false);
    let ready_for_release_candidate = ready_for_owner_validation
        && evidence_ref
            .and_then(|value| value.release_candidate_allowed)
            .unwrap_or(false);
    let progress_percent = if ready_for_release_candidate {
        100
    } else if ready_for_owner_validation {
        95
    } else if build_and_package_passed && manual_runtime_passed {
        94
    } else if persistent_worker_smoke_passed {
        live_pipeline.progress_percent.saturating_add(10).min(93)
    } else if local_worker_manifest.ok {
        live_pipeline
            .progress_percent
            .saturating_add(if validation_evidence_loaded { 6 } else { 4 })
            .min(91)
    } else {
        live_pipeline
            .progress_percent
            .saturating_add(if validation_evidence_loaded { 4 } else { 2 })
            .min(89)
    };

    InternalValidationGateReport {
        ready_for_owner_validation,
        ready_for_release_candidate,
        live_pipeline,
        local_worker_manifest,
        tauri_command_status_exposed,
        local_worker_stack_passed,
        persistent_worker_smoke_passed,
        build_validation_passed,
        rust_check_passed,
        frontend_typecheck_passed,
        frontend_build_passed,
        packaging_validation_passed,
        microphone_capture_smoke_test_passed,
        asr_transcript_smoke_test_passed,
        translation_smoke_test_passed,
        tts_playback_smoke_test_passed,
        launcher_package_open_test_passed,
        validation_evidence_path: VALIDATION_EVIDENCE_LABEL.to_string(),
        validation_evidence_loaded,
        validation_evidence_generated_at_utc: evidence_ref.and_then(|value| value.generated_at_utc.clone()),
        manual_evidence_updated_at_utc: evidence_ref.and_then(|value| value.manual_evidence_updated_at_utc.clone()),
        required_evidence: vec![
            "local realtime worker stack validation".to_string(),
            "persistent local worker smoke evidence".to_string(),
            "cargo check --manifest-path src-tauri/Cargo.toml".to_string(),
            "npm run typecheck".to_string(),
            "npm run build:frontend".to_string(),
            "npm run build".to_string(),
            "tauri build / package launcher validation".to_string(),
            "manual microphone capture smoke test".to_string(),
            "ASR transcript smoke test".to_string(),
            "translation smoke test".to_string(),
            "TTS/playback smoke test".to_string(),
            "launcher package open test".to_string(),
        ],
        blockers,
        progress_percent,
        note: "Internal validation gate reads build, package, local realtime worker, persistent smoke, and manual runtime evidence from UserData/LogData and blocks owner validation until every gate is complete.".to_string(),
    }
}

fn compact_blockers(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .map(|value| {
            value
                .trim()
                .chars()
                .filter(|character| !character.is_control())
                .take(MAX_INTERNAL_VALIDATION_BLOCKER_CHARS)
                .collect::<String>()
        })
        .filter(|value| !value.is_empty())
        .take(MAX_INTERNAL_VALIDATION_BLOCKERS)
        .collect()
}

fn read_validation_evidence(path: &Path) -> Option<ValidationEvidenceFile> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str::<ValidationEvidenceFile>(&text).ok()
}

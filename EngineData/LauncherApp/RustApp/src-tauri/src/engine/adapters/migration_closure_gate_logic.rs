use serde::{Deserialize, Serialize};

use crate::engine::adapters::runtime_readiness_bundle_logic::{
    analyze_runtime_readiness_bundle, RuntimeReadinessBundleReport,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationClosureGateRequest {
    pub manual_build_validation_passed: bool,
    pub manual_runtime_smoke_passed: bool,
    pub manual_ui_review_passed: bool,
    pub manual_packaging_review_passed: bool,
    pub explicit_owner_approval: bool,
    pub allow_ready_for_review_transition: bool,
    pub allow_release_candidate_claim: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct MigrationClosureStage {
    pub stage: String,
    pub passed: bool,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MigrationClosureGateReport {
    pub runtime: RuntimeReadinessBundleReport,
    pub ready_for_review: bool,
    pub ready_for_release_candidate: bool,
    pub ready_for_production_release: bool,
    pub stages: Vec<MigrationClosureStage>,
    pub blockers: Vec<String>,
    pub note: String,
}

pub fn analyze_migration_closure_gate(request: MigrationClosureGateRequest) -> MigrationClosureGateReport {
    let runtime = analyze_runtime_readiness_bundle();

    let stages = vec![
        MigrationClosureStage {
            stage: "runtime_start_gate".to_string(),
            passed: runtime.ready_for_start_command,
            blocker: if runtime.ready_for_start_command { String::new() } else { "runtime:start_gate_blocked".to_string() },
            note: runtime.start_gate.note.clone(),
        },
        MigrationClosureStage {
            stage: "runtime_user_facing_readiness".to_string(),
            passed: runtime.ready_for_user_facing_runtime,
            blocker: if runtime.ready_for_user_facing_runtime { String::new() } else { "runtime:user_facing_not_ready".to_string() },
            note: runtime.note.clone(),
        },
        MigrationClosureStage {
            stage: "manual_build_validation".to_string(),
            passed: request.manual_build_validation_passed,
            blocker: if request.manual_build_validation_passed { String::new() } else { "manual:build_validation_pending".to_string() },
            note: "Manual build validation must be run outside this gate before review/release claims.".to_string(),
        },
        MigrationClosureStage {
            stage: "manual_runtime_smoke".to_string(),
            passed: request.manual_runtime_smoke_passed,
            blocker: if request.manual_runtime_smoke_passed { String::new() } else { "manual:runtime_smoke_pending".to_string() },
            note: "Manual runtime smoke must verify launcher startup, command bridge, and safe blocked states.".to_string(),
        },
        MigrationClosureStage {
            stage: "manual_ui_review".to_string(),
            passed: request.manual_ui_review_passed,
            blocker: if request.manual_ui_review_passed { String::new() } else { "manual:ui_review_pending".to_string() },
            note: "Final UI review must confirm the debug-heavy migration controls are replaced or hidden before release.".to_string(),
        },
        MigrationClosureStage {
            stage: "manual_packaging_review".to_string(),
            passed: request.manual_packaging_review_passed,
            blocker: if request.manual_packaging_review_passed { String::new() } else { "manual:packaging_review_pending".to_string() },
            note: "Packaging review must confirm local runtime files and dependencies are present without false model/backend claims.".to_string(),
        },
        MigrationClosureStage {
            stage: "owner_approval".to_string(),
            passed: request.explicit_owner_approval,
            blocker: if request.explicit_owner_approval { String::new() } else { "approval:owner_pending".to_string() },
            note: "Explicit owner approval is required before ready-for-review or release-candidate transition.".to_string(),
        },
        MigrationClosureStage {
            stage: "transition_permission".to_string(),
            passed: request.allow_ready_for_review_transition,
            blocker: if request.allow_ready_for_review_transition { String::new() } else { "permission:ready_for_review_not_allowed".to_string() },
            note: "This keeps the PR in draft until the owner explicitly allows ready-for-review transition.".to_string(),
        },
        MigrationClosureStage {
            stage: "release_candidate_permission".to_string(),
            passed: request.allow_release_candidate_claim,
            blocker: if request.allow_release_candidate_claim { String::new() } else { "permission:release_candidate_not_allowed".to_string() },
            note: "Release-candidate wording is blocked unless explicitly allowed.".to_string(),
        },
    ];

    let ready_for_review = runtime.ready_for_start_command
        && request.manual_build_validation_passed
        && request.manual_runtime_smoke_passed
        && request.explicit_owner_approval
        && request.allow_ready_for_review_transition;

    let ready_for_release_candidate = ready_for_review
        && runtime.ready_for_user_facing_runtime
        && request.manual_ui_review_passed
        && request.manual_packaging_review_passed
        && request.allow_release_candidate_claim;

    let ready_for_production_release = false;

    let mut blockers: Vec<String> = stages
        .iter()
        .filter(|stage| !stage.passed && !stage.blocker.is_empty())
        .map(|stage| format!("{}:{}", stage.stage, stage.blocker))
        .collect();

    blockers.extend(runtime.blockers.iter().filter(|blocker| !blocker.is_empty()).cloned());
    blockers.sort();
    blockers.dedup();

    let note = if ready_for_release_candidate {
        "Migration closure gate allows release-candidate wording only. Production release remains blocked until final validation is explicitly performed.".to_string()
    } else if ready_for_review {
        "Migration closure gate allows ready-for-review transition only. Release-candidate and production claims remain blocked.".to_string()
    } else {
        "Migration closure gate remains blocked. Draft PR status and no-production-ready claim should be preserved.".to_string()
    };

    MigrationClosureGateReport {
        runtime,
        ready_for_review,
        ready_for_release_candidate,
        ready_for_production_release,
        stages,
        blockers,
        note,
    }
}

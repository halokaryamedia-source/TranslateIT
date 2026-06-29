# Active Documentation Index

Branch: `V1-Advance`
Status: active documentation entrypoint

## Purpose

Current engineering documentation entrypoint for TranslateIT V1-Advance.

## Active branch strategy

`V1-Advance` is the primary source branch for current TranslateIT V1 development.

`Developing` is no longer the active merge target for this phase and may be discarded later after `V1-Advance` is fully ready.

Do not create new PRs into `Developing` for the current phase.

## Single active engine rule

```text
Rust/Tauri desktop shell + Python helper runtime
```

## Active source-of-truth documents

```text
DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_PRIMARY_SOURCE_BRANCH_POLICY.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_PRODUCT_REQUIREMENTS.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_NON_LOCAL_CI_POLICY.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_DEPENDENCY_INSTALL_POLICY.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_PHASE_PLAN.md
DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md
DevelopingData/Documentation/Reports/Engineering/SINGLE_ACTIVE_ENGINE_POLICY.md
EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json
EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json
EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json
EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json
```

## Phase audit records

```text
V1_ADVANCE_SINGLE_ENGINE_CLEANUP_AUDIT.md
V1_ADVANCE_RUNTIME_CONTRACT_RETARGET_AUDIT.md
V1_ADVANCE_DOCUMENTATION_CLEANUP_AUDIT.md
V1_ADVANCE_SCRIPT_SAFETY_AUDIT.md
V1_ADVANCE_DEPENDENCY_INSTALL_AUDIT.md
V1_ADVANCE_DEPENDENCY_PROBE_CI_AUDIT.md
V1_ADVANCE_TYPESCRIPT_CI_AUDIT.md
V1_ADVANCE_RUST_CHECK_CI_AUDIT.md
V1_ADVANCE_RUST_GATE_REPAIR_AUDIT.md
V1_ADVANCE_FRONTEND_BUILD_PREFLIGHT_AUDIT.md
V1_ADVANCE_FRONTEND_BUILD_CI_AUDIT.md
V1_ADVANCE_PACKAGE_SCRIPT_CLEANUP_AUDIT.md
V1_ADVANCE_LOCAL_ONLY_SCRIPT_RESTORATION_PLAN.md
V1_ADVANCE_PR_READINESS_CLEANUP.md
V1_ADVANCE_PR_STATUS_UPDATE_AUDIT.md
V1_ADVANCE_CHANGED_FILE_SCOPE_REVIEW.md
V1_ADVANCE_SPLIT_MERGE_STRATEGY_PLAN.md
V1_ADVANCE_PR_TO_DEVELOPING_STATUS_AUDIT.md
V1_ADVANCE_WORKFLOW_TRIGGER_CLEANUP_AUDIT.md
V1_ADVANCE_WORKFLOW_TRIGGER_REPAIR_AUDIT.md
V1_ADVANCE_PREFLIGHT_PATH_REPAIR_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_DEPENDENCY_PROBE_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_TYPESCRIPT_GATE_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_RUST_MANIFEST_PREFLIGHT_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_FRONTEND_PREFLIGHT_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_FRONTEND_BUILD_GATE_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_POLICY_VALIDATOR_AUDIT.md
V1_ADVANCE_POLICY_VALIDATOR_COMMAND_MATCH_REPAIR_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_RUST_TOOLCHAIN_PROBE_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_FULL_RUST_CARGO_CHECK_AUDIT.md
V1_ADVANCE_FULL_RUST_CARGO_CHECK_REPAIR_AUDIT.md
V1_ADVANCE_FULL_RUST_CARGO_CHECK_DEFER_AUDIT.md
V1_ADVANCE_CI_REPROMOTION_TAURI_PACKAGE_PREFLIGHT_AUDIT.md
V1_ADVANCE_TAURI_PACKAGE_PREFLIGHT_REPAIR_AUDIT.md
```

## Current runtime summary

- Desktop shell: Rust/Tauri.
- Helper runtime: Python worker launched/orchestrated by Rust/Tauri.
- Active app package: `EngineData/Frontend/RustApp`.
- Active development branch: `V1-Advance`.

## Current development mode

Current work continues directly on `V1-Advance`.

Non-local CI may validate structure, scripts, policy contracts, TypeScript, Rust manifest preflight, frontend build gates, Rust toolchain availability, Cargo metadata, and Tauri package preflight.

Full Rust cargo check is deferred until Rust source compile errors can be fixed from logs.

Non-local CI must not claim local runtime readiness, CUDA readiness, model loading readiness, microphone readiness, virtual microphone readiness, TTS provider quality, installer readiness, or target-PC latency.

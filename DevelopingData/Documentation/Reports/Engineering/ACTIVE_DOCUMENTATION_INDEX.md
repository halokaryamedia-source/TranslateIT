# Active Documentation Index

Branch: `V1-Advance`
Status: active documentation entrypoint

## Purpose

Current compact engineering documentation entrypoint for TranslateIT V1-Advance.

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
DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_PRODUCT_REQUIREMENTS.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_PRIMARY_SOURCE_BRANCH_POLICY.md
DevelopingData/Documentation/Reports/Engineering/SINGLE_ACTIVE_ENGINE_POLICY.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_NON_LOCAL_CI_POLICY.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_NON_LOCAL_COMPLETION_PLAN.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_NON_LOCAL_AUDIT_INDEX.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_RUNTIME_READINESS_REPORT.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_LOCAL_TAURI_COMPILE_PROOF.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_LOCAL_COMPILE_ERROR_INTAKE_TEMPLATE.md
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_HELPER_COMMAND_CONTRACT.md
```

## Active runtime contracts

```text
EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json
EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json
EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json
EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json
```

## Audit records

Detailed audit records are grouped in:

```text
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_NON_LOCAL_AUDIT_INDEX.md
```

Older CI promotion and repair audit records remain in this directory and can be referenced directly when needed.

## Current runtime summary

- Desktop shell: Rust/Tauri.
- Helper runtime: Python worker launched/orchestrated by Rust/Tauri.
- Active app package: `EngineData/Frontend/RustApp`.
- Active development branch: `V1-Advance`.

## Current development mode

Current work continues directly on `V1-Advance`.

Non-local CI may validate structure, scripts, policy contracts, TypeScript, Rust manifest preflight, frontend build gates, Rust toolchain availability, Cargo metadata, and Tauri package preflight.

Full Rust cargo check is deferred until Rust source compile errors can be fixed from local logs.

Non-local CI must not claim local runtime readiness, CUDA readiness, model loading readiness, microphone readiness, virtual microphone readiness, TTS provider quality, installer readiness, or target-PC latency.

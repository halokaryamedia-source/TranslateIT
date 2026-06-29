# Active Documentation Index

Branch: `V1-Advance`
Status: active documentation entrypoint

## Purpose

This is the current engineering documentation entrypoint for TranslateIT V1-Advance.

## Single active engine rule

TranslateIT has one active product runtime direction:

```text
Rust/Tauri desktop shell + Python helper runtime
```

Python remains part of the product only as the helper runtime for ASR, translation, TTS/voice, CUDA diagnostics, latency diagnostics, model health checks, and audio/provider processing.

## Active source-of-truth documents

Read these first:

```text
DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md
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
```

## Current runtime summary

- Desktop shell: Rust/Tauri.
- Helper runtime: Python worker launched/orchestrated by Rust/Tauri.
- Active app package: `EngineData/Frontend/RustApp`.
- Helper worker: `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py`.
- Runtime contracts: `EngineData/Backend/RuntimeContracts`.
- Active development branch: `V1-Advance`.
- Default repository branch remains `Developing` for now.

## Current development mode

Current work is GitHub-first and CI-first.

Non-local CI may validate structure, scripts, policy contracts, TypeScript, Rust manifest preflight, and frontend build gates.

Non-local CI must not claim readiness for CUDA, model loading, microphone capture, virtual microphone routing, TTS provider quality, installer packaging, or target-PC latency.

## Documentation cleanup rule

Superseded reports and notes may remain as historical context only. When a superseded document conflicts with this index, `V1_ADVANCE_PRODUCT_REQUIREMENTS.md`, `CURRENT_APP_STATUS.md`, or the runtime contracts, this index and the active contracts win.

## Do not reintroduce

Do not create or document another active launcher shell.

Do not create V2, V3, V4, legacy, alternative, or parallel engines.

Do not use DesignIT or FigmaDesignExport as active runtime dependencies.

## Not claimed

This index does not claim local validation, packaged app readiness, CUDA readiness, target-PC helper spawn success, voice capture success, virtual microphone success, TTS provider quality, or Audio Studio provider readiness.

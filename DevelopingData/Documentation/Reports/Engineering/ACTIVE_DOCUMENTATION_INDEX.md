# Active Documentation Index

Branch: `Dev-Rust`

## Purpose

This is the current engineering documentation entrypoint for TranslateIT.

Read this file first before using older reports, handoff notes, or phase documents.

## Single active engine rule

TranslateIT has one active product runtime direction:

```text
Rust/Tauri desktop shell + Python helper runtime
```

There is no second launcher engine and no alternate Python/Qt product shell in `Dev-Rust`.

Python remains part of the product only as the helper runtime for ASR, translation, TTS/voice, CUDA diagnostics, latency diagnostics, model health checks, and audio/provider processing.

## Active source-of-truth documents

Read these in order:

1. `DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md`
2. `DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md`
3. `DevelopingData/Documentation/Reports/Engineering/SINGLE_ACTIVE_ENGINE_POLICY.md`
4. `EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json`
5. `EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json`
6. `EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json`
7. `EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json`
8. `EngineData/Backend/RuntimeContracts/USERDATA_ROOT_POLICY_CONTRACT.json`
9. `DevelopingData/Documentation/Reports/Engineering/CAPTURE_HELPER_BRIDGE_MIGRATION_PLAN.md`
10. `DevelopingData/Documentation/Reports/Engineering/HELPER_BRIDGE_TIMEOUT_POLICY.md`
11. `DevelopingData/Documentation/Reports/Engineering/NOISE_HALLUCINATION_FILTERING_POLICY.md`

## Current runtime summary

- Desktop shell: Rust/Tauri.
- Helper runtime: Python worker launched/orchestrated by Rust/Tauri.
- User data roots: `UserData/CacheData`, `UserData/SavedProject`, and `UserData/LogData`.
- Active app package: `EngineData/LauncherApp/RustApp`.
- Helper worker: `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py`.
- Runtime contracts: `EngineData/Backend/RuntimeContracts`.

## Documentation cleanup rule

Older reports and notes may remain in the repository as historical context, but they are not active source-of-truth unless they are listed in this index.

When an older document conflicts with this index, `CURRENT_APP_STATUS.md`, or the runtime contracts, this index and the active contracts win.

Recommended note when editing an older file:

```text
Historical context only. Current active direction is Rust/Tauri desktop shell + Python helper runtime. Read DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md first.
```

## Do not reintroduce

Do not create or document another active launcher shell.

Do not use older notes to claim runtime readiness.

Do not move active documentation outside `DevelopingData/Documentation/Reports/Engineering` unless the documentation hub is updated in the same change.

## Not claimed

This index does not claim local validation, packaged app readiness, CUDA readiness, target-PC helper spawn success, voice capture success, or Audio Studio provider readiness.

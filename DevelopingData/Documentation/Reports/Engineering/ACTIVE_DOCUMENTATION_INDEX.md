# Active Documentation Index

Branch: `V1-Advance`
Status: active documentation entrypoint

## Purpose

This is the current engineering documentation entrypoint for TranslateIT V1-Advance.

Read this file first before using superseded reports, handoff notes, phase documents, cleanup reports, or historical branch notes.

## Single active engine rule

TranslateIT has one active product runtime direction:

```text
Rust/Tauri desktop shell + Python helper runtime
```

There is no second launcher engine and no separate product shell in TranslateIT V1.

Python remains part of the product only as the helper runtime for ASR, translation, TTS/voice, CUDA diagnostics, latency diagnostics, model health checks, and audio/provider processing.

## V1-Advance locked product direction

TranslateIT V1-Advance is a Windows desktop real-time conversation translator with:

```text
Local model runtime
Indonesian <-> English initial language scope
NVIDIA CUDA-first acceleration
CPU fallback required
Built-in virtual microphone target
Always-listening default
Push-to-talk secondary
700ms silence threshold
12 second maximum speech segment
English TTS output for Indonesian speech
```

DesignIT and FigmaDesignExport are inactive and must not be reintroduced as active runtime dependencies.

## Active source-of-truth documents

Read these in order:

1. `DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md`
2. `DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_PRODUCT_REQUIREMENTS.md`
3. `DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_NON_LOCAL_CI_POLICY.md`
4. `DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json`
5. `DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_PHASE_PLAN.md`
6. `DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md`
7. `DevelopingData/Documentation/Reports/Engineering/SINGLE_ACTIVE_ENGINE_POLICY.md`
8. `EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json`
9. `EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json`
10. `EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json`
11. `EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json`
12. `EngineData/Backend/RuntimeContracts/USERDATA_ROOT_POLICY_CONTRACT.json`
13. `DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_SINGLE_ENGINE_CLEANUP_AUDIT.md`
14. `DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_RUNTIME_CONTRACT_RETARGET_AUDIT.md`
15. `DevelopingData/Documentation/Reports/Engineering/CAPTURE_HELPER_BRIDGE_MIGRATION_PLAN.md`
16. `DevelopingData/Documentation/Reports/Engineering/HELPER_BRIDGE_TIMEOUT_POLICY.md`
17. `DevelopingData/Documentation/Reports/Engineering/NOISE_HALLUCINATION_FILTERING_POLICY.md`

## Historical cleanup/audit documents

These documents may remain useful for cleanup planning or historical context only. They do not claim runtime readiness and do not authorize structural runtime changes by themselves.

1. `DevelopingData/Documentation/Reports/Engineering/V1_STRUCTURE_AUDIT_AND_REPAIR_PLAN.md`
2. `DevelopingData/Documentation/Reports/Engineering/V1_ACTIVE_FILE_OWNERSHIP_MAP.md`
3. `DevelopingData/Documentation/Reports/Engineering/V1_LEGACY_ARCHIVE_GATE.md`
4. `DevelopingData/Documentation/Reports/Engineering/V1_PHASE_1_TO_5_COMPLETION_REPORT.md`

## Current runtime summary

- Desktop shell: Rust/Tauri.
- Helper runtime: Python worker launched/orchestrated by Rust/Tauri.
- User data roots: `UserData/CacheData`, `UserData/SavedProject`, and `UserData/LogData`.
- Active app package: `EngineData/Frontend/RustApp`.
- Helper worker: `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py`.
- Runtime contracts: `EngineData/Backend/RuntimeContracts`.
- Active development branch: `V1-Advance`.
- Default repository branch remains `Developing` for now.

## Current development mode

Current work is GitHub-first and CI-first.

Non-local CI may validate structure, scripts, policy contracts, and documentation consistency.

Non-local CI must not claim readiness for CUDA, model loading, microphone capture, virtual microphone routing, TTS provider quality, installer packaging, or target-PC latency.

`V1_ADVANCE_SCRIPT_SAFETY_MATRIX.json` controls which package scripts are allowed in non-local CI and which must stay target-PC/local-runtime only.

## Documentation cleanup rule

Superseded reports and notes may remain in the repository as historical context, but they are not active source-of-truth unless they are listed in this index.

When a superseded document conflicts with this index, `V1_ADVANCE_PRODUCT_REQUIREMENTS.md`, `CURRENT_APP_STATUS.md`, or the runtime contracts, this index and the active contracts win.

Recommended note when editing a superseded file:

```text
Historical context only. Current active direction is TranslateIT V1-Advance: Rust/Tauri desktop shell + Python helper runtime. Read DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md first.
```

## Do not reintroduce

Do not create or document another active launcher shell.

Do not create V2, V3, V4, legacy, alternative, or parallel engines.

Do not use DesignIT or FigmaDesignExport as active runtime dependencies.

Do not use superseded notes to claim runtime readiness.

Do not move active documentation outside `DevelopingData/Documentation/Reports/Engineering` unless the documentation hub is updated in the same change.

## Not claimed

This index does not claim local validation, packaged app readiness, CUDA readiness, target-PC helper spawn success, voice capture success, virtual microphone success, TTS provider quality, or Audio Studio provider readiness.

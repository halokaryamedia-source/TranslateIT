# Dev-Rust Realtime Readiness Matrix

## Purpose
This matrix continues the realtime readiness work using the correct `Dev-Rust` architecture.

## Branch and architecture correction
The old note about patching `app_main.py` is not the correct path for `Dev-Rust`.
The active app route is:

```text
EngineData/LauncherApp/RustApp
```

The active Rust/Tauri backend route is:

```text
EngineData/LauncherApp/RustApp/src-tauri/src/commands
EngineData/LauncherApp/RustApp/src-tauri/src/engine
```

The backend worker route is:

```text
EngineData/Backend/LocalWorker/WorkerRuntime
```

## Current readiness estimate

| Area | Honest readiness | Current note | Correct next action for Dev-Rust |
| --- | ---: | --- | --- |
| Repo-side realtime foundation | 99.8% | Foundation files, checklists, release gates, asset readiness, latency gate, issue tracking, and payload contract now exist. | Keep as foundation evidence. Do not call product ready until local validation passes. |
| Translate Engine core architecture | 72-77% | Mic -> STT -> MT -> TTS flow is mapped, helper/gate files exist, and a Rust-facing realtime status payload adapter now exists. Live target-PC end-to-end proof is still missing. | Validate via LocalWorker command path and Rust/Tauri command wrappers. |
| Realtime app integration | 55-60% | Tauri command function and Rust adapter exist, but `main.rs` handler registration and frontend state binding are still pending. | Register the command in `tauri::generate_handler!`, run `check:rust`, then connect frontend after preview approval. |
| Runtime model/assets readiness | 35-45% | Manifest and checker exist, but local model and voice assets are not proven available in runtime asset folders. | Validate `RuntimeAssets` with local model presence and worker smoke tests. |
| Benchmark and validation | 35-40% | Gate and sample formats exist, but no target-PC latency result is recorded. | Collect latency samples through LocalWorker smoke and app-level test flow. |
| Product realtime readiness | 57-62% | Foundation is stronger and app integration command shape is now partially implemented, but desktop app binding and target-PC evidence are still pending. | Complete handler registration, app integration, and evidence capture. |
| Gemini Live Translate pursuit | 30-40% | Gemini-level behavior requires very low latency, broad multilingual support, strong quality routing, and natural voice output. | Treat as future quality target, not current release claim. |

## Completed in this continuation

- Created issue #5 for Dev-Rust realtime app integration via Tauri and LocalWorker.
- Added `EngineData/Backend/RuntimeContracts/realtime_status_payload_contract.json`.
- Added `EngineData/LauncherApp/RustApp/DesignPreview/realtime-status-mapping.md`.
- Added Rust adapter `EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/realtime_status_payload_logic.rs`.
- Registered the adapter module in `src-tauri/src/engine/adapters/mod.rs`.
- Added command function `get_realtime_status_payload()` in `src-tauri/src/commands/diagnostics.rs`.
- Added progress tracker `DevelopingData/Reports/Engineering/DEV_RUST_REALTIME_STATUS_COMMAND_PROGRESS.md`.
- Confirmed that the old `app_main.py` path is not the Dev-Rust integration route.

## Immediate development priorities

1. Register `get_realtime_status_payload` in `tauri::generate_handler!` inside `src-tauri/src/main.rs`.
2. Run `npm run check:rust` from `EngineData/LauncherApp/RustApp`.
3. Connect the command to a frontend state model after DesignPreview approval.
4. Validate LocalWorker commands: `status`, `transcribe`, `translate`, `synthesize`.
5. Validate local runtime assets under `EngineData/Backend/RuntimeAssets`.
6. Record local validation evidence under `UserData/LogData/RustAppValidation`.

## Current blocker summary

- `main.rs` handler registration is still pending because full-file connector update was blocked.
- No local target-PC validation result has been recorded yet.
- Runtime assets must be verified in `EngineData/Backend/RuntimeAssets`.
- App integration must use `RustApp/src-tauri`, not the old Python launcher route.
- DesignPreview must be approved before UI style is synced into active Tauri frontend.

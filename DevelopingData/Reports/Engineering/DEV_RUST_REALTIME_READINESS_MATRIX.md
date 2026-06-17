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
| Repo-side realtime foundation | 99.8% | Foundation files, checklists, release gates, asset readiness, latency gate, and issue tracking are present. | Keep as foundation evidence. Do not call product ready until local validation passes. |
| Translate Engine core architecture | 70-75% | Mic -> STT -> MT -> TTS flow is mapped and many helper/gate files exist. Live target-PC end-to-end proof is still missing. | Validate via LocalWorker command path and Rust/Tauri command wrappers. |
| Realtime app integration | 50-55% | Old `app_main.py` patch path is not valid for Dev-Rust. | Rebuild as Tauri frontend state + Rust command integration, not Python app-main patching. |
| Runtime model/assets readiness | 35-45% | Manifest and checker exist, but local model and voice assets are not proven available in runtime asset folders. | Validate `RuntimeAssets` with local model presence and worker smoke tests. |
| Benchmark and validation | 35-40% | Gate and sample formats exist, but no target-PC latency result is recorded. | Collect latency samples through LocalWorker smoke and app-level test flow. |
| Product realtime readiness | 55-60% | Foundation is stronger, but product readiness still needs desktop app integration and target-PC evidence. | Complete app integration and evidence capture. |
| Gemini Live Translate pursuit | 30-40% | Gemini-level behavior requires very low latency, broad multilingual support, strong quality routing, and natural voice output. | Treat as future quality target, not current release claim. |

## Immediate development priorities

1. Replace the old app-main hook idea with a Dev-Rust Tauri integration task.
2. Add a Rust/Tauri-facing realtime status contract if not already exposed by current commands.
3. Add frontend preview-to-runtime mapping only after DesignPreview approval.
4. Validate LocalWorker commands: `status`, `transcribe`, `translate`, `synthesize`.
5. Record local validation evidence under `UserData/LogData/RustAppValidation`.

## Current blocker summary

- No local target-PC validation result has been recorded yet.
- Runtime assets must be verified in `EngineData/Backend/RuntimeAssets`.
- App integration must use `RustApp/src-tauri`, not the old Python launcher route.
- DesignPreview must be approved before UI style is synced into active Tauri frontend.

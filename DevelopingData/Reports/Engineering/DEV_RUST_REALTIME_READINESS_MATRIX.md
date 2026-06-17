# Dev-Rust Realtime Readiness Matrix

## Purpose
This matrix continues the realtime readiness work using the correct `Dev-Rust` architecture.

## Branch and architecture correction
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
| Repo-side realtime foundation | 99.8% | Foundation, payload contract, workflow, and evidence tracker exist. | Keep as evidence until validation passes. |
| Translate Engine core architecture | 74-79% | Core flow is mapped and Rust-facing payload route exists. | Validate through LocalWorker and Rust/Tauri wrappers. |
| Realtime app integration | 69-73% | Tauri command, Rust adapter, handler registration, frontend payload type, separate payload API, and state mapper now exist. | Run Rust check, then bind mapper into UI after DesignPreview approval. |
| Runtime model/assets readiness | 35-45% | Asset checks exist, but local model and voice assets are not proven on target PC. | Validate RuntimeAssets and worker smoke tests. |
| Benchmark and validation | 35-40% | Gate formats exist, but no target-PC latency result is recorded. | Collect LocalWorker and app-level latency samples. |
| Product realtime readiness | 64-69% | Command exposure plus frontend state preparation exists; final UI binding and target-PC evidence are pending. | Complete validation, UI binding, and evidence capture. |
| Gemini Live Translate pursuit | 30-40% | This remains a future quality target, not a current release claim. | Continue after product realtime readiness improves. |

## Completed in this continuation

- Main handler registration is resolved.
- Full Rust-check workflow placement is resolved.
- Frontend payload type is added.
- Separate frontend payload API is added.
- Frontend state mapper is added.
- Old Python launcher route is not used for Dev-Rust realtime integration.

## Immediate development priorities

1. Check the `Dev-Rust Rust Check` workflow result.
2. Run `npm run check:rust` locally if workflow evidence is unavailable.
3. Bind the realtime status state mapper into UI after DesignPreview approval.
4. Validate LocalWorker commands: `status`, `transcribe`, `translate`, `synthesize`.
5. Validate local runtime assets.
6. Record validation evidence.

## Current blocker summary

- Large runtime API edit was blocked and replaced by a separate payload API module.
- Direct DOM binding was blocked and replaced by a pure state mapper.
- Workflow status lookup returned no run/pass evidence yet.
- No successful Rust check or target-PC validation result has been recorded yet.

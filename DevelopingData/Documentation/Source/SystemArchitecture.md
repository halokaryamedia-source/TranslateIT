# TranslateIT System Architecture

## Runtime route

TranslateIT has one app runtime route and one root convenience shortcut:

```text
TranslateIT.cmd -> packaged TranslateIT app or NSIS installer
EngineData/Frontend/RustApp -> Tauri packaged TranslateIT app
```

`TranslateIT.cmd` is only a root shortcut. It must not start dev server, browser route, Python UI, or worker directly.

## EngineData ownership

`EngineData` uses three clear top-level areas:

```text
EngineData/
  Backend/          # runtime worker, contracts, and local runtime assets
  Frontend/         # frontend ownership notes and UI guidance
  Frontend/      # active app route and approved local AI worker
```

Backend and frontend should stay simple and function-first:

```text
Translate/
Transcript/
Runtime/
Assets/
Contracts/
Worker/
```

Use the function names first when deciding where new files belong. Keep technical subfolders only when they make the code easier to find.

Retired EngineData roots:

```text
EngineData/VoiceEngine/
EngineData/RuntimeAssets/
```

## RustApp ownership

`EngineData/Frontend/RustApp` owns:

- desktop app shell,
- startup warmup screen,
- Tauri/Rust commands,
- frontend UI,
- settings page,
- runtime status panels,
- validation command exposure,
- build and package route.

### Internal split

Inside `RustApp`, keep the current split stable:

- `src-tauri/src/commands/` for thin Tauri command wrappers and bridge endpoints
- `src-tauri/src/engine/` for Rust domain logic, validation, paths, state, and runtime contracts
- `src/` for frontend UI and presentation logic
- `src-tauri/src/commands/helper_bridge_runtime.rs` for process/runtime state and worker I/O helpers
- `src-tauri/src/commands/bridge_paths.rs` for bridge path discovery and normalization helpers

Avoid mixing command routing with domain logic so the rewrite stays modular.

## Local AI worker ownership

`EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py` owns local inference orchestration for:

- Faster Whisper ASR,
- MarianMT Realtime translation,
- NLLB Quality translation,
- Piper TTS orchestration.

This worker is intentionally retained until local inference is rewritten natively or packaged through another approved local runtime. It is not a UI engine and must not become another app route.

## Runtime profiles

User-visible runtime profiles should remain simple:

- `Realtime` - lower latency path using MarianMT ID to EN.
- `Quality` - higher quality path using NLLB 200 distilled 600M.

Do not expose internal model names as confusing user-facing choices unless needed in diagnostics.

## Runtime asset folders

```text
EngineData/Backend/RuntimeAssets/ASR/ModelData/
EngineData/Backend/RuntimeAssets/Translation/ModelData/
EngineData/Backend/RuntimeAssets/Voice/Piper/
```

These folders are local asset slots. They should not contain committed source code or model binaries. Model binaries, ONNX voice files, Piper executables, and generated audio stay local and ignored by Git.

## Development and documentation route

Documentation:

```text
DevelopingData/Documentation
```

Tooling:

```text
DevelopingData/Tooling/Scripts/Execution
```

Quality references:

```text
DevelopingData/Quality
```

Samples:

```text
DevelopingData/Samples
```

## Preview route

```text
Launcher/Preview/TranslateIT_UI_Preview.html
```

This is a static design preview only, not a runtime route.

## Retired paths

```text
DeveloperData/
DevelopingData/DocumentationData/
DevelopingData/Tooling/
DevelopingData/Samples/
TranslateIT.vbs
TranslateIT.cmd
```

## Validation route

RustApp validation scripts use:

```text
DevelopingData/Tooling/Scripts/Execution
```

Run from:

```text
EngineData/Frontend/RustApp
```

Core commands:

```powershell
npm run validate:internal
npm run validate:full
npm run smoke:worker
npm run status:readiness
```

## Maintenance guidance

- Prefer moving large cohesive blocks into new modules before adding new features.
- Keep dev-only reports in `DevelopingData`, not in app runtime paths.
- Keep runtime user outputs in `UserData`.
- Treat the Python worker as a narrow helper runtime, not a second application shell.

## Known Bad State

The current tree is much cleaner now, but a few areas still need the final pass:

- `runtime.rs` and adjacent command files still need a final modular split.
- Some helper and inventory modules are still intermediate refactor layers.

## Readiness truth rule

Validation scripts and documentation must not mark the app professionally ready until evidence exists for local build/package, local model readiness, persistent worker smoke, real microphone ASR, translation, TTS, and end-to-end latency.


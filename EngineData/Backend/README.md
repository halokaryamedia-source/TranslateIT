# EngineData Backend

## Purpose

`Backend` defines runtime and inference ownership for TranslateIT.

The current active Tauri package is physically located at `EngineData/LauncherApp/RustApp`. Its role is desktop runtime packaging, not a separate engine or alternate shell. Backend-owned runtime files use explicit backend names.

## Current active backend paths

```text
EngineData/LauncherApp/RustApp/src-tauri/src/commands
EngineData/LauncherApp/RustApp/src-tauri/src/engine
EngineData/Backend/LocalWorker/WorkerRuntime
EngineData/Backend/RuntimeContracts
EngineData/Backend/RuntimeAssets
```

## Backend responsibility split

```text
Backend/
  README.md
  RuntimeCore/       # Rust runtime core, audio, inference, session, diagnostics ownership
  LocalWorker/       # Python worker ownership route
    WorkerRuntime/   # executable worker files and setup/smoke scripts
  RuntimeContracts/  # runtime JSON contracts and model readiness manifest
  RuntimeAssets/     # local model/runtime asset slots ignored by Git
```

## Runtime contract files

```text
EngineData/Backend/RuntimeContracts/ATTACHMENT_RUNTIME_CONTRACT.json
EngineData/Backend/RuntimeContracts/AUDIO_PIPELINE_RUNTIME_CONTRACT.json
EngineData/Backend/RuntimeContracts/TRANSLATION_RUNTIME_CONTRACT.json
EngineData/Backend/RuntimeContracts/MODEL_RUNTIME_MANIFEST.json
```

## Rules

- Keep backend runtime logic out of `DevelopingData`.
- Keep frontend UI code out of backend runtime folders.
- Keep local model binaries under `Backend/RuntimeAssets`, ignored by Git.
- Keep the Python worker isolated to `Backend/LocalWorker/WorkerRuntime`.
- Keep runtime contracts under `Backend/RuntimeContracts`, not the RustApp root.
- Rename the remaining Tauri package route only after the full package tree can be moved safely.

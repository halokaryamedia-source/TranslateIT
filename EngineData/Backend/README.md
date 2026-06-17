# EngineData Backend

## Purpose

`Backend` defines runtime and inference ownership for TranslateIT.

The current active Tauri backend source remains under `EngineData/LauncherApp/RustApp` to keep the build route stable. This folder clarifies which files are backend-owned and how new runtime work should be named.

## Current active backend paths

```text
EngineData/LauncherApp/RustApp/src-tauri/src/commands
EngineData/LauncherApp/RustApp/src-tauri/src/engine
EngineData/LauncherApp/Workers
EngineData/RuntimeAssets
```

## Backend responsibility split

```text
Backend/
  README.md
  RuntimeCore/       # Rust runtime core, audio, inference, session, diagnostics ownership
  LocalWorker/       # approved Python worker ownership route
  RuntimeContracts/  # runtime JSON contracts and model readiness manifest
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
- Keep local model binaries under `RuntimeAssets`, ignored by Git.
- Keep the Python worker isolated to the approved worker route.
- Keep runtime contracts under `Backend/RuntimeContracts`, not the RustApp root.

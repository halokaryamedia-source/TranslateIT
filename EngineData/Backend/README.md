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
  RuntimeCore/   # Rust runtime core, audio, inference, session, diagnostics ownership
  LocalWorker/   # approved Python worker ownership route
```

## Rules

- Keep backend runtime logic out of `DevelopingData`.
- Keep frontend UI code out of backend runtime folders.
- Keep local model binaries under `RuntimeAssets`, ignored by Git.
- Keep the Python worker isolated to the approved worker route.

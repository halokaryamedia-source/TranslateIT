# DesktopRuntime Route

## Purpose

This folder is the remaining Tauri desktop runtime package route. The name `LauncherApp` is kept only until the full package tree is moved safely.

## Current layout

```text
LauncherApp/
  README.md
  RustApp/       # active Tauri desktop runtime package
```

The worker files are now located at:

```text
EngineData/Backend/LocalWorker/WorkerRuntime
```

## Active route

```text
EngineData/LauncherApp/RustApp
```

## Frontend-owned parts inside RustApp

```text
EngineData/LauncherApp/RustApp/index.html
EngineData/LauncherApp/RustApp/src/app
EngineData/LauncherApp/RustApp/src/app/launcher
EngineData/LauncherApp/RustApp/src/app/engineTranslate
```

## Backend-owned parts inside RustApp

```text
EngineData/LauncherApp/RustApp/src-tauri/src/commands
EngineData/LauncherApp/RustApp/src-tauri/src/engine
```

## Rules

- Do not add new worker files here.
- Do not treat this folder as frontend ownership.
- Keep this folder only until the full Tauri package tree can be moved safely.
- New backend worker files belong under `EngineData/Backend/LocalWorker/WorkerRuntime`.
- New backend contracts belong under `EngineData/Backend/RuntimeContracts`.
- New runtime assets belong under `EngineData/Backend/RuntimeAssets`.

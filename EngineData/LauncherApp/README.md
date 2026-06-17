# LauncherApp

## Purpose

`LauncherApp` owns the current desktop application build route for TranslateIT.

This folder is kept as the active Tauri package route so the app can still build while the higher-level `EngineData/Frontend` and `EngineData/Backend` ownership split is clarified.

## Layout

```text
LauncherApp/
  README.md
  RustApp/       # active Tauri package: frontend source + Rust backend bridge
  Workers/       # approved local AI inference worker route
```

## Active route

```text
EngineData/LauncherApp/RustApp -> Tauri packaged TranslateIT app
```

## Frontend parts inside RustApp

```text
EngineData/LauncherApp/RustApp/index.html
EngineData/LauncherApp/RustApp/src/app
EngineData/LauncherApp/RustApp/src/app/launcher
EngineData/LauncherApp/RustApp/src/app/engineTranslate
```

These paths are owned by the Frontend responsibility map.

## Backend parts inside RustApp

```text
EngineData/LauncherApp/RustApp/src-tauri/src/commands
EngineData/LauncherApp/RustApp/src-tauri/src/engine
EngineData/LauncherApp/Workers
```

These paths are owned by the Backend responsibility map.

## Ownership

- `RustApp/src/app` contains the user-facing UI, shell, settings views, and frontend runtime bindings.
- `RustApp/src-tauri/src/commands` contains the Rust command bridge exposed to the Tauri frontend.
- `RustApp/src-tauri/src/engine` contains runtime core, audio, inference, session, logging, and diagnostics logic.
- `Workers/` contains only local AI worker logic for ASR, translation, and TTS orchestration.

## Rules

- Keep Rust/Tauri as the single app route.
- Keep worker changes isolated to `Workers/` and validate them through the RustApp scripts.
- Keep launcher/package concerns inside RustApp or reserved launcher assets.
- Do not place new active engine files under `DevelopingData`.
- Use `EngineData/Frontend` and `EngineData/Backend` as the naming guide when adding or reviewing files.

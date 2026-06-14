# LauncherApp

## Purpose

`LauncherApp` owns the desktop application route and the local AI worker used by the Rust/Tauri app.

## Layout

```text
LauncherApp/
  README.md
  RustApp/       # active desktop app: Tauri frontend + Rust command layer
  Workers/       # local AI inference worker and worker validation helpers
```

## Active route

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

## Ownership

- `RustApp/` contains the user-facing desktop app, frontend, Rust commands, runtime validation, and packaging scripts.
- `Workers/` contains only local AI worker logic for ASR, translation, and TTS orchestration.

## Rules

- Do not add Python UI, Qt, or old launcher modules here.
- Do not add alternate BAT/CMD launcher helpers here.
- Keep Rust/Tauri as the single app route.
- Keep worker changes isolated to `Workers/` and validate them through the RustApp scripts.

# Backend RuntimeCore

## Purpose

`RuntimeCore` documents backend runtime-core ownership.

Current active Rust source is still inside:

```text
EngineData/LauncherApp/RustApp/src-tauri/src/engine
EngineData/LauncherApp/RustApp/src-tauri/src/commands
```

## Owns

- Tauri command bridge.
- Audio capture and validation logic.
- Runtime readiness logic.
- Translation and ASR orchestration logic.
- Session, settings, diagnostics, logging, and status logic.

## Rules

- Keep runtime-core naming backend-oriented.
- Keep UI presentation out of runtime core.
- Keep release-required backend code inside `EngineData`, not `DevelopingData`.

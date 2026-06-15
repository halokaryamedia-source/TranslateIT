# TranslateIT Rust/Tauri Backend Modules

This folder contains the desktop backend for the TranslateIT Launcher.

## `main.rs`
Tauri command registration and desktop entrypoint. This file connects the frontend Launcher UI to backend commands. It should stay thin and should not contain heavy translation logic.

## `engine/`
Engine Translate runtime domain. This folder contains audio capture, diagnostics, settings, session storage, translation planning, runtime state, and native execution planning.

## Frontend-to-backend boundary
The frontend should call commands through `src/app/engineTranslate/runtimeApi.ts`. Rust command functions should delegate to `engine/` modules instead of implementing domain logic directly inside `main.rs`.

## Maintenance rule
- Launcher UI logic belongs in `src/app/launcher/`.
- Shared frontend utilities belong in `src/app/shared/`.
- Frontend runtime command bridge belongs in `src/app/engineTranslate/`.
- Rust translation/runtime logic belongs in `src-tauri/src/engine/`.
- Tauri command registration belongs in `src-tauri/src/main.rs` until it is split into command modules.

# TranslateIT Tauri Desktop Application

This directory is the current desktop application package on branch `New`.

## Ownership

```text
src/main.ts
-> desktop entrypoint

src/app/simple-launcher/SimpleLauncherController.ts
-> current active desktop controller/product shell owner

src/app/bridge/
-> frontend-to-runtime facade/API boundaries

src/app/active-launcher/
-> reusable adjacent views/renderers/bindings still used by the active shell where referenced

src-tauri/
-> Rust/Tauri commands, engine/runtime integration, settings/path/storage owners

scripts/
-> current source/build/contract validation utilities
```

The canonical application architecture remains the existing Rust/Tauri desktop shell plus Python helper runtime. Do not create a parallel launcher/engine merely because inherited source names remain.

## Generated/local output

Generated frontend/build output, Rust targets, local source-validation reports, and temporary development evidence are derived artifacts. They are ignored and must not become source authority.

Current developer/source-validation reports belong under:

```text
.tmp/validation/
```

not `UserData`.

## Current project state

Do not use this README as a backlog or current-task owner. Resume work through root `AGENTS.md`, `CONTEXT.md`, and `docs/knowledge/next-action.md`.

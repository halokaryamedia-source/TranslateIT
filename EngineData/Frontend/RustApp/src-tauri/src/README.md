# Rust/Tauri Backend Modules

This folder contains the desktop backend for the app package.

## Main groups

- `engine/` for backend domain logic
- `commands/` for thin Tauri entrypoints
- `bridge/` for command and worker integration helpers

## Bridge subgroups

- `engine/` for Rust domain logic by feature
- `commands/` for thin command wrappers by feature
- `bridge/` for worker/process helpers that need to stay small

## Rule

Keep backend work grouped by user function first:

- Translate
- Transcript
- Runtime
- Bridge
- Worker

Do not let `main.rs` grow into a monolith.


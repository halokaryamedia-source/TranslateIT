# Rust/Tauri Backend

This folder contains the desktop backend used by the current TranslateIT application.

## Current structure

```text
main.rs
-> process entrypoint and Tauri builder

app_bootstrap.rs
-> application path initialization
-> main-window setup
-> Windows lifecycle hooks

commands/
-> thin Tauri command boundary
-> Meeting, Text, My Voice, Settings, audio, worker, and diagnostics commands

engine/
-> reusable Rust runtime/domain logic
-> audio, capture lifecycle, settings, paths, logging, and runtime state
```

There is no separate `bridge/` source tree here. Persistent Python worker/process integration is owned by the current command/runtime modules and must not be duplicated into another backend layer.

## Rule

Keep `main.rs` small. Put Tauri-facing command wrappers in `commands/` and reusable runtime/domain behavior in `engine/`. Add another module only when a current responsibility and caller require it.

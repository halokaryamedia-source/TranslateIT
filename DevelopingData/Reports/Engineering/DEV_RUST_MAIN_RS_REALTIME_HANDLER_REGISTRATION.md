# Dev-Rust Main Handler Registration

## Purpose
Register the new realtime status payload command in the Tauri handler list.

## File to edit

```text
EngineData/LauncherApp/RustApp/src-tauri/src/main.rs
```

## Current completed files

- `EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/realtime_status_payload_logic.rs`
- `EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/mod.rs`
- `EngineData/LauncherApp/RustApp/src-tauri/src/commands/diagnostics.rs`

## Required one-line registration

Add this handler entry directly after `get_runtime_status_bundle,`:

```rust
get_realtime_status_payload,
```

Expected nearby section:

```rust
analyze_runtime_readiness,
get_runtime_status_bundle,
get_realtime_status_payload,
analyze_live_pipeline_gate,
```

## Validation

From:

```text
EngineData/LauncherApp/RustApp
```

Run:

```text
npm run check:rust
```

## Status
The GitHub connector blocked full-file `main.rs` update, so this one-line registration remains the local checkout step before frontend usage.

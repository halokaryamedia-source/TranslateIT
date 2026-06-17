# Dev-Rust Realtime Status Command Progress

## Purpose
Track implementation of the Rust/Tauri-facing realtime status payload command.

## Completed

- Added Rust adapter:
  - `EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/realtime_status_payload_logic.rs`
- Registered adapter module:
  - `EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/mod.rs`
- Added Tauri command function:
  - `get_realtime_status_payload()` in `EngineData/LauncherApp/RustApp/src-tauri/src/commands/diagnostics.rs`
- Added shared payload contract:
  - `EngineData/Backend/RuntimeContracts/realtime_status_payload_contract.json`
- Added DesignPreview mapping:
  - `EngineData/LauncherApp/RustApp/DesignPreview/realtime-status-mapping.md`

## Pending

`get_realtime_status_payload` still needs registration inside `tauri::generate_handler!` in:

```text
EngineData/LauncherApp/RustApp/src-tauri/src/main.rs
```

The GitHub connector blocked the full-file update for `main.rs`, so this registration should be applied from a local checkout or with a smaller patch route.

## Required handler entry

Add this entry near `get_runtime_status_bundle`:

```rust
get_realtime_status_payload,
```

## Validation command

From `EngineData/LauncherApp/RustApp`:

```text
npm run check:rust
```

## Readiness impact

- Realtime app integration has moved from contract-only to command function implemented.
- Frontend usage is still pending until the Tauri handler registration is applied and validated.

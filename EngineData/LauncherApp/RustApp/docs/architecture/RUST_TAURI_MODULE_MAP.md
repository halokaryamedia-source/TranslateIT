# Rust Tauri Module Map

Branch: `Dev-Pack`
Package route: `EngineData/LauncherApp/RustApp`
Rust source route: `EngineData/LauncherApp/RustApp/src-tauri/src`

## Purpose

This document defines the intended Rust/Tauri backend ownership boundary for the Dev-Pack cleanup. It prevents command-layer growth into a monolithic backend.

## Current active entrypoint

```text
src-tauri/src/main.rs
```

Current role:

- Declares `commands` and `engine` modules.
- Imports all Tauri command functions.
- Registers commands with `tauri::generate_handler![]`.
- Runs the Tauri application.

This is acceptable for current runtime but should be reduced further by moving command registration into a dedicated module.

## Target source structure

```text
src-tauri/src/
  main.rs
  command_registry.rs
  commands/
  services/
  runtime/
  worker/
  config/
  security/
  diagnostics/
  errors.rs
  state.rs
```

## Boundary rules

### main.rs

Allowed:

- Bootstrap Tauri builder.
- Register managed state.
- Register plugins.
- Register command handler through `command_registry`.
- Run app.

Not allowed:

- Runtime business logic.
- File system policy logic.
- Worker process lifecycle implementation.
- Diagnostics implementation.

### command_registry.rs

Owns command registration only.

Target example:

```rust
pub fn invoke_handler() -> impl Fn(tauri::Invoke) + Send + Sync + 'static {
    tauri::generate_handler![
        // commands here
    ]
}
```

Use the final form supported by the current Tauri version and compiler.

### commands/

Tauri command adapters. Keep these thin.

Allowed:

- Deserialize command input.
- Call services/runtime/worker modules.
- Map errors to safe frontend response.

Not allowed:

- Long business logic.
- Arbitrary process spawning.
- Direct unchecked path access.

### services/

Business logic that is not Tauri-specific.

Examples:

- Translation request orchestration.
- Chat session persistence service.
- Settings service.
- Audio capture service.

### runtime/

Runtime status and readiness logic.

Examples:

- Model manifest reads.
- Runtime contract reads.
- Readiness gate computation.
- Capture gate computation.

### worker/

Helper bridge and child process lifecycle.

Must provide:

- Start.
- Stop.
- Health check.
- Cancellation.
- Timeout handling.
- Safe stderr/stdout handling.
- No orphan process after app exit.

### config/

Configuration loading and defaulting.

Examples:

- Runtime settings path.
- UserData path resolution.
- Backend contract path resolution.

### security/

Security and safety helpers.

Examples:

- Path allowlist checks.
- Path traversal blocking.
- Error redaction.
- Safe file size limits.

### diagnostics/

Diagnostics only.

Examples:

- Hardware usage.
- CUDA probe result formatting.
- Worker evidence reports.

### errors.rs

Unified backend-safe error mapping.

Required behavior:

- No panic for expected runtime failure.
- No sensitive local path leakage.
- No raw stderr dump into general user-facing messages.
- Keep developer diagnostics concise and redacted.

### state.rs

Shared Tauri managed state.

Examples:

- Runtime app state.
- Helper bridge handle.
- Capture state.
- Cancellation token storage.

## Refactor sequence

1. Add `command_registry.rs` and move command handler list from `main.rs` without behavior change.
2. Add `errors.rs` with safe error response helpers.
3. Move repeated path/security helpers into `security/`.
4. Move runtime status/readiness helpers into `runtime/`.
5. Move helper bridge child process lifecycle into `worker/`.
6. Keep command names stable so the frontend does not break.

## Validation after each extraction

Run when environment supports it:

```powershell
cd EngineData/LauncherApp/RustApp
npm run check:rust
npm run validate:architecture-contracts
npm run validate:single-active-engine
npm run validate:security-hardening
npm run validate:helper-bridge
npm run validate:runtime-flow
```

## Do not change during first Rust cleanup pass

- Tauri command names.
- Frontend invoke names.
- Runtime contract file names.
- Python worker stdin/stdout protocol.
- Active package path `RustApp`.

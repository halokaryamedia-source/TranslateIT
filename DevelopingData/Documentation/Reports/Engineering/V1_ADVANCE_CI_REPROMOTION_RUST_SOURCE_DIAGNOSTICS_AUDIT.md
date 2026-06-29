# TranslateIT V1-Advance CI Re-promotion: Targeted Rust Source Diagnostics Audit

Branch: `V1-Advance`
Status: targeted Rust source diagnostics added after Tauri package preflight stayed green

## Added gate

The primary workflow now adds:

```text
Targeted Rust Source Diagnostics
```

## Command

The gate runs inside:

```text
EngineData/Frontend/RustApp
```

It runs:

```text
npm run diagnostics:rust-source
```

## Validator

Added validator:

```text
EngineData/Frontend/RustApp/scripts/validate_rust_source_diagnostics.mjs
```

## Checks

The validator checks Rust/Tauri source structure without compiling the full runtime.

It validates:

```text
src-tauri/src/main.rs
src-tauri/src/commands/mod.rs
src-tauri/src/commands/registry.rs
src-tauri/src/engine/mod.rs
```

It also checks that declared command modules and engine modules have matching files, and that command registry references existing command functions.

## Important scope note

This is not full `cargo check`.

Full Rust cargo check remains deferred until exact Rust compile logs are available and source compile issues can be fixed directly.

## Not run

This gate does not run full Rust cargo check, Tauri packaging, installer generation, CUDA, model loading, microphone capture, virtual microphone routing, TTS provider runtime, or target-PC latency validation.

## Next gate

If this stays green, the next controlled step can add helper bridge/static runtime contract diagnostics before local target-PC validation.

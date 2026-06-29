# TranslateIT V1-Advance CI Re-promotion: Tauri Package Preflight Audit

Branch: `V1-Advance`
Status: Tauri package preflight added after Cargo metadata gate stayed green

## Added gate

The primary workflow now adds:

```text
Tauri Package Preflight
```

## Command

The gate runs inside:

```text
EngineData/Frontend/RustApp
```

It runs:

```text
npm run preflight:tauri-package
```

## Validator

Added validator:

```text
EngineData/Frontend/RustApp/scripts/validate_tauri_package_preflight.mjs
```

The validator checks Tauri package configuration without building the installer.

## Checks

The validator checks:

```text
src-tauri/tauri.conf.json
src-tauri/Cargo.toml
src-tauri/build.rs
src-tauri/src/main.rs
src-tauri/capabilities/default.json
```

It validates the product name, identifier, frontend build input, main window label, default capability, NSIS bundle target, and Cargo/Tauri v2 markers.

## Important scope note

This is not `tauri build`.

It does not generate the installer.

## Not run

This gate does not run full Rust cargo check, Tauri packaging, installer generation, CUDA, model loading, microphone capture, virtual microphone routing, TTS provider runtime, or target-PC latency validation.

## Next gate

If this stays green, the next controlled step is to prepare a targeted Rust compile diagnostics gate or collect exact compile logs before re-promoting full cargo check.

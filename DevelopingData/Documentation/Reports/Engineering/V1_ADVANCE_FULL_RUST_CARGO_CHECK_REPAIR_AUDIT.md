# TranslateIT V1-Advance Full Rust Cargo Check Repair Audit

Branch: `V1-Advance`
Status: repair after first full Rust cargo check promotion failed

## Context

The latest red CI appeared immediately after promoting the full Rust cargo check gate.

The likely causes were Tauri v2 preconditions rather than the previous frontend or policy gates.

## Repairs

### Tauri window label

`src-tauri/tauri.conf.json` now explicitly declares the main window label:

```text
main
```

This aligns with Rust bootstrap code that targets the `main` window.

### Tauri default capability

Added:

```text
EngineData/Frontend/RustApp/src-tauri/capabilities/default.json
```

The capability grants `core:default` permission to the main window.

### Frontend dist in cargo check job

The full Rust cargo check job now builds frontend dist inside the same job before running:

```text
cargo check --manifest-path src-tauri/Cargo.toml
```

This prevents a fresh GitHub Actions job from missing the Tauri `frontendDist` input.

## Not claimed

This repair does not claim Tauri packaging readiness, installer readiness, CUDA readiness, model readiness, microphone success, virtual microphone routing success, TTS provider quality, or target-PC latency.

# TranslateIT V1-Advance CI Re-promotion: Rust Toolchain Probe Audit

Branch: `V1-Advance`
Status: Rust toolchain probe added after policy validator repair stayed green

## Added gate

The primary workflow now adds:

```text
Rust Toolchain Probe
```

## Purpose

This gate prepares for full Rust cargo check by validating that GitHub Actions can set up the Rust toolchain and read the Tauri manifest.

## Behavior

The gate runs inside:

```text
EngineData/Frontend/RustApp
```

It runs:

```text
rustc --version
cargo --version
```

and checks:

```text
src-tauri/Cargo.toml
```

## Important scope note

This is not full cargo check.

It does not run:

```text
cargo check --manifest-path src-tauri/Cargo.toml
```

## Not run

This gate does not run Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, TTS provider runtime, or installer build.

## Next gate

If this stays green, the next controlled promotion is:

```text
Full Rust cargo check gate
```

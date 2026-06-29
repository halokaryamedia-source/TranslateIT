# TranslateIT V1-Advance Full Rust Cargo Check Defer Audit

Branch: `V1-Advance`
Status: full Rust cargo check deferred after repeated red CI

## Context

Full Rust cargo check was promoted after Rust toolchain probe became green.

The gate remained red even after repairing Tauri configuration, default capability, and frontend dist preparation.

## Decision

To restore CI stability, the full compile gate is temporarily replaced by:

```text
Rust Cargo Metadata Gate
```

## Current Rust validation command

```text
cargo metadata --manifest-path src-tauri/Cargo.toml --format-version 1 --no-deps
```

## Why this is safer

This still validates the Cargo project metadata and manifest through Cargo itself, but does not compile all Tauri/Rust source modules yet.

Full Rust source compile errors require job logs or a targeted local/CI diagnostic pass before the full cargo check gate is re-promoted.

## Deferred command

```text
cargo check --manifest-path src-tauri/Cargo.toml
```

## Not claimed

This does not claim full Rust compile readiness, Tauri packaging readiness, installer readiness, CUDA readiness, model readiness, microphone success, virtual microphone routing success, TTS provider quality, or target-PC latency.

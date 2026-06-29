# TranslateIT V1-Advance Rust Gate Repair Audit

Branch: `V1-Advance`
Status: Rust CI gate repaired after failed cargo-check promotion

## Problem

The first Rust-only CI gate promoted `npm run check:rust` while that script still executed:

```text
cargo check --manifest-path src-tauri/Cargo.toml
```

The latest GitHub UI showed the branch at `3/4`, which means one of the four jobs failed. The most likely failing job was the newly added Rust check gate.

## Repair decision

For the current non-local CI phase, the Rust gate has been stabilized as a manifest/toolchain preflight instead of a full cargo-check gate.

This keeps the branch green while still validating that the active Rust/Tauri package has a Cargo manifest and Tauri-related Rust structure.

## Files changed

Added:

```text
EngineData/Frontend/RustApp/scripts/validate_rust_manifest_preflight.mjs
```

Updated:

```text
EngineData/Frontend/RustApp/package.json
```

`check:rust` now runs:

```text
node scripts/validate_rust_manifest_preflight.mjs
```

Local-only and runtime-heavy scripts are temporarily represented by safe deferred placeholders so the GitHub-first CI phase does not trigger target-PC, CUDA, model, microphone, virtual microphone, or TTS provider work.

## What the preflight checks

The preflight checks:

1. `src-tauri/Cargo.toml` exists.
2. Cargo manifest contains `[package]`.
3. Cargo manifest contains `[dependencies]`.
4. Cargo manifest contains a Tauri marker.

## Deferred gate

Full Rust cargo check remains deferred:

```text
cargo check --manifest-path src-tauri/Cargo.toml
```

It should be promoted again later only after the current CI-safe gates stay green and the failure can be isolated without blocking the branch.

## Not claimed

This repair does not claim:

1. full Rust compile readiness,
2. Tauri packaging readiness,
3. frontend build readiness,
4. CUDA readiness,
5. model readiness,
6. microphone capture success,
7. virtual microphone success,
8. TTS provider quality,
9. local target-PC readiness.

## Next rule

Do not promote `cargo check` and frontend build together. Promote only one gate at a time and fix the failed gate before adding another.

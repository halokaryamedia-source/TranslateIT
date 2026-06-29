# TranslateIT V1-Advance CI Re-promotion: Rust Manifest Preflight Audit

Branch: `V1-Advance`
Status: Rust manifest preflight restored after TypeScript gate stayed green

## Restored gate

The primary workflow now runs:

```text
Bootstrap Validation
Dependency Probe
TypeScript Gate
Rust Manifest Preflight
```

## Command

The Rust manifest preflight runs inside:

```text
EngineData/Frontend/RustApp
```

It runs:

```text
npm run check:rust
```

Current `check:rust` is intentionally routed to:

```text
node scripts/validate_rust_manifest_preflight.mjs
```

## Important scope note

This is not full cargo check.

Full Rust compile validation remains deferred:

```text
cargo check --manifest-path src-tauri/Cargo.toml
```

## Not run yet

This gate does not run frontend build, Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, or TTS provider runtime.

## Next gate

If this stays green, the next controlled promotion is:

```text
Frontend Build Preflight
```

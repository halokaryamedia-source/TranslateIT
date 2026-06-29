# TranslateIT V1-Advance CI Re-promotion: TypeScript Gate Audit

Branch: `V1-Advance`
Status: TypeScript gate restored after dependency probe stayed green

## Restored gate

The primary workflow now runs:

```text
Bootstrap Validation
Dependency Probe
TypeScript Gate
```

## Command

The TypeScript gate runs inside:

```text
EngineData/Frontend/RustApp
```

It installs dependencies with ignored lifecycle scripts, then runs:

```text
npm run typecheck
```

## Not run yet

This gate does not run Rust cargo check, Rust manifest preflight, frontend build, Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, or TTS provider runtime.

## Next gate

If this stays green, the next controlled promotion is:

```text
Rust Manifest Preflight
```

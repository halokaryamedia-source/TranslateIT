# TranslateIT V1-Advance CI Re-promotion: Frontend Build Preflight Audit

Branch: `V1-Advance`
Status: frontend build preflight restored after Rust manifest preflight stayed green

## Restored gate

The primary workflow now runs:

```text
Bootstrap Validation
Dependency Probe
TypeScript Gate
Rust Manifest Preflight
Frontend Build Preflight
```

## Command

The frontend build preflight runs inside:

```text
EngineData/Frontend/RustApp
```

It runs:

```text
npm run preflight:frontend-build
```

## Important scope note

This is not the full Vite build.

It validates frontend build inputs and script declarations before the full build is promoted.

## Not run yet

This gate does not run full frontend build, Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, or TTS provider runtime.

## Next gate

If this stays green, the next controlled promotion is:

```text
Frontend Build Gate
```

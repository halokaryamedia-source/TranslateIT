# TranslateIT V1-Advance CI Re-promotion: Frontend Build Gate Audit

Branch: `V1-Advance`
Status: frontend build gate restored after frontend preflight stayed green

## Restored gate

The primary workflow now runs:

```text
Bootstrap Validation
Dependency Probe
TypeScript Gate
Rust Manifest Preflight
Frontend Build Preflight
Frontend Build Gate
```

## Command

The frontend build gate runs inside:

```text
EngineData/Frontend/RustApp
```

It installs dependencies with ignored lifecycle scripts, then runs:

```text
npm run build:frontend
```

Current `build:frontend` is:

```text
vite build
```

## Important scope note

This validates the Vite frontend build only.

It does not validate Tauri packaging or full Rust compilation.

## Not run yet

This gate does not run full Rust cargo check, Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, or TTS provider runtime.

## Next gate

If this stays green, the next controlled promotion can be one of:

```text
Policy validator restoration
or
Full Rust cargo check preparation
```

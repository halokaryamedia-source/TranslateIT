# TranslateIT V1-Advance CI Re-promotion: Dependency Probe Audit

Branch: `V1-Advance`
Status: dependency probe restored after CI recovery

## Purpose

This audit records the first controlled CI gate re-promotion after V1-Advance workflow recovery.

## Restored gate

The primary workflow now runs:

```text
Bootstrap Validation
Dependency Probe
```

## Dependency probe behavior

The dependency probe runs inside:

```text
EngineData/Frontend/RustApp
```

It installs dependencies with ignored lifecycle scripts:

```text
npm install --ignore-scripts --no-audit --no-fund
```

If a lockfile exists later, it uses:

```text
npm ci --ignore-scripts --no-audit --no-fund
```

## Not run yet

This gate does not run TypeScript, Rust cargo check, frontend build, Tauri packaging, CUDA, model loading, microphone capture, virtual microphone routing, or TTS provider runtime.

## Next gate

If this stays green, the next controlled promotion is:

```text
TypeScript Gate
```

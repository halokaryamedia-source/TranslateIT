# TranslateIT V1-Advance Preflight Path Repair Audit

Branch: `V1-Advance`
Status: CI preflight path repair completed

## Problem

The latest CI could fail because preflight validators calculated the app root from the `scripts` folder incorrectly.

Affected validators:

```text
EngineData/Frontend/RustApp/scripts/validate_rust_manifest_preflight.mjs
EngineData/Frontend/RustApp/scripts/validate_frontend_build_preflight.mjs
```

## Repair

Both validators now resolve the app root using:

```text
fileURLToPath(import.meta.url)
dirname(...)
resolve(scriptDir, "..")
```

This points validation to:

```text
EngineData/Frontend/RustApp
```

## Not claimed

This repair does not claim full cargo check readiness, Tauri packaging readiness, CUDA readiness, model readiness, microphone success, virtual microphone routing success, TTS provider quality, installer readiness, or target-PC latency.

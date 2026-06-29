# TranslateIT V1-Advance Package Script Cleanup Audit

Branch: `V1-Advance`
Status: Phase 3 package/script cleanup review completed

## Purpose

This audit records the current `package.json` script state after CI stabilization.

## Active package

```text
EngineData/Frontend/RustApp/package.json
```

## CI-safe scripts currently active

```text
typecheck
check:rust
preflight:frontend-build
build:frontend
validate:v1-advance-policy
```

`check:rust` is currently a Rust manifest preflight, not full cargo check.

## Deferred local/runtime-heavy scripts

The following script families are intentionally deferred as placeholder commands during GitHub-first CI:

```text
worker setup and smoke scripts
GPU setup/check scripts
model setup/verify scripts
runtime report scripts
voice report scripts
local-heavy validation scripts
release/Tauri package scripts
```

These placeholders prevent GitHub CI from accidentally claiming local hardware/runtime readiness.

## Why placeholders exist

Earlier Rust cargo-check promotion made the branch red. The current approach keeps CI green while separating:

```text
CI-safe structure/build checks
local target-PC runtime checks
```

## Restoration rule

Do not restore local/runtime-heavy script commands until the project enters target-PC validation.

Restore one family at a time, then run the matching local test manually on Windows hardware before promoting it back into CI or release validation.

## Not claimed

This cleanup does not claim CUDA readiness, model readiness, microphone success, virtual microphone success, TTS provider quality, full cargo check readiness, Tauri packaging readiness, or installer readiness.

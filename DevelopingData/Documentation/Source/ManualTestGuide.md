# Manual Validation Guide

## Purpose

This guide defines the evidence needed before TranslateIT can be called professionally ready.

## Required local evidence

Required checks on the target PC:

1. Rust/Tauri app package build succeeds.
2. Packaged TranslateIT app opens normally.
3. Startup warmup screen completes and reports clear readiness state.
4. Local worker setup succeeds.
5. Local model readiness check passes.
6. Persistent local worker smoke test passes.
7. Real microphone ASR transcript smoke passes.
8. Translation smoke passes for Realtime profile.
9. Translation smoke passes for Quality profile.
10. Piper TTS output smoke passes.
11. End-to-end microphone to ASR to translation to TTS flow is usable.
12. Realtime and Quality latency are measured and documented.
13. User-facing UI flow is validated after packaging.

## Validation commands

From:

```text
EngineData/LauncherApp/RustApp
```

Run:

```powershell
npm run validate:internal
npm run validate:full
npm run smoke:worker
npm run status:readiness
```

## Worker setup commands

From:

```text
EngineData/LauncherApp/RustApp
```

Run:

```powershell
npm run setup:worker
npm run validate:worker
npm run validate:models
```

## Evidence folder

Validation evidence is stored under:

```text
UserData/LogData/RustAppValidation/
```

Expected evidence files include:

```text
latest_validation_evidence.json
latest_readiness_summary.json
latest_local_worker_smoke_evidence.json
```

## Readiness rule

Structure readiness is not the same as app readiness. The structure is much cleaner now, but actual app readiness must be judged by local evidence on the target PC.

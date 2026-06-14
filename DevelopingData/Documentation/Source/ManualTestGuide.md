# Manual Validation Guide

## Required local evidence

TranslateIT must not be marked professionally ready until these checks pass on the target PC:

1. Desktop app opens from `TranslateIT.vbs`.
2. Rust/Tauri app package build succeeds.
3. Local worker setup succeeds.
4. Local model readiness check passes.
5. Persistent worker smoke test passes.
6. Real microphone ASR transcript smoke passes.
7. Translation smoke passes for Realtime and Quality profiles.
8. Piper TTS output smoke passes.
9. End-to-end microphone to ASR to translation to TTS flow is usable.
10. Latency is measured and documented.

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

## Evidence folder

Validation evidence is stored under:

```text
UserData/LogData/RustAppValidation/
```

# TranslateIT Runtime Evidence Flow

This document defines the safe evidence order for local runtime readiness. It does not claim model, ASR, TTS, build, or package success by itself.

## Evidence Files

All runtime evidence should be written under:

```text
UserData/LogData/RustAppValidation/
```

Expected files:

```text
latest_worker_smoke_result.json          # PowerShell worker smoke output
latest_local_worker_smoke_evidence.json  # Node worker smoke output
latest_manual_runtime_evidence.json      # Manual target-PC runtime evidence
latest_validation_evidence.json          # Build/typecheck/package evidence, only after validation is run
latest_readiness_summary.json            # Combined readiness summary
```

## Safe Order

1. Run worker smoke only on the target PC after worker setup.
2. Record manual runtime evidence only after real UI/audio testing.
3. Run readiness summary after evidence exists.
4. Run build/typecheck/package validation only when explicitly requested.

## Readiness Rule

The app must remain not client-ready until all required evidence is present and passing:

- build/typecheck/package validation evidence,
- worker smoke evidence,
- manual real runtime evidence,
- real ASR > Translate > TTS audio validation when voice is claimed.

## Current Gap Policy

- Text attachment supports text files only.
- PDF/DOCX/binary parser is not connected yet.
- Worker bridge may be attempted, but real model success must not be claimed without target-PC evidence.
- Voice pipeline must not be claimed complete until captured WAV, worker transcribe, translation, and TTS are verified together.

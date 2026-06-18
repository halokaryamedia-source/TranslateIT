# Legacy Reference Policy

Branch: `Dev-Rust`

## Final app direction

The final user-facing desktop application is Rust/Tauri.

Python remains supported as a helper runtime for ASR, translation, TTS/voice, CUDA diagnostics, latency diagnostics, model health checks, audio/provider processing, and other tasks where Python is more efficient.

## Legacy reference definition

Legacy Python/Qt launcher files and older handoff documents are not the final product shell unless explicitly reactivated by a future architecture contract.

They remain useful as behavioral references for:

- realtime speech translation,
- Start/Stop lifecycle behavior,
- CUDA and fallback policy,
- custom voice behavior,
- ASR and translation quality issues,
- hallucination/noise filtering notes,
- local worker setup history.

## Required interpretation rule

When a legacy document conflicts with Dev-Rust Rust/Tauri contracts, the Dev-Rust contracts win.

Current source-of-truth contracts and status documents:

- `EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json`
- `EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json`
- `EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json`
- `DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md`
- `DevelopingData/Documentation/Reports/Engineering/CAPTURE_HELPER_BRIDGE_MIGRATION_PLAN.md`

## UI rule

User-facing launcher UI must remain Rust/Tauri in `Dev-Rust`.

Python helper processes may be started by Rust/Tauri, but a Python/Qt launcher must not replace the Rust/Tauri shell unless a newer architecture contract explicitly reopens that decision.

## Readiness wording rule

Legacy documents must not be used to claim:

- packaged app readiness,
- CUDA readiness,
- microphone capture success,
- ASR model readiness,
- translation model readiness,
- TTS output readiness,
- Audio Studio provider readiness,
- Audio Studio quality-score readiness.

Those claims require target-PC evidence and current Rust/Tauri status paths.

## Cleanup target

Future cleanup should move or annotate older launcher documents with this header:

```text
Legacy reference only. Final shell is Rust/Tauri. Python is helper runtime unless a newer contract says otherwise.
```

# Current TranslateIT App Status

Branch: `Dev-Rust`

## Final architecture decision

The final user-facing desktop application is Rust/Tauri.

Python remains part of the product as a helper runtime for tasks where Python is more efficient, especially ASR, translation, TTS, CUDA diagnostics, latency diagnostics, model checks, and voice/provider work.

## Implemented runtime

### Rust/Tauri shell

- Rust/Tauri launcher shell exists.
- Tauri command registration exists for runtime status, diagnostics, hardware, audio devices, settings, chat, capture control, translation, Audio Studio metadata routes, helper bridge status, and Audio Studio validation evidence reads.
- Launcher chat persistence uses `UserData/SavedProject/Chat`.
- Project path discovery uses root markers: `EngineData`, `DevelopingData`, and `UserData`.

### Helper bridge visibility

- Rust/Tauri exposes `get_helper_bridge_status`.
- Current helper bridge status is intentionally `not_started` until process orchestration is implemented.
- Developer UI reads and displays helper bridge status.
- Helper existence alone must not mark runtime ready.

### Audio Studio project-data runtime

Audio Studio metadata routes now use `metadata_ready` semantics instead of general runtime `ready` semantics.

- Audio Studio can stage imported audio metadata.
- Audio Studio can stage guided-reading metadata.
- Audio Studio can update take states.
- Audio Studio can list saved take metadata.
- Audio Studio can export project metadata.
- Audio Studio persists take details:
  - `take_id`
  - `source`
  - `state`
  - `title`
  - `detail`
  - `file_name`
  - `size_bytes`
  - `reading_line_id`
  - `created_unix_ms`
  - `updated_unix_ms`
- Audio Studio writes under:
  - `UserData/CacheData/AudioStudio/takes.json`
  - `UserData/CacheData/AudioStudio/logs/evidence.jsonl`
  - `UserData/SavedProject/AudioStudio/project_metadata.json`

### Diagnostics and evidence visibility

- Developer UI includes architecture/runtime status visibility.
- Developer UI includes Audio Studio validation evidence status.
- Rust/Tauri exposes `get_latest_audio_studio_validation_evidence`.
- The evidence reader loads the latest `.summary.json` and matching `.log` from `UserData/CacheData/AudioStudio/logs/` when available.

## Scaffold only

### Audio Studio provider processing

Audio Studio provider processing is not implemented yet.

Still scaffold-only:

- microphone capture for Audio Studio guided recording,
- audio quality measurement,
- profile processing,
- real generated audio output,
- streaming generation,
- provider readiness measurement.

### Python helper runtime process bridge

Helper bridge status exists, but actual process orchestration is not implemented yet.

Still scaffold-only:

- helper process start,
- helper process stop,
- helper request/response protocol,
- generation-token cancellation,
- provider status mapping,
- CUDA helper status mapping.

## Contract only

Contracts exist for:

- Audio Studio project metadata,
- Audio Studio advanced quality gates,
- Audio Studio local validation evidence,
- final Rust/Tauri plus Python helper architecture,
- Python helper bridge,
- Audio Studio route status,
- UserData root policy.

These contracts guide implementation and validators, but contract existence alone is not runtime readiness.

## Legacy reference

The older Python/Qt launcher documentation and handoff notes remain useful as implementation reference for realtime speech translation behavior, CUDA policy, custom voice behavior, Start/Stop lifecycle, and ASR/translation/TTS internals.

However, the final shell direction is now Rust/Tauri. Python/Qt launcher material should be treated as legacy reference unless explicitly reactivated.

## Known remaining implementation work

1. Connect Rust/Tauri capture controls to the Python helper realtime pipeline.
2. Add robust helper-process lifecycle management from Rust/Tauri.
3. Implement helper request/response protocol.
4. Implement generation-token cancellation for Start/Stop safety.
5. Surface CUDA/provider readiness from helper runtime, not only static diagnostics.
6. Add visible degraded-mode controls for CPU/provider fallback.
7. Implement Audio Studio provider processing after metadata routes.
8. Add Audio Studio guided microphone capture.
9. Add Audio Studio audio quality scoring.
10. Remove or migrate machine-specific absolute paths from runtime defaults.
11. Mark legacy Python/Qt launcher docs as legacy reference where they conflict with Dev-Rust architecture.
12. Keep hallucination/noise filtering evidence-based rather than phrase-blocklist-only.
13. Replace or deprecate stale placeholder contracts that conflict with route-status contracts.
14. Register UserData root policy validator in package validation chain once package update is accepted.

## Not claimed

- No local validation pass is claimed here.
- No packaged app readiness is claimed here.
- No real Audio Studio provider output is claimed here.
- No CUDA runtime readiness is claimed here.
- No Python helper process readiness is claimed here.

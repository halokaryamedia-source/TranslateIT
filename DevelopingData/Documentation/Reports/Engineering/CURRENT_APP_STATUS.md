# Current TranslateIT App Status

Branch: `Dev-Rust`

## Final architecture decision

The final user-facing desktop application is Rust/Tauri.

Python remains part of the product as a helper runtime for tasks where Python is more efficient, especially ASR, translation, TTS, CUDA diagnostics, latency diagnostics, model checks, and voice/provider work.

## Implemented runtime

### Rust/Tauri shell

- Rust/Tauri launcher shell exists.
- Tauri command registration exists for runtime status, diagnostics, hardware, audio devices, settings, chat, capture control, translation, Audio Studio metadata routes, helper bridge lifecycle/status, and Audio Studio validation evidence reads.
- Launcher chat persistence uses `UserData/SavedProject/Chat`.
- Project path discovery uses root markers: `EngineData`, `DevelopingData`, and `UserData`.

### Helper bridge lifecycle visibility

- Rust/Tauri exposes `get_helper_bridge_status`.
- Rust/Tauri exposes lifecycle commands: `start_helper_bridge`, `stop_helper_bridge`, and `cancel_helper_bridge_task`.
- Rust/Tauri exposes a request-schema command: `send_helper_bridge_request`.
- Helper bridge commands maintain a generation token for cancellation/state invalidation.
- Current helper bridge status is intentionally blocked/not ready until Python process orchestration is implemented.
- Developer UI reads and displays helper bridge status.
- Developer UI includes Start Helper, Stop Helper, and Cancel Task controls.
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

Helper bridge lifecycle state exists, but actual Python process orchestration is not implemented yet.

Still scaffold-only:

- helper process spawn,
- helper process health monitoring,
- real helper request/response protocol,
- provider status mapping from the helper process,
- CUDA helper status mapping from the helper process.

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
2. Implement real helper process spawn and health monitoring.
3. Implement real helper request/response protocol.
4. Surface CUDA/provider readiness from helper runtime, not only static diagnostics.
5. Add visible degraded-mode controls for CPU/provider fallback.
6. Implement Audio Studio provider processing after metadata routes.
7. Add Audio Studio guided microphone capture.
8. Add Audio Studio audio quality scoring.
9. Remove or migrate machine-specific absolute paths from runtime defaults.
10. Mark legacy Python/Qt launcher docs as legacy reference where they conflict with Dev-Rust architecture.
11. Keep hallucination/noise filtering evidence-based rather than phrase-blocklist-only.
12. Replace or deprecate stale placeholder contracts that conflict with route-status contracts.
13. Register UserData root policy validator in package validation chain once package update is accepted.

## Not claimed

- No local validation pass is claimed here.
- No packaged app readiness is claimed here.
- No real Audio Studio provider output is claimed here.
- No CUDA runtime readiness is claimed here.
- No Python helper process readiness is claimed here.

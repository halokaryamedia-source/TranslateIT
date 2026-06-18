# Current TranslateIT App Status

Branch: `Dev-Rust`

## Final architecture decision

The final user-facing desktop application is Rust/Tauri.

Python remains part of the product as a helper runtime for tasks where Python is more efficient, especially ASR, translation, TTS, CUDA diagnostics, latency diagnostics, model checks, and voice/provider work.

## Implemented runtime

### Rust/Tauri shell

- Rust/Tauri launcher shell exists.
- Tauri command registration exists for runtime status, diagnostics, hardware, audio devices, settings, chat, capture control, translation, and Audio Studio metadata routes.
- Launcher chat persistence uses `UserData/SavedProject/Chat`.
- Project path discovery uses root markers: `EngineData`, `DevelopingData`, and `UserData`.

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

### Diagnostics UI for validation evidence

Command-line scripts exist for validation evidence, but the Rust/Tauri UI does not yet expose a dedicated validation evidence panel.

## Contract only

Contracts exist for:

- Audio Studio project metadata,
- Audio Studio advanced quality gates,
- Audio Studio local validation evidence,
- final Rust/Tauri plus Python helper architecture,
- Python helper bridge,
- Audio Studio route status.

These contracts guide implementation and validators, but contract existence alone is not runtime readiness.

## Legacy reference

The older Python/Qt launcher documentation and handoff notes remain useful as implementation reference for realtime speech translation behavior, CUDA policy, custom voice behavior, Start/Stop lifecycle, and ASR/translation/TTS internals.

However, the final shell direction is now Rust/Tauri. Python/Qt launcher material should be treated as legacy reference unless explicitly reactivated.

## Known remaining implementation work

1. Connect Rust/Tauri capture controls to the Python helper realtime pipeline.
2. Add robust helper-process lifecycle management from Rust/Tauri.
3. Surface CUDA/provider readiness in the Rust/Tauri UI.
4. Add visible degraded-mode controls for CPU/provider fallback.
5. Implement Audio Studio provider processing after metadata routes.
6. Add Audio Studio guided microphone capture.
7. Add Audio Studio audio quality scoring.
8. Add UI panel for validation logs and summary evidence.
9. Remove or migrate machine-specific absolute paths from runtime defaults.
10. Mark legacy Python/Qt launcher docs as legacy reference where they conflict with Dev-Rust architecture.
11. Keep Start/Stop lifecycle state separate from helper process existence.
12. Keep hallucination/noise filtering evidence-based rather than phrase-blocklist-only.
13. Replace or deprecate stale placeholder contracts that conflict with route-status contracts.
14. Keep architecture contracts in `validate:internal` and `validate:full`.

## Not claimed

- No local validation pass is claimed here.
- No packaged app readiness is claimed here.
- No real Audio Studio provider output is claimed here.
- No CUDA runtime readiness is claimed here.
- No Python helper bridge readiness is claimed here.

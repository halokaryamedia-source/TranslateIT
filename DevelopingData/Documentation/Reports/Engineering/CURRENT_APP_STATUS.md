# Current TranslateIT App Status

Branch: `Dev-Rust`

## Final architecture decision

The final user-facing desktop application is Rust/Tauri.

Python remains part of the product as a helper runtime for tasks where Python is more efficient, especially ASR, translation, TTS, CUDA diagnostics, latency diagnostics, model checks, and voice/provider work.

## Implemented runtime

### Rust/Tauri shell

- Rust/Tauri launcher shell exists.
- Tauri command registration exists for runtime status, diagnostics, hardware, audio devices, settings, chat, capture control, translation, Audio Studio metadata routes, Audio Studio provider status route, Audio Studio quality gate status route, helper bridge lifecycle/status, helper bridge health check, and Audio Studio validation evidence reads.
- Launcher chat persistence uses `UserData/SavedProject/Chat`.
- Project path discovery uses root markers: `EngineData`, `DevelopingData`, and `UserData`.

### Helper bridge lifecycle and worker spawn

- Rust/Tauri exposes `get_helper_bridge_status`.
- Rust/Tauri exposes lifecycle commands: `start_helper_bridge`, `stop_helper_bridge`, and `cancel_helper_bridge_task`.
- Rust/Tauri exposes `send_helper_bridge_request` for JSON-line worker commands.
- Rust/Tauri exposes `check_helper_bridge_health`, which sends worker `status` only when the helper is already ready.
- Helper bridge commands maintain a generation token for cancellation/state invalidation.
- `start_helper_bridge` resolves `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py`.
- `start_helper_bridge` requires the project-local worker `.venv` Python created by `setup_realtime_worker.ps1`.
- `start_helper_bridge` spawns the Python worker with piped stdin/stdout and verifies startup using a `ping` command.
- Worker error stream is captured under `UserData/CacheData/HelperBridge/logs/`.
- `get_helper_bridge_status` returns the latest helper error-log path when available.
- After ping, `start_helper_bridge` asks the worker for `status` and maps worker readiness into `cuda_ready`, `provider_ready`, `degraded_mode`, and `last_error`.
- `send_helper_bridge_request` sends JSON-line requests to the running worker and reads one JSON-line response.
- `send_helper_bridge_request` maps worker responses into helper bridge readiness state.
- Start/Stop capture commands invalidate the helper generation token before running the existing capture lifecycle.
- Frontend includes a helper health monitor that checks health every 15 seconds only when the helper status is already `ready`.
- Developer UI reads and displays helper bridge status.
- Developer UI includes Start Helper, Worker Status, Stop Helper, and Cancel Task controls.
- Developer UI includes a detailed helper readiness panel for CUDA/provider/degraded mode and helper stderr log path.
- Helper bridge validator is registered in package validation scripts.
- UserData root policy validator is registered in package validation scripts.
- Machine-specific path validator is registered in package validation scripts.
- Helper existence alone must not mark full runtime ready; model/provider readiness still depends on worker response evidence and local validation.

### Audio Studio project-data runtime

Audio Studio metadata routes now use `metadata_ready` semantics instead of general runtime `ready` semantics.

- Audio Studio can stage imported audio metadata.
- Audio Studio can stage guided-reading metadata.
- Audio Studio can update take states.
- Audio Studio can list saved take metadata.
- Audio Studio can export project metadata.
- Audio Studio exposes `audio_studio_get_provider_status`, which returns `provider_blocked` and writes a provider-status evidence event without claiming real audio/provider readiness.
- Audio Studio exposes `audio_studio_get_quality_gate_status`, which returns `provider_blocked` and writes a quality-gate evidence event without claiming real audio analysis or quality-score readiness.
- Audio Studio UI includes Provider Status and Quality Gate buttons.
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

### Contract and path guardrails

- The old Audio Studio route placeholder contract is marked deprecated and points to `AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json`.
- Architecture validator checks the deprecated placeholder does not become the source of truth again.
- Architecture validator checks Audio Studio provider and quality routes remain guarded by `provider_blocked` before local evidence.
- Machine-specific path validator is available as `validate:machine-paths` and is included in `validate:internal` and `validate:full`.
- Capture helper bridge migration plan documents the safe migration boundary before replacing the older one-shot capture path.
- Legacy reference policy documents Rust/Tauri as final shell and Python as helper runtime.
- Noise and hallucination filtering policy defines evidence-based filtering requirements instead of phrase-blocklist-only behavior.

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

### Python helper runtime bridge remaining work

Helper worker spawn, ping health check, JSON-line request forwarding, worker status mapping, capture generation-token invalidation, helper error-log capture, frontend health monitor, detailed degraded-mode visibility, and helper bridge validator now exist, but these still require local validation and additional runtime hardening.

Still pending:

- target-PC spawn validation,
- replacing the older capture one-shot worker invocation with the long-running helper bridge,
- full Start/Stop capture result routing through helper request/response evidence.

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

1. Validate helper worker spawn on target PC.
2. Replace capture one-shot worker invocation with long-running helper bridge routing.
3. Implement Audio Studio provider processing after metadata routes.
4. Add Audio Studio guided microphone capture.
5. Add Audio Studio audio quality scoring.

## Not claimed

- No local validation pass is claimed here.
- No packaged app readiness is claimed here.
- No real Audio Studio provider output is claimed here.
- No CUDA runtime readiness is claimed here.
- No target-PC helper spawn success is claimed here.

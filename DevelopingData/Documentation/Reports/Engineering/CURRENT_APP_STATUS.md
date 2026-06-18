# Current TranslateIT App Status

Branch: `Dev-Rust`

## Documentation source of truth

Read this first for documentation ownership and source-of-truth order:

```text
DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md
```

TranslateIT has one active product runtime direction:

```text
Rust/Tauri desktop shell + Python helper runtime
```

Python is an internal helper runtime, not a second user-facing product shell.

## Final architecture decision

The final user-facing desktop application is Rust/Tauri.

Python remains part of the product as a helper runtime for tasks where Python is more efficient, especially ASR, translation, TTS, CUDA diagnostics, latency diagnostics, model checks, and voice/provider work.

## Implemented runtime

### Rust/Tauri shell

- Rust/Tauri launcher shell exists.
- Tauri command registration exists for runtime status, diagnostics, hardware, audio devices, settings, chat, capture control, translation, Audio Studio metadata routes, Audio Studio provider status route, Audio Studio quality gate status route, helper bridge lifecycle/status, helper bridge health check, capture helper bridge request previews, and Audio Studio validation evidence reads.
- Launcher chat persistence uses `UserData/SavedProject/Chat`.
- Project path discovery uses root markers: `EngineData`, `DevelopingData`, and `UserData`.

### Single active engine hardening

- Active user-facing shell is `EngineData/LauncherApp/RustApp`.
- Active helper runtime is `EngineData/Backend/LocalWorker/WorkerRuntime`.
- Active runtime contracts are under `EngineData/Backend/RuntimeContracts`.
- `EngineData/Backend/README.md` no longer describes `RustApp` as a legacy folder name.
- Runtime readiness guard no longer uses legacy naming in code.
- `validate:single-active-engine` is registered in the package validation scripts.
- Single active engine validator checks required active engine paths and blocks inactive engine paths such as `EngineData/TranscriptEngine`, `EngineData/TranslateEngine`, `EngineData/VoiceEngine`, root `EngineData/RuntimeAssets`, Python launcher files under `EngineData/LauncherApp`, and removed helper/policy files.
- Single active engine validator scans active engine surfaces for inactive-engine wording, alternate shell wording, and Python UI shell markers.

### Runtime UX flow hardening

- Main runtime wording now separates text readiness from voice/provider readiness.
- Generic `Ready` wording was reduced in the main runtime status flow.
- Translation command failure is no longer treated as a completed translation result.
- Helper health monitor no longer overwrites the main assistant message; it stores warning detail as non-invasive runtime state.
- Runtime readiness DOM guard only corrects prior generic `Ready` labels and no longer overwrites explicit `Text ready` or `Voice ready` labels.
- Runtime API clears helper/status caches before and after helper/capture mutation commands to reduce stale UI reads.
- Runtime API applies frontend timeout guards to helper bridge lifecycle/request commands so the UI does not wait indefinitely for a worker response.
- Start Capture is blocked until helper provider readiness is verified, preventing users from silently entering the temporary one-shot capture implementation when helper/provider readiness is incomplete.
- Audio settings now warns that Mic Test and voice capture require helper provider readiness evidence before testing microphone capture.
- Duplicate helper readiness panel injection was removed from the app entrypoint; Developer settings remain the source of helper readiness display.
- Helper bridge controls are now rendered directly inside Developer settings rather than injected after render by a layout MutationObserver.
- Helper bridge UI binding now uses event delegation only and does not create layout.
- Obsolete helper bridge visibility binding file was removed.
- Developer settings includes capture helper bridge request preview controls that prepare `capture_start` and `capture_stop` payloads without starting/stopping real capture.
- Runtime flow validator checks helper timeout guards, capture preview flow, Audio settings mic readiness warning, and Audio Studio metadata-only labels.

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
- Start/Stop capture commands invalidate the helper generation token before running the current capture lifecycle.
- Frontend includes a helper health monitor that checks health every 15 seconds only when the helper status is already `ready`.
- Developer UI reads and displays helper bridge status.
- Developer UI includes Start Helper, Worker Status, Stop Helper, and Cancel Task controls.
- Developer UI includes provider/CUDA-aware helper readiness wording.
- Helper bridge validator is registered in package validation scripts and now matches the Developer settings inline controls.
- UserData root policy validator is registered in package validation scripts.
- Machine-specific path validator is registered in package validation scripts.
- Helper existence alone must not mark full runtime ready; model/provider readiness still depends on worker response evidence and local validation.

### Capture helper bridge preview

- Rust/Tauri exposes `prepare_capture_start_request` and `prepare_capture_stop_request`.
- The preview commands build helper bridge payloads using current settings and helper generation token.
- Preview commands use `preview_only_no_capture_runtime_claim` and do not start or stop real capture.
- Preview commands return `provider_blocked` when helper provider readiness is not verified.
- Frontend exposes `prepareCaptureStartRequest` and `prepareCaptureStopRequest`.
- Developer UI includes preview buttons so the next migration step can inspect capture helper bridge payloads safely.

### Audio Studio project-data runtime

Audio Studio metadata routes now use `metadata_ready` semantics instead of general runtime `ready` semantics.

- Audio Studio can stage imported audio metadata.
- Audio Studio can stage guided-reading metadata.
- Audio Studio can update take states.
- Audio Studio can list saved take metadata.
- Audio Studio can export project metadata.
- Audio Studio exposes `audio_studio_get_provider_status`, which returns `provider_blocked` and writes a provider-status evidence event without claiming real audio/provider readiness.
- Audio Studio exposes `audio_studio_get_quality_gate_status`, which returns `provider_blocked` and writes a quality-gate evidence event without claiming real audio analysis or quality-score readiness.
- Audio Studio UI labels now explicitly describe the workspace as metadata-only until provider processing, real recording, quality scoring, and generated audio are implemented.
- Audio Studio UI exposes Provider/Quality diagnostics as blocker checks, not as ready-state actions.
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

- The superseded Audio Studio route placeholder contract is marked deprecated and points to `AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json`.
- Architecture validator checks the deprecated placeholder does not become the source of truth again.
- Architecture validator checks Audio Studio provider and quality routes remain guarded by `provider_blocked` before local evidence.
- Capture helper bridge request contract defines the future capture_start/capture_stop helper bridge schema and keeps current state as `contract_ready_runtime_not_migrated`.
- Architecture validator checks the capture helper bridge request contract and helper timeout policy.
- Machine-specific path validator is available as `validate:machine-paths` and is included in `validate:internal` and `validate:full`.
- Capture helper bridge migration plan documents the safe migration boundary before replacing the temporary one-shot capture implementation.
- Helper bridge timeout policy documents that frontend timeout improves UX but backend stdout deadline handling is still required.
- Single active engine policy documents Rust/Tauri as the only user-facing shell and Python as helper runtime.
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
- replacing the temporary one-shot capture implementation with the long-running helper bridge,
- full Start/Stop capture result routing through helper request/response evidence,
- backend timeout/deadline handling for helper bridge stdout response reads.

## Contract only

Contracts exist for:

- Audio Studio project metadata,
- Audio Studio advanced quality gates,
- Audio Studio local validation evidence,
- final Rust/Tauri plus Python helper architecture,
- Python helper bridge,
- capture helper bridge request routing,
- Audio Studio route status,
- UserData root policy.

These contracts guide implementation and validators, but contract existence alone is not runtime readiness.

## Historical notes

Superseded launcher prototypes, handoff notes, and phase reports may be useful for historical context, but they are not active source-of-truth unless listed in `ACTIVE_DOCUMENTATION_INDEX.md`.

The active product shell direction is Rust/Tauri. Python remains helper runtime only.

## Known remaining implementation work

1. Validate helper worker spawn on target PC.
2. Replace temporary one-shot capture implementation with long-running helper bridge routing.
3. Implement Audio Studio provider processing after metadata routes.
4. Add Audio Studio guided microphone capture.
5. Add Audio Studio audio quality scoring.
6. Add backend timeout/deadline handling for helper bridge worker response reads.

## Not claimed

- No local validation pass is claimed here.
- No packaged app readiness is claimed here.
- No real Audio Studio provider output is claimed here.
- No CUDA runtime readiness is claimed here.
- No target-PC helper spawn success is claimed here.

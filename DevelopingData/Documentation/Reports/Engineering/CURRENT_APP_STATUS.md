# Current TranslateIT App Status

Branch: `V1-Advance`
Status: active status summary

## Documentation source of truth

Read this first for documentation ownership and source-of-truth order:

```text
DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md
```

The current active product requirement source is:

```text
DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_PRODUCT_REQUIREMENTS.md
```

The current development phase is GitHub-first and CI-first. Local target-PC tests are deferred until the CI-safe foundation is stable.

## Active product direction

TranslateIT has one active product runtime direction:

```text
Rust/Tauri desktop shell + Python helper runtime
```

Python is an internal helper runtime, not a second user-facing product shell.

DesignIT and FigmaDesignExport are inactive and must not be used as active runtime dependencies.

## Final architecture decision

The final user-facing desktop application is Rust/Tauri.

Python remains part of the product as a helper runtime for tasks where Python is more efficient, especially ASR, translation, TTS, CUDA diagnostics, latency diagnostics, model checks, and voice/provider work.

The active product branch is `V1-Advance`. The repository default branch remains `Developing` for now.

## V1-Advance locked behavior

V1-Advance targets a Windows desktop real-time conversation translator with:

```text
Indonesian <-> English initial language scope
NVIDIA CUDA-first acceleration
CPU fallback required
Always-listening default
Push-to-talk secondary
Default push-to-talk hotkey: Hold Space
Silence threshold: 700ms
Maximum speech segment: 12 seconds
Built-in virtual microphone target
Headphone monitor volume: 50%
Mute original microphone required
English TTS output for Indonesian speech
Text/history on by default
Audio recording history off by default
```

## Implemented runtime

### Rust/Tauri shell

- Rust/Tauri launcher shell exists.
- Tauri command registration exists for runtime status, diagnostics, hardware, audio devices, settings, chat, capture control, translation, Audio Studio metadata routes, provider status route, quality gate status route, helper bridge lifecycle/status, helper bridge health check, capture helper bridge request previews, and Audio Studio validation evidence reads.
- Launcher chat persistence uses `UserData/SavedProject/Chat`.
- Project path discovery uses root markers: `EngineData`, `DevelopingData`, and `UserData`.

### Single active engine hardening

- Active user-facing shell is `EngineData/Frontend/RustApp`.
- Active helper runtime is `EngineData/Backend/LocalWorker/WorkerRuntime`.
- Active runtime contracts are under `EngineData/Backend/RuntimeContracts`.
- `EngineData/Backend/README.md` describes `RustApp` as the active app package folder.
- Runtime readiness guard uses neutral wording in code.
- `validate:single-active-engine` is registered in the package validation scripts.
- `validate:v1-advance-policy` is registered in the package validation scripts.
- V1-Advance policy validator blocks inactive DesignIT/FigmaDesignExport scripts and paths.
- V1-Advance policy validator checks active runtime contracts declare `V1-Advance`.

### Runtime UX flow hardening

- Main runtime wording separates text readiness from voice/provider readiness.
- Generic `Ready` wording was reduced in the main runtime status flow.
- Translation command failure is no longer treated as a completed translation result.
- Helper health monitor stores warning details as non-invasive runtime state.
- Runtime readiness DOM guard no longer overwrites explicit `Text ready` or `Voice ready` labels.
- Runtime API clears helper/status caches before and after helper/capture mutation commands.
- Runtime API applies frontend timeout guards to helper bridge lifecycle/request commands.
- Start Capture is blocked until helper provider readiness is verified.
- Audio settings warns that Mic Test and voice capture require helper provider readiness evidence before testing microphone capture.
- Developer settings remain the source of helper readiness display.
- Developer settings includes capture helper bridge request preview controls that prepare payloads without starting/stopping real capture.

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
- Helper existence alone must not mark full runtime ready; model/provider readiness still depends on worker response evidence and local validation.

### Capture helper bridge preview

- Rust/Tauri exposes `prepare_capture_start_request` and `prepare_capture_stop_request`.
- Preview commands build helper bridge payloads using current settings and helper generation token.
- Preview commands use `preview_only_no_capture_runtime_claim` and do not start or stop real capture.
- Preview commands return `provider_blocked` when helper provider readiness is not verified.
- Frontend exposes `prepareCaptureStartRequest` and `prepareCaptureStopRequest`.
- Developer UI includes preview buttons so the next migration step can inspect capture helper bridge payloads safely.
- Active contract now records V1-Advance speech policy: always-listening default, 700ms silence threshold, and 12s max speech segment.

### Audio Studio project-data runtime

Audio Studio metadata routes use `metadata_ready` semantics instead of general runtime `ready` semantics.

- Audio Studio can stage imported audio metadata.
- Audio Studio can stage guided-reading metadata.
- Audio Studio can update take states.
- Audio Studio can list saved take metadata.
- Audio Studio can export project metadata.
- Audio Studio exposes provider/quality diagnostics as blocker checks, not as ready-state actions.
- Audio Studio persists take details and evidence under approved UserData cache/project roots.
- Audio Studio remains a secondary feature inside the same TranslateIT V1 engine and must not become a separate engine.

### Diagnostics and evidence visibility

- Developer UI includes architecture/runtime status visibility.
- Developer UI includes Audio Studio validation evidence status.
- Rust/Tauri exposes `get_latest_audio_studio_validation_evidence`.
- Evidence reader loads the latest `.summary.json` and matching `.log` from `UserData/CacheData/AudioStudio/logs/` when available.

### Contract and path guardrails

- Runtime contracts now declare `branch: V1-Advance`.
- Architecture validator checks the deprecated Audio Studio placeholder does not become the source of truth again.
- Architecture validator checks Audio Studio provider and quality routes remain guarded by `provider_blocked` before local evidence.
- Capture helper bridge request contract defines the future capture_start/capture_stop helper bridge schema and keeps current state as `contract_ready_runtime_not_migrated`.
- Machine-specific path validator is available as `validate:machine-paths`.
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
- custom voice actor generation,
- provider readiness measurement.

### Python helper runtime bridge remaining work

Helper worker spawn, ping health check, JSON-line request forwarding, worker status mapping, capture generation-token invalidation, helper error-log capture, frontend health monitor, degraded-mode visibility, and helper bridge validator exist, but these still require local validation and additional runtime hardening.

Still pending:

- target-PC spawn validation,
- replacing the temporary one-shot capture implementation with long-running helper bridge routing,
- full Start/Stop capture result routing through helper request/response evidence,
- backend timeout/deadline handling for helper bridge stdout response reads,
- virtual microphone implementation and routing,
- low-latency end-to-end meeting flow validation.

## Contract only

Contracts exist for:

- V1-Advance final product requirements,
- final Rust/Tauri plus Python helper architecture,
- Python helper bridge,
- capture helper bridge request routing,
- Audio Studio route status,
- Audio Studio project metadata,
- Audio Studio advanced quality gates,
- Audio Studio local validation evidence,
- UserData root policy,
- non-local CI policy.

These contracts guide implementation and validators, but contract existence alone is not runtime readiness.

## Historical notes

Superseded launcher prototypes, handoff notes, old branch reports, and phase reports may be useful for historical context, but they are not active source-of-truth unless listed in `ACTIVE_DOCUMENTATION_INDEX.md`.

The active product shell direction is Rust/Tauri. Python remains helper runtime only.

## Known remaining implementation work

1. Keep bootstrap CI green while expanding validators safely.
2. Validate helper worker spawn on target PC later.
3. Replace temporary one-shot capture implementation with long-running helper bridge routing.
4. Implement built-in virtual microphone target and routing.
5. Implement English TTS meeting output routing.
6. Implement Audio Studio provider processing after metadata routes.
7. Add Audio Studio guided microphone capture.
8. Add Audio Studio audio quality scoring.
9. Add backend timeout/deadline handling for helper bridge worker response reads.
10. Prepare local validation checklist only after GitHub/CI-safe work is stable.

## Not claimed

- No local validation pass is claimed here.
- No packaged app readiness is claimed here.
- No real Audio Studio provider output is claimed here.
- No CUDA runtime readiness is claimed here.
- No target-PC helper spawn success is claimed here.
- No microphone capture success is claimed here.
- No virtual microphone success is claimed here.
- No one-second latency success is claimed here.

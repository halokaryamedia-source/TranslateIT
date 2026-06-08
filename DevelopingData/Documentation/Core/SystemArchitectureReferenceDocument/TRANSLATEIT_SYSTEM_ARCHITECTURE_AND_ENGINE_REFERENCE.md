# TranslateIT System Architecture and Engine Reference

## Document Control

- Project: TranslateIT
- Working root: `D:\Work\AI Stuff\TranslateIT\Developing\Experimental`
- Purpose: complete technical reference for the current app, launcher, engines, data flow, runtime state machine, and planning constraints
- Audience: AI Research, engineering planning, and implementation follow-up
- Status: living reference for the current Experimental baseline

## 1. Why This Document Exists

TranslateIT has reached the point where the application is no longer just a demo shell. It now contains:

- A Windows desktop launcher and operator console
- A live capture worker thread
- Microphone discovery and calibration
- ASR model loading and warmup
- Local translation model loading
- Local voice playback and replay logic
- Runtime logs, reports, cache, and saved session data
- Multiple capture modes and health snapshots

This document explains the whole system in one place so planning does not depend on reading code file-by-file first.

## 2. Product Summary

TranslateIT is a local-first Windows desktop speech translation system.

Primary intended workflow:

1. The user opens the app from the root launcher.
2. The user selects or confirms audio devices.
3. The launcher warms the runtime and validates readiness.
4. The user presses `Start`.
5. The app listens to the microphone in realtime.
6. Speech is detected, segmented, and accepted or rejected.
7. Accepted speech is transcribed with local ASR.
8. The transcript is translated locally into English.
9. The UI displays the segment, timing, and quality data.
10. The user can stop, replay, inspect logs, or save data.

The system is built to prioritize:

- Local execution
- Explicit runtime state
- Low latency
- Reproducible troubleshooting
- Strong anti-hallucination behavior
- Visible operator feedback

## 3. Root-Level Project Layout

The active development root is:

```text
D:\Work\AI Stuff\TranslateIT\Developing\Experimental
```

Top-level structure:

```text
Experimental/
  TranslateIT.vbs
  EngineData/
  DevelopingData/
  DeveloperData/
  UserData/
```

Meaning of each root folder:

- `EngineData`: runtime application source code
- `DevelopingData`: development docs, diagnostics, tests, reports, bundled runtime tools
- `DeveloperData`: research notes and technical reference material
- `UserData`: logs, cache, saved sessions, runtime reports

## 4. Launch Chain

Current launch entry points:

- `TranslateIT.vbs`
- `EngineData/LauncherApp/launcher_bootstrap.py`
- `EngineData/LauncherApp/app_main.py`

Launch sequence:

1. `TranslateIT.vbs` starts the app from the root.
2. The launcher bootstrap resolves the application runtime.
3. `app_main.py` builds the Qt window and runtime objects.
4. Startup warmup begins in a background worker.
5. The operator console becomes interactive once the runtime is ready.

Important launch rule:

- The launcher is the user-facing entry point.
- The live engine must not be treated as ready until warmup and runtime checks have actually completed.

## 5. Main Runtime Layers

TranslateIT currently has three core runtime areas:

### 5.1 LauncherApp

Location:

```text
EngineData/LauncherApp/
```

Responsibilities:

- Build the UI
- Coordinate startup and shutdown
- Manage capture mode selection
- Run warmup and post-stop rewarm behavior
- Control the start/stop lifecycle
- Write health and readiness snapshots
- Manage settings and device selection
- Orchestrate replay and TTS dispatch

Key files:

- `app_main.py`
- `app_config.py`
- `app_logger.py`
- `audio_settings.py`
- `audio_playback.py`
- `cuda_validation.py`
- `language_routing.py`
- `latency_meter.py`
- `latency_profile.py`
- `latency_report_reader.py`
- `live_pipeline.py`
- `replay_controller.py`
- `runtime_validation.py`
- `session_reporting.py`
- `single_instance.py`
- `transcript_view.py`
- `ui_state.py`
- `ui_theme.py`

### 5.2 TranscriptEngine

Location:

```text
EngineData/TranscriptEngine/
```

Responsibilities:

- Device discovery
- Input validation
- Calibration
- Audio preprocessing
- VAD and endpointing
- Segment building
- ASR loading
- ASR quality filtering
- Transcript session data
- Latency metrics

Key files:

- `audio_capture.py`
- `audio_calibration.py`
- `audio_preprocessing.py`
- `asr_model_loader.py`
- `asr_quality_filter.py`
- `benchmark_metrics.py`
- `microphone_diagnostic.py`
- `segment_builder.py`
- `transcript_segment.py`
- `transcript_session.py`
- `vad_pipeline.py`

### 5.3 TranslateEngine

Location:

```text
EngineData/TranslateEngine/
```

Responsibilities:

- Local translation model loading
- Translation inference
- Translation context handling
- Voice provider selection
- Local voice/TTS runtime behavior

Key files:

- `translation_context.py`
- `translation_engine.py`
- `tts_placeholder.py`
- `voice_provider_selection.py`

## 6. Current Runtime Model

Default config is defined in:

- `EngineData/LauncherApp/app_config.py`
- `EngineData/LauncherApp/audio_settings.py`

Important defaults:

```text
source_language = id
target_language = en
primary_asr_model = large-v3-turbo
backup_asr_model = medium
device = cuda
compute_type = float16
vad_preset = Headset
translation_engine_name = local-nllb-distilled
translation_fallback_engine_name = marianmt-id-en
use_custom_voice_actor = true
voice_actor_profile_id = marcel
```

Core design assumption:

- Real ASR should target CUDA when available.
- CPU fallback exists only as explicit degraded mode or explicit fallback behavior where the code allows it.
- The system should not silently pretend it is in a full-performance state when it is not.

## 7. Files That Matter Most

The most important source files for understanding the app are:

- [`EngineData/LauncherApp/app_main.py`](../../../../EngineData/LauncherApp/app_main.py)
- [`EngineData/LauncherApp/live_pipeline.py`](../../../../EngineData/LauncherApp/live_pipeline.py)
- [`EngineData/LauncherApp/app_config.py`](../../../../EngineData/LauncherApp/app_config.py)
- [`EngineData/LauncherApp/audio_settings.py`](../../../../EngineData/LauncherApp/audio_settings.py)
- [`EngineData/LauncherApp/cuda_validation.py`](../../../../EngineData/LauncherApp/cuda_validation.py)
- [`EngineData/LauncherApp/session_reporting.py`](../../../../EngineData/LauncherApp/session_reporting.py)
- [`EngineData/LauncherApp/replay_controller.py`](../../../../EngineData/LauncherApp/replay_controller.py)
- [`EngineData/LauncherApp/audio_playback.py`](../../../../EngineData/LauncherApp/audio_playback.py)
- [`EngineData/TranscriptEngine/audio_capture.py`](../../../../EngineData/TranscriptEngine/audio_capture.py)
- [`EngineData/TranscriptEngine/audio_calibration.py`](../../../../EngineData/TranscriptEngine/audio_calibration.py)
- [`EngineData/TranscriptEngine/audio_preprocessing.py`](../../../../EngineData/TranscriptEngine/audio_preprocessing.py)
- [`EngineData/TranscriptEngine/vad_pipeline.py`](../../../../EngineData/TranscriptEngine/vad_pipeline.py)
- [`EngineData/TranscriptEngine/asr_model_loader.py`](../../../../EngineData/TranscriptEngine/asr_model_loader.py)
- [`EngineData/TranscriptEngine/asr_quality_filter.py`](../../../../EngineData/TranscriptEngine/asr_quality_filter.py)
- [`EngineData/TranscriptEngine/transcript_session.py`](../../../../EngineData/TranscriptEngine/transcript_session.py)
- [`EngineData/TranslateEngine/translation_engine.py`](../../../../EngineData/TranslateEngine/translation_engine.py)
- [`EngineData/TranslateEngine/tts_placeholder.py`](../../../../EngineData/TranslateEngine/tts_placeholder.py)

## 8. Launcher Architecture

`app_main.py` is the central coordinator.

It contains:

- Qt window creation
- UI widgets and layout
- Signal wiring
- Worker creation
- Status rendering
- Startup warmup orchestration
- Start/stop handling
- Capture lifecycle management
- Health and readiness snapshot writing
- Error handling and recovery behavior

The launcher is not just a UI shell. It is the runtime supervisor for the full app.

## 9. UI Structure

The current UI is an operator console rather than a generic consumer app.

Main UI areas:

- Left sidebar project/session list
- Top header with title, status badges, and primary controls
- Main transcript workspace
- Settings and diagnostics pages inside a stacked workspace
- Status widgets for runtime health, microphone, and engine readiness
- Transcript cards with source, translation, quality, and replay actions

Primary control buttons:

- `Start`
- `Menu`
- `Stop` when capture or startup activity requires it

Important UI rule:

- The visible button label must reflect real runtime state, not just a stored preference.

## 10. Runtime State Model

The UI and launcher use `UIState` from:

- `EngineData/LauncherApp/ui_state.py`

Current states:

```text
IDLE
READY
PREPARING
STREAM_CHECK
READY_TO_LISTEN
LISTENING
SPEECH_DETECTED
TRANSCRIBING
TRANSLATING
COMPLETED
PAUSED
STOPPED
ERROR
```

State meaning:

- `PREPARING`: warmup, model loading, or pre-listening setup
- `STREAM_CHECK`: microphone stream validation is in progress
- `READY_TO_LISTEN`: engine is armed and waiting for speech
- `LISTENING`: speech is currently being monitored
- `SPEECH_DETECTED`: speech has been confirmed
- `TRANSCRIBING`: ASR is running
- `TRANSLATING`: translation is running
- `STOPPED`: capture has been stopped and the engine is idle or reset
- `ERROR`: a blocking failure occurred

Important policy:

- `PREPARING` is not a final stopped state.
- `STOPPED` should be an actual stop state.
- The app should never trap the user in a state where they cannot recover.

## 11. Start/Stop Lifecycle

This is the most important operational path in the application.

### 11.1 Startup Warmup

Warmup is handled by a background worker in `app_main.py`.

Warmup tasks generally include:

- Loading ASR
- Loading translation
- Checking CUDA
- Calibrating microphone defaults
- Warming TTS or custom voice paths where enabled

Warmup exists to avoid misleading readiness and to reduce perceived latency once capture starts.

### 11.2 Start Flow

When the user presses `Start`:

1. The launcher checks whether stop is still in progress.
2. The launcher checks whether runtime TTS is still settling.
3. The launcher checks whether warmup is complete.
4. The launcher validates CUDA policy for real ASR modes.
5. The launcher validates microphone selection.
6. A live pipeline worker thread is created.
7. Signals are connected back to the UI.
8. The thread starts and begins stream setup.

### 11.3 Stop Flow

When the user presses `Stop`:

1. Pending start requests are cleared.
2. Active capture requests are stopped.
3. The live worker receives a stop request.
4. The UI is switched to a safe stopped state.
5. Health and lifecycle snapshots are written.
6. The pipeline finish handler clears the live thread reference.

### 11.4 Why the lifecycle matters

The system must support repeated:

- `Start -> speak -> Stop -> Start -> speak`

without state poisoning, stale pending tasks, or hidden worker threads preventing recovery.

## 12. Live Pipeline

The capture worker is in:

- `EngineData/LauncherApp/live_pipeline.py`

This thread is responsible for:

- opening the microphone stream
- receiving audio callbacks
- buffering and preprocessing audio
- confirming speech frames
- forming segments
- running ASR
- running translation
- emitting segment and status events back to the UI

The pipeline emits signals such as:

- status changes
- level changes
- input state changes
- calibration ready
- segment ready
- error
- finished

## 13. Audio Capture Flow

The microphone path generally works like this:

1. Device enumeration happens first.
2. The selected device is validated.
3. The stream opens with the chosen capture settings.
4. The callback feeds frames into the worker queue.
5. Pre-roll frames are retained for segment continuity.
6. VAD checks energy and voice confirmation.
7. Once enough speech is confirmed, the app enters listening mode.
8. Segment endpointing decides when speech is complete.
9. Accepted segments are finalized for ASR.

Important audio design rules:

- Raw input is not blindly normalized before VAD decisions.
- ASR input is prepared after speech has been accepted.
- Capture is intended to preserve useful audio evidence and reject noise-dominant fragments.

## 14. Calibration Flow

Calibration is used to estimate:

- Noise floor
- Speech RMS
- Peak level
- Clipping risk
- Speech-to-noise gap
- Voiced frame ratio

Calibration data is used to:

- decide whether the input is usable
- tune VAD behavior
- label the microphone state clearly
- avoid false low-input warnings

## 15. VAD and Endpointing

VAD is a critical part of the system.

Purpose:

- Reject silence
- Reject noise-dominated frames
- Confirm actual speech
- Avoid false accepts from short or echo-like input

Endpointing is used to determine when a speech segment is complete.

The app uses:

- minimum speech duration
- trailing silence thresholds
- adaptive endpoint timing
- sustained confirmation logic

Why this matters:

- If endpointing is too aggressive, valid speech gets cut off.
- If endpointing is too loose, latency grows and the UI feels stuck.

## 16. Segment Building

Accepted audio is converted into transcript segments.

Each segment typically carries:

- segment ID
- session ID
- start and end timing
- source transcript
- translated text
- quality status
- latency metrics
- replay paths
- ASR and translation metadata

Segment data is the main unit used by the transcript UI and session persistence.

## 17. ASR Layer

ASR is handled by `asr_model_loader.py`.

Core responsibilities:

- Load the primary ASR model
- Fall back to the backup model when needed
- Warm up the model
- Transcribe finalized speech
- Report load and inference metadata
- Track device and compute type

Default ASR strategy:

- Primary: `large-v3-turbo`
- Backup: `medium`

Why this is important:

- The system depends on stable model loading behavior.
- Real ASR should not silently degrade into an untracked lower-quality mode.

## 18. Translation Layer

Translation is handled by `translation_engine.py`.

Responsibilities:

- Load local translation models
- Use the primary local model when available
- Fall back to the backup local model when needed
- Preserve the source transcript and translation separately
- Report translation readiness and failure details

Translation strategy:

- Local-first
- Primary and fallback local models
- No hidden cloud dependency by default

This architecture is deliberate:

- The source transcript remains inspectable.
- Errors can be traced more easily.
- The translation layer does not obscure what ASR actually heard.

## 19. TTS and Voice Output

TTS behavior lives mainly in:

- `EngineData/TranslateEngine/tts_placeholder.py`
- `EngineData/LauncherApp/audio_playback.py`
- `EngineData/LauncherApp/replay_controller.py`

Current design pattern:

- Voice output is treated as a separate action from live capture.
- Playback must not feed back into the microphone pipeline.
- Translated voice output is handled carefully and can be blocked while capture is active.

The app also supports custom voice actor logic and Windows-specific voice paths.

## 20. Replay Model

Replay is important for verification and debugging.

Two main audio directions exist:

- `Replay IN`: replay the source audio that was captured
- `Speak OUT`: play translated or generated output voice

Replay must obey capture safety rules:

- Do not replay into the live microphone path
- Do not allow playback during active capture if it can cause feedback
- Keep source replay and output speech separate

## 21. Data Model and Persistence

The application separates data by purpose.

### 21.1 UserData

Contains:

- cache data
- saved data
- log data
- reports

### 21.2 CacheData

Contains temporary runtime artifacts such as:

- audio segment cache
- session cache
- lock and state files
- transient audio or voice samples

### 21.3 SavedData

Contains user-approved stored sessions and transcript bundles.

### 21.4 LogData

Contains runtime logs, crash logs, readiness snapshots, health snapshots, benchmark snapshots, and diagnostic outputs.

## 22. Snapshot and Report System

The launcher writes structured reports for diagnosis and validation.

Examples of current output categories:

- engine readiness
- engine health
- worker health
- startup/stop lifecycle
- latency traces
- microphone diagnostics
- CUDA validation
- runtime validation
- benchmark summaries

Why this matters:

- The app is not just a UI. It is a diagnosable runtime system.
- The logs are part of the architecture, not an afterthought.

## 23. Current Critical Invariants

These rules should remain true unless a planned redesign says otherwise:

- The app should not claim `Ready` if warmup has not actually completed.
- The main start/stop control must always give the user a recovery path.
- A worker thread should own capture and inference, not the UI thread.
- Real ASR should remain CUDA-first for target performance.
- The source transcript must stay separate from translation.
- Replay must be safe around live capture.
- The system should prefer explicit failure over silent incorrect success.
- Any fallback mode must be labeled in reports or UI.

## 24. Current Known Problem Area

The current active problem area in development is the start/stop lifecycle.

Observed failure pattern:

- Start button can appear stuck in `Preparing`
- It can fail to enter listening mode
- Stop may become inaccessible if state handling is not consistent

Recent work in `app_main.py` focuses on:

- removing the broken dependency on a missing `developer_toggle`
- letting the primary control button act as a real recovery action during startup or warmup
- preventing queued warmup completion from reviving a cancelled request

This area should be treated as critical before any broad feature expansion.

## 25. Planning Constraints For Future Work

Before adding new features, planning should always answer:

1. What thread owns the work?
2. What state transitions are possible?
3. What happens if the user presses Stop mid-operation?
4. What gets logged when the task fails?
5. What does the UI show while the task is in progress?
6. Can the app recover if the task is cancelled?
7. Does the feature affect capture latency or replay safety?
8. Does it introduce a hidden cloud dependency?

If a feature cannot answer those questions cleanly, it is not ready for production planning.

## 26. Recommended Development Order

When continuing development from the current Experimental root, the safest order is:

1. Stabilize the start/stop lifecycle
2. Verify live microphone listening mode
3. Verify stop cancellation and restart recovery
4. Verify replay safety during and after capture
5. Verify calibration and device selection persistence
6. Verify ASR and translation path correctness
7. Verify report generation and state snapshots
8. Then add new behavior

## 27. Suggested Working Notes For AI Research

Use this document as the base planning reference, then inspect code only where the document points.

Recommended read order:

1. `EngineData/LauncherApp/app_main.py`
2. `EngineData/LauncherApp/live_pipeline.py`
3. `EngineData/LauncherApp/ui_state.py`
4. `EngineData/LauncherApp/app_config.py`
5. `EngineData/TranscriptEngine/audio_capture.py`
6. `EngineData/TranscriptEngine/audio_calibration.py`
7. `EngineData/TranscriptEngine/vad_pipeline.py`
8. `EngineData/TranscriptEngine/asr_model_loader.py`
9. `EngineData/TranscriptEngine/transcript_session.py`
10. `EngineData/TranslateEngine/translation_engine.py`
11. `EngineData/TranslateEngine/tts_placeholder.py`

## 28. File Index For This Document

- Main launcher: `EngineData/LauncherApp/app_main.py`
- Live pipeline worker: `EngineData/LauncherApp/live_pipeline.py`
- UI state enum: `EngineData/LauncherApp/ui_state.py`
- Default config: `EngineData/LauncherApp/app_config.py`
- Audio settings persistence: `EngineData/LauncherApp/audio_settings.py`
- Audio capture helpers: `EngineData/TranscriptEngine/audio_capture.py`
- Calibration: `EngineData/TranscriptEngine/audio_calibration.py`
- Preprocessing: `EngineData/TranscriptEngine/audio_preprocessing.py`
- VAD: `EngineData/TranscriptEngine/vad_pipeline.py`
- ASR loading: `EngineData/TranscriptEngine/asr_model_loader.py`
- Quality filtering: `EngineData/TranscriptEngine/asr_quality_filter.py`
- Transcript session data: `EngineData/TranscriptEngine/transcript_session.py`
- Translation engine: `EngineData/TranslateEngine/translation_engine.py`
- TTS and voice runtime: `EngineData/TranslateEngine/tts_placeholder.py`
- Replay: `EngineData/LauncherApp/replay_controller.py`
- Playback: `EngineData/LauncherApp/audio_playback.py`

## 29. Final Position

TranslateIT is now best treated as a coordinated runtime system with a UI shell, worker-based live pipeline, local ASR and translation engines, state snapshots, and strict recovery behavior.

Any future planning should preserve these fundamentals:

- local-first runtime
- explicit readiness
- cancellation-safe lifecycle
- thread-isolated capture
- separate source and translated text
- safe replay behavior
- clear logs and reports

## 30. Real Data And Size Profile

This document references real application data, but it does not inline large binary assets, model weights, runtime environments, or cache media.

Reason:

- The repository contains far more than 500 MB of runtime data when bundled models and runtime environments are included.
- A text reference document must stay small enough to be usable and versionable.
- The correct way to represent large assets is by exact path, exact role, and exact current snapshot, not by copying the binary payload into documentation.

Current measured sizes from the Experimental root:

| Area | File count | Size |
| --- | ---: | ---: |
| `EngineData` total | 187 | 5656.94 MB |
| `EngineData` source-only, excluding `ModelData`, `__pycache__`, and `.pyc` | 41 | 0.81 MB |
| `DevelopingData/DocumentationData/SourceDocument` | 25 | 0.32 MB |
| `UserData/LogData` | 73 | 13.7 MB |
| `UserData/CacheData/audio_segments` | 922 | 15.67 MB |
| `UserData/CacheData/session_cache` | 235 | 6.84 MB |

Root-wide scan excluding `ModelData` and `__pycache__` still shows a very large footprint because the bundled runtime environment and other application assets are real, local files:

| Scan scope | File count | Size |
| --- | ---: | ---: |
| Entire root excluding `ModelData`, `__pycache__`, and `.pyc` | 32500 | 5437.95 MB |

Interpretation:

- The application source itself is small.
- The asset and runtime bundle is large.
- The documentation must therefore stay as a data index and technical map, not as a blob of copied assets.

## 31. Current Runtime Snapshot

Current persisted settings from `UserData/CacheData/audio_settings.json`:

```json
{
  "input_device_id": 1,
  "output_device_id": 4,
  "input_sensitivity": "Headset",
  "show_advanced_devices": false,
  "allow_low_but_usable_input": true,
  "auto_play_out_voice": true,
  "use_custom_voice_actor": true,
  "voice_actor_profile_id": "marcel",
  "voice_actor_profiles_root": "D:\\Work\\AI Stuff\\TranslateIT-ISSUED\\DevelopingPack\\UserData\\SavedData\\profiles\\default\\voices"
}
```

Current engine readiness snapshot from `UserData/LogData/engine_readiness_latest.json`:

```json
{
  "state": "Preparing",
  "cuda_ready": true,
  "asr_device": "cuda",
  "asr_compute_type": "float16",
  "input_device": "Triton Microphone (USB AUDIO DE  Default",
  "output_device": "TWS (AkLIAM PD6)  Default",
  "auto_play_out_voice": true,
  "capture_worker_state": "stopped",
  "stream_active": false,
  "callback_count": 0,
  "frames_received": 0,
  "last_audio_frame_time": "",
  "last_error": "",
  "start_pressed_time": "2026-06-07T15:35:44.425+07:00",
  "ready_to_listen_time": "",
  "total_start_to_ready_ms": 0,
  "model_preload_duration_ms": 14816,
  "cuda_check_duration_ms": 0,
  "stream_open_duration_ms": 0,
  "first_audio_callback_delay_ms": 0,
  "warmup_duration_ms": 0,
  "false_ready_prevented": true
}
```

Current engine health snapshot from `UserData/LogData/engine_health_latest.json`:

```json
{
  "segment_id": "",
  "status": "Unknown",
  "speech_duration_ms": 0,
  "total_latency_ms": 0,
  "issue_status": "unavailable",
  "issue_summary": "measurement=UNAVAILABLE",
  "issue_primary_stage": "Unknown",
  "issue_primary_reason": "No measurable component recorded"
}
```

Current start/stop lifecycle snapshot from `UserData/LogData/start_stop_lifecycle_latest.json`:

```json
{
  "segment_id": "",
  "status": "initialized"
}
```

Current version note from `UserData/LogData/version_snapshot_latest.txt`:

```text
root cleanup complete: only V1 and Experimental remain visible at root (plus hidden .git).
```

## 32. Actual Launcher And Bootstrap Behavior

`TranslateIT.vbs` does the following:

- Creates `UserData\LogData` if needed
- Writes to `UserData\LogData\launcher_latest.log`
- Uses `DevelopingData\ToolKitData\rt\Scripts\pythonw.exe`
- Sets `TRANSLATEIT_LAUNCH_MODE=gui`
- Sets `TRANSLATEIT_PROJECT_ROOT` to the project root
- Defaults `TRANSLATEIT_TTS_BACKEND` to `sapi_direct_async` if unset
- Launches `pythonw.exe -m EngineData.LauncherApp.launcher_bootstrap`

`EngineData/LauncherApp/launcher_bootstrap.py` does the following:

- Changes working directory to the project root
- Ensures the project root is on `sys.path`
- Preserves or defaults `TRANSLATEIT_TTS_BACKEND=sapi_direct_async`
- Installs global crash recorders
- Writes startup snapshots to `UserData\LogData\launcher_latest.log`
- Runs a self-test when `--self-test` is supplied
- Imports and runs `EngineData.LauncherApp.app_main`

`EngineData/LauncherApp/single_instance.py` does the following:

- Creates `UserData\CacheData\translateit.lock`
- Creates `UserData\CacheData\translateit.lock.json`
- Uses Windows file locking to prevent duplicate app instances
- Shows a message box if the app is already running

## 33. Actual Runtime Artifact Families

These are the real current artifact families written by the app:

### Logs and reports

- `UserData/LogData/launcher_latest.log`
- `UserData/LogData/app_crash_latest.json`
- `UserData/LogData/app_crash_latest.log`
- `UserData/LogData/app_crash_fatal.log`
- `UserData/LogData/engine_health_latest.json`
- `UserData/LogData/engine_readiness_latest.json`
- `UserData/LogData/engine_stability_audit_latest.json`
- `UserData/LogData/engine_stability_audit_latest.txt`
- `UserData/LogData/worker_health_latest.json`
- `UserData/LogData/start_stop_lifecycle_latest.json`
- `UserData/LogData/runtime_validation_latest.json`
- `UserData/LogData/runtime_validation_latest.txt`
- `UserData/LogData/cuda_validation_latest.json`
- `UserData/LogData/cuda_validation_latest.txt`
- `UserData/LogData/benchmark_latest.json`
- `UserData/LogData/benchmark_latest.txt`
- `UserData/LogData/microphone_diagnostic_latest.json`
- `UserData/LogData/microphone_diagnostic_latest.txt`
- `UserData/LogData/playback_health_latest.json`
- `UserData/LogData/latency_debug_latest.json`
- `UserData/LogData/runtime_pipeline_latest.log`

### Cache artifacts

- `UserData/CacheData/audio_settings.json`
- `UserData/CacheData/translateit.lock`
- `UserData/CacheData/translateit.lock.json`
- `UserData/CacheData/audio_segments/`
- `UserData/CacheData/session_cache/`
- `UserData/CacheData/RuntimeLogs/`
- `UserData/CacheData/voice_provider_selection.json`
- `UserData/CacheData/voice_provider_selection_test.json`

### Saved session data

- `UserData/SavedData/`
- `UserData/SavedData/SavedTranscript/`
- `UserData/SavedData/CustomVoice/`

These folders are the real runtime persistence layer for the application. They are part of the app's actual data model and are not decorative documentation.

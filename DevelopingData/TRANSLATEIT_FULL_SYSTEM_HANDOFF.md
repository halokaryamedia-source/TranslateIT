# TranslateIT Full System Handoff

Last updated: 2026-06-05

This document is a complete handoff note for continuing TranslateIT development on another device or with another AI assistant. It describes the current experimental app, its engines, runtime assumptions, important files, stability rules, validation commands, and the areas that must be handled carefully.

## Current Working Scope

The active development root is:

```text
D:\Work\AI Stuff\TranslateIT\Developing\Experimental
```

The parent folder also contains:

```text
D:\Work\AI Stuff\TranslateIT\Developing\Current-Project
D:\Work\AI Stuff\TranslateIT\Developing\MainBackup
```

Important meaning:

- `Experimental` is the current working branch/folder for ongoing development.
- `MainBackup` has been used as the stable backup snapshot and should not be modified unless the user explicitly requests a new stable backup overwrite.
- `Current-Project` has been used as another copied project state.

The user has repeatedly emphasized that fixes must be implemented directly in the repository, validated, and not merely explained.

## Product Purpose

TranslateIT is a local Windows desktop realtime speech translation application.

Primary intended use:

- User speaks Indonesian or English.
- App captures microphone audio in realtime.
- App transcribes speech locally.
- App translates between Indonesian and English.
- App plays translated voice output.
- Current testing default uses the custom voice actor profile `marcel`.

Target behavior:

- Low latency.
- Stable long-running use.
- Stable `Start -> Stop -> Start` cycles.
- CUDA should be used when available and validated for the realtime ASR path.
- CPU fallback must not happen silently for the main CUDA ASR requirement.
- UI readiness must not lie: the user should only speak once the engine is genuinely ready.

## Top-Level Folder Map

```text
Experimental/
  TranslateIT.vbs
  EngineData/
    LauncherApp/
    TranscriptEngine/
    TranslateEngine/
  DevelopingData/
    Diagnostics/
    Docs/
    Document/
    DocumentationData/
    LauncherHelpers/
    Reports/
    SampleData/
    Tests/
    ToolKitData/
  DeveloperData/
    TechnicalDocumentation/
  UserData/
    CacheData/
    SavedData/
    LogData/
```

Main folders:

- `EngineData`: application runtime code.
- `DevelopingData`: development docs, tests, diagnostics, reports, bundled runtime/tools.
- `DeveloperData`: research notes, including VoiceLab/custom voice research.
- `UserData`: runtime settings, cache, logs, saved transcripts, custom user data.

## Main Launch Entry Points

Primary launcher script:

```text
Experimental\TranslateIT.vbs
```

Python bootstrap:

```text
Experimental\EngineData\LauncherApp\launcher_bootstrap.py
```

Main Qt app:

```text
Experimental\EngineData\LauncherApp\app_main.py
```

Self-test command from `Experimental`:

```powershell
python -m EngineData.LauncherApp.launcher_bootstrap --self-test
```

If using the bundled runtime, run from `Experimental` so `EngineData` resolves correctly:

```powershell
.\DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test
```

Do not run module commands from the parent `Developing` root unless `PYTHONPATH` is adjusted, because `EngineData` lives under `Experimental`.

## Engine Overview

There are three runtime engine areas:

```text
EngineData\LauncherApp
EngineData\TranscriptEngine
EngineData\TranslateEngine
```

### LauncherApp

Purpose:

- Desktop UI.
- Runtime coordination.
- Start/stop lifecycle.
- Settings UI.
- CUDA validation UI.
- Capture mode selection.
- Latency display.
- Session/report writing.
- Replay controls.

Important files:

- `app_main.py`: main Qt window, `PrototypeRuntime`, warmup worker, lifecycle coordination, UI status, TTS orchestration.
- `live_pipeline.py`: live capture worker thread and segment pipeline.
- `app_config.py`: default engine config.
- `audio_settings.py`: persisted audio/custom voice settings.
- `cuda_validation.py`: CUDA readiness validation.
- `language_routing.py`: Indonesian/English focus routing and short phrase normalization.
- `latency_meter.py`: metric trace capture.
- `latency_profile.py`: latency profile helpers.
- `latency_report_reader.py`: report summary reader.
- `session_reporting.py`: structured reports and telemetry payloads.
- `app_logger.py`: runtime logging, async report writes, crash logging.
- `audio_playback.py`: playback backend.
- `replay_controller.py`: source/translation replay paths.
- `transcript_view.py`: transcript card view models.
- `ui_state.py`: runtime UI state enum.
- `ui_theme.py`: Qt stylesheet.
- `single_instance.py`: avoids duplicate launcher instances.
- `runtime_validation.py`: runtime validation helpers.

### TranscriptEngine

Purpose:

- Microphone discovery and validation.
- Audio calibration.
- Audio preprocessing.
- VAD/endpointing.
- Segment construction.
- Faster-Whisper ASR loading/transcription.
- Post-ASR quality filtering.
- Transcript/session data models.

Important files:

- `audio_capture.py`: `sounddevice`/PortAudio device discovery, validation, input/output device lists.
- `audio_calibration.py`: calibration result, noise floor, sensitivity.
- `audio_preprocessing.py`: audio normalization/preparation before VAD and ASR.
- `vad_pipeline.py`: VAD preset logic and accept/reject gate.
- `segment_builder.py`: transcript segment creation.
- `asr_model_loader.py`: Faster-Whisper model loading, realtime profile, CUDA/compute policy, warmup cache, ASR cache.
- `asr_quality_filter.py`: hallucination/gibberish/badword/low-confidence filtering.
- `transcript_segment.py`: `TranscriptSegment`, latency, quality, replay metrics.
- `transcript_session.py`: session storage and saved transcript management.
- `benchmark_metrics.py`: latency benchmark summary.

### TranslateEngine

Purpose:

- Local translation model loading and inference.
- Translation context/routing.
- TTS/default voice/custom voice output.
- Voice provider selection for custom voice actor.

Important files:

- `translation_engine.py`: local translation engine, NLLB primary path, Marian fallback, warmup cache, literal phrase shortcuts.
- `translation_context.py`: translation request context helpers.
- `tts_placeholder.py`: TTS runtime, default SAPI, direct SAPI, custom voice actor ONNX/Piper path, warmup/reset/shutdown logic.
- `voice_provider_selection.py`: custom voice profile discovery, CUDA/CPU provider benchmark, provider decision cache.

## Default Configuration

Source:

```text
EngineData\LauncherApp\app_config.py
EngineData\LauncherApp\audio_settings.py
```

Current important defaults:

```text
language_focus_mode = ID/EN Focus
source_language = id
target_language = en
primary_asr_model = large-v3-turbo
backup_asr_model = medium
device = cuda
compute_type = float16
asr_task = transcribe
temperature = 0
beam_size = 1
condition_on_previous_text = False
vad_filter = False
word_timestamps = False
vad_preset = Headset
translation_engine_name = local-nllb-distilled
translation_fallback_engine_name = marianmt-id-en
use_custom_voice_actor = True
voice_actor_profile_id = marcel
```

Default custom voice profile root:

```text
D:\Work\AI Stuff\TranslateIT-ISSUED\DevelopingPack\UserData\SavedData\profiles\default\voices
```

This absolute path is machine-specific. On a new device, verify that the `marcel` profile exists there or update `UserData\CacheData\audio_settings.json` / the Settings UI.

Runtime settings path:

```text
Experimental\UserData\CacheData\audio_settings.json
```

If settings are corrupt, `audio_settings.py` falls back to defaults and sanitizes broken profile-root values such as Python dataclass member text.

## Model Locations

ASR models:

```text
Experimental\EngineData\TranscriptEngine\ModelData\faster-whisper-large-v3-turbo
Experimental\EngineData\TranscriptEngine\ModelData\faster-whisper-medium
```

Expected ASR model marker:

```text
model.bin
```

Translation models:

```text
Experimental\EngineData\TranslateEngine\ModelData\nllb-200-distilled-600M
Experimental\EngineData\TranslateEngine\ModelData\marianmt-id-en
```

Expected translation model marker:

```text
config.json
```

Model cache and Hugging Face cache:

```text
Experimental\DevelopingData\ToolKitData\ModelCache
Experimental\DevelopingData\ToolKitData\ModelCache\HuggingFaceHome
```

## Runtime Dependencies

The project has a bundled Python runtime area:

```text
Experimental\DevelopingData\ToolKitData\rt
```

Important packages seen in the runtime:

- `PySide6`
- `sounddevice`
- `numpy`
- `torch` CUDA build
- `torchaudio`
- `faster_whisper`
- `ctranslate2`
- `transformers`
- `sentencepiece`
- `sacremoses`
- `onnxruntime`
- `piper`

The app is local-only. It should not require cloud services for normal runtime.

## CUDA Policy

The user explicitly wants CUDA working normally for realtime engine use.

Rules:

- Do not silently degrade the main realtime ASR path to CPU.
- If CUDA is not valid, real ASR should be blocked and the UI should show a clear CUDA blocker.
- CPU degraded mode exists but must be explicit and visible.
- CUDA validation is handled by `EngineData\LauncherApp\cuda_validation.py`.
- `PrototypeRuntime.refresh_cuda_status()` and `PrototypeRuntime.apply_asr_device_policy()` coordinate CUDA status with ASR runtime.

CUDA validation checks include:

- `nvidia-smi`
- GPU name and driver
- PyTorch import
- `torch.version.cuda`
- `torch.cuda.is_available()`
- CUDA tensor execution
- Faster-Whisper import
- CTranslate2 import
- CTranslate2 CUDA device count
- CTranslate2 supported CUDA compute types

Validation reports are written into `UserData\LogData` through app logger helpers.

## ASR Engine

Primary ASR:

```text
large-v3-turbo
```

Backend:

```text
faster-whisper / CTranslate2
```

Realtime profile:

- CUDA device by default.
- `float16` compute by default.
- Indonesian is primary, but English code-switching is supported.
- Greedy decode (`beam_size=1`, `best_of=1`) for latency.
- `temperature=0`.
- `condition_on_previous_text=False` to reduce hallucinated carry-over.
- `vad_filter=False`; custom live VAD is used before ASR.
- `word_timestamps=False` for latency.

The ASR initial prompt is important. It biases transcription toward exact Indonesian/English speech and prevents English rewrites of short Indonesian utterances. Do not remove it without tests.

ASR warmup behavior:

- `StartupWarmupWorker` calls `ASRModelLoader.warmup_model()`.
- Warmup uses a small synthetic zero audio render.
- Warmup cache is keyed by the full realtime profile signature, including model, device, compute type, language, task, decoding settings, and prompt digest.
- Resident warmup is reused when profile signature has not changed.

ASR quality filter:

```text
EngineData\TranscriptEngine\asr_quality_filter.py
```

It rejects:

- extremely random/gibberish text,
- low-confidence wrong-language text,
- repeated hallucination phrases,
- suspicious keyboard/tap/mouse artifacts that ASR turned into text,
- conservative badword/profanity cases.

It should not reject names of people or places unless they look clearly like noise/hallucination.

## Audio Capture and VAD

Audio input:

```text
sounddevice / PortAudio
```

Capture worker:

```text
EngineData\LauncherApp\live_pipeline.py
```

Capture modes:

```text
Diagnostic Only
Mock Pipeline
Real ASR + Mock Translation
Real ASR + Real Translation
```

Production/realtime mode is intended to be:

```text
Real ASR + Real Translation
```

VAD preset:

```text
Headset
```

Important current VAD values:

```text
pre_roll_audio_ms = 180
minimum_speech_duration_ms = 100
minimum_silence_duration_ms = 80
maximum_segment_duration_s = 8
noise_gate = adaptive light
```

The live pipeline includes extra evidence checks to reject keyboard, mouse, and table taps:

- RMS/peak checks.
- Speech-to-noise gap.
- Voiced frame ratio.
- Zero crossing rate.
- Peak-to-RMS ratio.
- Frame energy concentration.
- Frame active ratio.
- Impulse edge ratio.
- Echo match flag.

The VAD side is intentionally lightweight to avoid adding inference latency.

## Translation Engine

Primary translation engine:

```text
local-nllb-distilled
```

Primary model:

```text
facebook/nllb-200-distilled-600M
```

Fallback engine:

```text
marianmt-id-en
```

Important behavior:

- Translation prefers CUDA when available.
- Greedy generation is used for deterministic low latency.
- Translation can skip when detected language already matches the target.
- Short literal Indonesian phrases use deterministic fast paths to prevent overly long paraphrases.
- Warmup is cached by model id, engine id, device, and dtype.

Known short phrase focus:

- `halo coba berbicara`
- `coba bicara`
- `lalu coba bicara`
- `lagi`
- `terima kasih`
- `silakan`

Language routing helpers live in:

```text
EngineData\LauncherApp\language_routing.py
```

## TTS and Voice Output

Main TTS implementation:

```text
EngineData\TranslateEngine\tts_placeholder.py
```

Supported backend names:

```text
legacy_sapi_wav
sapi_direct_async
voice_actor_onnx
```

Current testing default:

```text
voice_actor_onnx with profile marcel
```

Default/fallback voice:

- Windows SAPI via PowerShell.
- Legacy path can create WAV first.
- Direct SAPI path can speak faster through a persistent worker.

Custom voice actor:

- Uses Piper/ONNX profile.
- Profile discovered by `voice_provider_selection.py`.
- Current desired profile is `marcel`.
- Direct streaming playback is used for low latency.
- WAV artifact may still be cached for replay, but should not be the main playback gate.

Custom voice provider selection:

- Tries CUDA provider when available.
- Benchmarks CUDA and CPU with a short safe render.
- Selects the measured faster/stable provider.
- Caches decision per voice profile/model version.
- Records:
  - `provider_used`
  - `provider_benchmark_ms`
  - `provider_selection_reason`
  - `provider_voice_profile_id`
  - `provider_model_version`

Provider decision cache:

```text
Experimental\UserData\CacheData\voice_provider_selection.json
```

Provider reasons include:

```text
cuda_fastest
cpu_fastest
cuda_unavailable
cuda_failed_warmup
cuda_render_failed
cpu_fallback
default_voice_fallback
```

Important user preference:

- For CUDA/CPU fallback in the main app, do not hide fallback. The user wants visibility and control, especially for CUDA.
- For custom voice provider benchmarking, CPU may be faster for short utterances, but this decision must be recorded and visible in diagnostics.

## Start, Stop, and Readiness Rules

This has been a major stability area.

Correct UI behavior:

- On app startup, the engine may show `Preparing`/`Warming up` until warmup is done.
- `Ready` must only appear when the engine is actually ready.
- When the user presses `Stop`, the UI should become fully stopped.
- After stop, it should not show `Preparing` automatically.
- When the user presses `Start` again, the app may enter `Preparing` again if it needs warmup/reconnect.
- `Ready to Listen` means the microphone stream is active and the user can speak.

Important files/methods:

```text
EngineData\LauncherApp\app_main.py
  StartupWarmupWorker
  begin_startup_warmup()
  handle_startup_warmup_result()
  handle_start_capture()
  handle_stop_capture()
  handle_pipeline_finished()
  refresh_status_panel()
  update_start_button_state()
  set_status()
```

Recent critical fixes:

- Stop invalidates stale `engine_startup_ready` so the next start cannot inherit a false ready flag.
- UI must not promote `Preparing` to `Ready` if a pending start is queued.
- `Stopped` is a final UI state after stop, not a warmup state.
- TTS reset separates runtime reset from full shutdown:
  - reset keeps safe warmed state for fast restart when possible,
  - shutdown is used when profile/runtime changes.

Be careful:

- Do not set `engine_startup_ready=True` without completed ASR + translation + TTS warmup.
- Do not let `refresh_status_panel()` silently convert `STOPPED` into `PREPARING`.
- Do not start capture while `_stop_in_progress` is true.
- Do not clear queued start requests too early.
- Do not allow stale TTS results from older capture generations to update the current session.

## UI States

Defined in:

```text
EngineData\LauncherApp\ui_state.py
```

States:

```text
Idle
Ready
Preparing
Stream Check
Ready to Listen
Listening
Speech Detected
Transcribing
Translating
Completed
Paused
Stopped
Error
```

User-facing interpretation:

- `Stopped`: engine is fully stopped after the user stopped capture.
- `Preparing`: engine is actively preparing/warming after app launch or after user pressed Start.
- `Ready`: app-level engine dependencies are warmed, but capture is not necessarily listening.
- `Ready to Listen`: microphone stream is live; user can speak.
- `Listening`: capture is active.
- `Error`: setup or runtime error needs attention.

## Latency Metrics

Latency details are built in:

```text
EngineData\LauncherApp\app_main.py
```

Important latency sections:

- Audio Verify
- STT
- Translate
- TTS

Previous UI issue:

- Section totals did not add up to total latency.
- Missing gap was renamed to more natural wording such as playback wait.
- `Delay After Speech End` was removed from the details UI because it was no longer used.

Important latency principle:

- Do not fake missing latency as `0 ms`.
- If unavailable, show `Latency unavailable`.
- Transcript card should prefer measured output proxy latency when available.

## Reports and Logs

Runtime logs/reports live under:

```text
Experimental\UserData\LogData
Experimental\UserData\CacheData
```

Engineering reports live under:

```text
Experimental\DevelopingData\Reports\Engineering
```

Important report:

```text
Experimental\DevelopingData\Reports\Engineering\DEEP_STABILITY_LATENCY_AUDIT_P11_REPORT.md
```

Crash records:

```text
Experimental\UserData\LogData\app_crash_latest.json
Experimental\UserData\LogData\app_crash_latest.log
Experimental\UserData\LogData\app_crash_fatal.log
```

Crash hooks are installed in:

```text
EngineData\LauncherApp\launcher_bootstrap.py
EngineData\LauncherApp\app_logger.py
EngineData\LauncherApp\app_main.py
```

The app has async/deduped report writing to reduce UI and disk pressure.

## Diagnostics

Diagnostic scripts:

```text
DevelopingData\Diagnostics\input_output_latency_probe.py
DevelopingData\Diagnostics\latency_optimizer_review.py
DevelopingData\Diagnostics\manual_latency_review_helper.py
DevelopingData\Diagnostics\segment_ui_contract_probe.py
DevelopingData\Diagnostics\tts_direct_async_probe.py
```

Use these to investigate:

- latency mismatch,
- UI/report contract issues,
- input/output latency,
- TTS direct async behavior,
- manual latency review.

## Tests

Main test folder:

```text
Experimental\DevelopingData\Tests
```

Main broad test file:

```text
Experimental\DevelopingData\Tests\test_engine_hardening.py
```

Useful validation commands from `D:\Work\AI Stuff\TranslateIT\Developing`:

```powershell
python -m compileall -q Experimental\EngineData Experimental\DevelopingData\Diagnostics Experimental\DevelopingData\Tests
python -m unittest discover -s Experimental\DevelopingData\Tests
```

Useful validation commands from `Experimental`:

```powershell
python -m compileall -q .\EngineData .\DevelopingData\Diagnostics .\DevelopingData\Tests
python -m unittest discover -s .\DevelopingData\Tests
python -m EngineData.LauncherApp.launcher_bootstrap --self-test
```

Recent known unit test count during this handoff period:

```text
153 tests in test_engine_hardening.py after the Stop/Stopped UI additions
```

Before handing work back to the user, run at least:

```powershell
python -m unittest discover -s Experimental\DevelopingData\Tests -p "test_engine_hardening.py"
python -m EngineData.LauncherApp.launcher_bootstrap --self-test
```

## Current Recent Issue Context

The most recent user-reported UI issue:

- After pressing Stop, UI showed `Status: Stopping` and the button showed `Preparing...`.
- User wants full stop after Stop.
- Preparing should only appear after user presses Start again.

Current intended fix direction:

- `set_status(UIState.STOPPED)` should display `Stopped`.
- `refresh_status_panel()` should show runtime badge `Status: Stopped`.
- `update_start_button_state()` should show `Start` for `STOPPED`, even if `engine_startup_ready=False`.
- Start should enter `Preparing` only when the user requests Start and warmup/reconnect is required.

Important tests to preserve:

- Stop invalidates engine readiness.
- Stopped state shows Start button.
- Stopped status panel shows `Stopped`.
- Warmup result with pending start must not flash `Ready`.

## Known Sensitive Areas

### Start/Stop Lifecycle

This is the most fragile area. When editing it, test repeated cycles:

```text
Start -> speak -> Stop -> wait full stop -> Start -> speak
```

Watch for:

- false `Ready`,
- stuck `Preparing`,
- no microphone input after restart,
- stale TTS/playback from previous generation,
- UI status not matching actual capture worker state.

### CUDA

Do not quietly hide CUDA failures. For real ASR:

- CUDA must pass validation.
- If CUDA fails, show blocker.
- Do not silently switch to CPU unless user explicitly accepts degraded mode.

### Custom Voice Actor

Custom voice has had several regressions before:

- no custom audio,
- fallback to default without visibility,
- double playback,
- WAV path latency,
- glitching from over-aggressive warmup optimization,
- stop/start state carry-over.

When editing `tts_placeholder.py`, verify:

- `marcel` still speaks,
- no double audio,
- direct streaming still works,
- stop cancels active speech,
- restart does not inherit stale playback.

### ASR Noise/Hallucination Filter

User has complained about keyboard, mouse, and table tap sounds being transcribed as hallucinated text such as:

```text
I'm going to say...
I'm a writer of the book.
I'm not sure what I'm saying.
```

Do not solve this by blocking only those exact phrases. The filter must use general evidence:

- audio impulse evidence before ASR,
- language probability,
- confidence,
- repetition,
- token profile,
- low speech focus.

Also avoid blocking real names, place names, and short valid Indonesian/English phrases.

### Short Indonesian Phrases

Known issue examples:

- User says Indonesian but IN text becomes English.
- Short Indonesian input gets translated too long.

Guard these paths:

- ASR initial prompt in `app_config.py`.
- `language_routing.py`.
- literal translation map in `translation_engine.py`.
- tests in `test_engine_hardening.py`.

## Moving To Another Device

Checklist:

1. Copy the full `Experimental` folder.
2. Preserve large local model folders under `EngineData\TranscriptEngine\ModelData` and `EngineData\TranslateEngine\ModelData`.
3. Preserve `DevelopingData\ToolKitData\rt` if the new device should use the same bundled Python runtime.
4. Verify CUDA driver and PyTorch CUDA build on the new device.
5. Verify `nvidia-smi` works.
6. Verify `torch.cuda.is_available()` is true in the runtime used by the app.
7. Verify `ctranslate2` sees CUDA and supports the intended compute type.
8. Update custom voice profile root if the absolute `TranslateIT-ISSUED` path differs.
9. Start app and run CUDA validation from UI.
10. Test `Start -> speak -> Stop -> Start -> speak`.

Machine-specific paths to check:

```text
D:\Work\AI Stuff\TranslateIT-ISSUED\DevelopingPack\UserData\SavedData\profiles\default\voices
Experimental\UserData\CacheData\audio_settings.json
Experimental\UserData\CacheData\voice_provider_selection.json
```

If custom voice path changes, either:

- update Settings UI `Voice Actor Profiles Root`, or
- edit `audio_settings.json`, or
- update defaults in `app_config.py` and `audio_settings.py` if this is now the new canonical development device.

## Recommended Handoff Workflow For Next AI

Before editing:

```powershell
Get-ChildItem Experimental -Force
python -m unittest discover -s Experimental\DevelopingData\Tests -p "test_engine_hardening.py"
python -m EngineData.LauncherApp.launcher_bootstrap --self-test
```

When debugging runtime:

1. Check `UserData\LogData\app_crash_latest.log`.
2. Check `UserData\LogData\app_crash_latest.json`.
3. Check latest benchmark and health JSON files in `UserData\LogData` and `UserData\CacheData`.
4. Check `DevelopingData\Reports\Engineering\DEEP_STABILITY_LATENCY_AUDIT_P11_REPORT.md`.
5. Use diagnostics under `DevelopingData\Diagnostics`.

When changing UI readiness:

1. Inspect `set_status()`.
2. Inspect `refresh_status_panel()`.
3. Inspect `update_start_button_state()`.
4. Inspect `handle_start_capture()`.
5. Inspect `handle_stop_capture()`.
6. Inspect `handle_pipeline_finished()`.
7. Add/update tests in `test_engine_hardening.py`.

When changing ASR/noise filtering:

1. Inspect `live_pipeline.py` audio evidence.
2. Inspect `vad_pipeline.py`.
3. Inspect `asr_quality_filter.py`.
4. Add tests for both rejection and valid speech acceptance.
5. Avoid adding heavy inference to the hot path.

When changing custom voice:

1. Inspect `tts_placeholder.py`.
2. Inspect `voice_provider_selection.py`.
3. Verify provider metrics are recorded.
4. Verify fallback is visible.
5. Verify no double playback.
6. Verify stop/start does not poison custom voice state.

## Existing Documentation Worth Reading

Core docs:

```text
DevelopingData\DocumentationData\SourceDocument\MASTER_PROJECT_DOCUMENTATION.md
DevelopingData\DocumentationData\SourceDocument\ProjectDocuments\PROJECT_CONTEXT.md
DevelopingData\DocumentationData\SourceDocument\ProjectDocuments\TRANSLATEIT_SYSTEM_WORKFLOW_DETAILED.md
DevelopingData\DocumentationData\SourceDocument\ProjectDocuments\TECHNICAL_NOTES.md
DevelopingData\DocumentationData\SourceDocument\Guides\MANUAL_TEST_GUIDE.md
DevelopingData\DocumentationData\SourceDocument\Guides\CUDA_SETUP_GUIDE.md
DevelopingData\DocumentationData\SourceDocument\Guides\CODEX_DEVELOPMENT_GUIDE.md
```

Recent engineering reports:

```text
DevelopingData\Reports\Engineering\DEEP_STABILITY_LATENCY_AUDIT_P11_REPORT.md
DevelopingData\Reports\Engineering\QUALITY_SAFE_LATENCY_BOOST_P11_REPORT.md
DevelopingData\Reports\Engineering\END_TO_END_LATENCY_BOOST_P10_REPORT.md
DevelopingData\Reports\Engineering\RUNTIME_PIPELINE_DEEP_REPAIR_REPORT.md
DevelopingData\Reports\Engineering\ENGINE_RECOVERY_GUIDE.md
DevelopingData\Reports\Engineering\ENGINE_ROUTE_MAP.md
```

Voice/custom actor research:

```text
DeveloperData\TechnicalDocumentation\VoiceLabResearch\VoiceLab_Research_Notes.md
DeveloperData\TechnicalDocumentation\VoiceLabResearch\VoiceLab_Research_Brief.md
```

## Engineering Principles For This Project

- Keep latency low, but do not hide readiness or stability problems.
- Prefer small safe fixes over broad rewrites.
- Keep the app local-only.
- Preserve CUDA-first behavior for real ASR unless the user explicitly accepts degraded CPU mode.
- Keep custom voice `marcel` as the testing default unless the user says otherwise.
- Do not modify `MainBackup` unless explicitly requested.
- Always validate with unit tests and launcher self-test after code changes.
- For UI state bugs, verify the visible text and the underlying engine state separately.
- For audio hallucination bugs, use general audio/text confidence signals, not only phrase blocklists.


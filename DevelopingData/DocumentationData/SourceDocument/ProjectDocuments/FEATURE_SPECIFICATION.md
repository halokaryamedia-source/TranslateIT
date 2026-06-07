# Feature Specification

## Status vocabulary

- Planned
- In Progress
- Testing
- Completed
- Needs Revision
- Deprecated

## Feature list

| Feature | Status | Purpose | Input | Output | Related engine | Related folder or files | Usage example | Development notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Documentation foundation | Completed | Keep the project rules and structure readable | Project requirements | Master docs and folder READMEs | Documentation layer | `MASTER_PROJECT_DOCUMENTATION.md`, `README.md` files | Read the master doc before any edit | This foundation is the current base line |
| Root structure governance | Completed | Preserve the approved root layout | Existing folders | Stable project root | Project layout | `DevelopingData/`, `EngineData/`, `UserData/` | Keep all work inside the approved tree | Do not invent new root folders |
| Transcript segment data model | Completed | Hold the accepted segment record | Segment metadata | Structured transcript segment | TranscriptEngine | `transcript_segment.py`, `transcript_session.py` | Store a segment ID, timestamps, text, status, replay paths, and latency metrics | Supports JSON conversion and legacy flat-field aliases |
| Microphone capture and calibration | Testing | Prepare clean input for speech processing | Mic device and raw audio | Calibrated stream and quality state | TranscriptEngine | `audio_capture.py`, `audio_calibration.py`, `audio_preprocessing.py` | Measure quiet noise, then normal speech | `sounddevice` is installed; diagnostics now use separate quiet and speech phases, support sensitivity settings, and allow low-but-usable input |
| VAD and segment builder | Testing | Finalize only valid speech segments | 20 to 30 ms frames | Accepted speech segment | TranscriptEngine | `vad_pipeline.py`, `segment_builder.py`, `live_pipeline.py` | Build a segment between speech and silence boundaries | Uses endpoint silence plus audio evidence gates for RMS, peak, SNR gap, and voiced-frame ratio before ASR |
| ASR transcription | Testing | Turn Indonesian speech into text | Validated audio segment | Indonesian transcript and quality report | TranscriptEngine | `asr_model_loader.py`, `asr_quality_filter.py`, `ModelData/` | Run Large V3 Turbo on CUDA with `float16` | Large V3 Turbo and Medium model assets are stored under `EngineData/TranscriptEngine/ModelData`; silence smoke test passed |
| Local translation | Testing | Translate the transcript into English | Finalized Indonesian transcript | English translation text | TranslateEngine | `translation_engine.py`, `translation_context.py`, `ModelData/` | Translate only accepted segments | NLLB distilled and MarianMT model assets are stored under `EngineData/TranslateEngine/ModelData`; Indonesian-to-English smoke tests passed |
| Transcript UI and replay | Testing | Show the accepted result to the user | Transcript segment | UI card and replay controls | LauncherApp | `transcript_view.py`, `ui_state.py`, `app_main.py`, `replay_controller.py` | Click the `IN` row to replay the source audio | Replay status handling, live worker wiring, and Windows WAV playback scaffold are present; replay is blocked while capture is active; Demo Test Mode writes an audible test tone |
| Cache and save handling | Testing | Keep temporary and saved data separate | Session audio and transcripts | Cache file or saved session | LauncherApp / UserData | `UserData/CacheData/`, `UserData/SavedData/`, `transcript_session.py` | Save the session only when the user chooses it | Cache and saved JSON helpers are smoke-tested; existing replay WAV files can be copied into saved session bundles |
| Explicit translated voice output | Testing | Play the English translation when the user asks for it | English translation text | Cached local WAV and speaker playback | TranslateEngine / LauncherApp | `tts_placeholder.py`, `app_main.py`, `replay_controller.py` | Click the `OUT` row on a transcript card after capture is stopped | Uses local Windows SAPI only after explicit user action; automatic TTS remains off by default and playback is blocked during capture |
| Silence hallucination rejection | Testing | Prevent no-speech ASR hallucinations from appearing as accepted cards | Silence/noise or weak audio plus ASR candidate | Rejected diagnostic/log event | LauncherApp / TranscriptEngine | `live_pipeline.py`, `asr_quality_filter.py` | Stay silent and verify no transcript card appears | Combines pre-ASR audio evidence with post-ASR no-speech and known hallucination phrase checks |
| Audio input/output settings | Testing | Make Windows-style audio device setup understandable | sounddevice device list | Simplified input/output selections | LauncherApp / TranscriptEngine | `audio_settings.py`, `audio_capture.py`, `app_main.py` | Open Menu -> Settings | Hides duplicate/technical devices by default, persists selected input/output, supports output test, and exposes Advanced Devices when needed |
| Latency benchmarking | Testing | Measure p50, p95, and worst-case timing | Test recordings | Benchmark summary | Shared / logging | LogData documents, `transcript_segment.py`, `benchmark_metrics.py` | Measure short phrase and normal sentence tests | Session benchmark summaries are available; real target-hardware numbers still need an interactive microphone pass |
| Windows automation scripts | Testing | Provide one setup, validation, diagnostic, and launch entry point | Project root | Runtime setup, validation report, launcher startup | Root / LauncherApp | `TranslateIT.bat`, `DevelopingData/ToolKitData/Scripts/`, `runtime_validation.py` | Double-click `TranslateIT.bat` | Root now exposes one active launcher; validation writes to `UserData/LogData/runtime_validation_latest.txt`; CUDA Core pass is required for normal real ASR readiness |
| Manual-test launcher panels | Testing | Expose runtime, model, microphone, capture, session, log, and benchmark state | Runtime and user actions | Visible desktop status and controls | LauncherApp | `app_main.py`, `app_logger.py`, `session_reporting.py` | Select capture mode and start capture | Long-running capture/model work stays in worker threads |
| Microphone diagnostics | Testing | Verify selected input device before ASR | Selected microphone | RMS, peak, noise floor, clipping, usable input report | TranscriptEngine | `microphone_diagnostic.py` | Click Run Diagnostic | Writes `UserData/LogData/microphone_diagnostic_latest.json` |
| CUDA Core readiness | Testing | Enforce target ASR acceleration requirement | NVIDIA driver, PyTorch runtime, CTranslate2 runtime | CUDA pass/fail/degraded status | LauncherApp | `cuda_validation.py`, `TranslateIT.bat`, `runtime_validation.py`, `app_main.py` | Choose CUDA setup from the launcher | CUDA-enabled PyTorch `cu126` repair flow is implemented and validated; real ASR modes are blocked unless `CUDA_CORE_PASS` or explicit CPU Degraded Mode is enabled |

## Feature notes

- The primary implementation path remains text output after translation.
- Direct speech-to-English-only translation is not the default path.
- Automatic TTS is intentionally left out of the default latency budget; `Speak OUT` is an explicit post-segment action.
- Placeholder translation is labeled explicitly until a real local model is wired.
- The live microphone worker now handles capture, calibration, VAD, ASR, translation, and segment emission outside the UI thread.
- ASR and translation fallback loading are explicit so local-model failures do not look like silent success.
- Mock Pipeline and mock translation modes are labeled in UI text and logs.
- Runtime reports and benchmark files are stored under `UserData/LogData`.
- CUDA is a Core App requirement, not an optional minor warning.

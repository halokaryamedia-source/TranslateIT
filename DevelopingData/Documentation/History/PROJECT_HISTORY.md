# Project History

## Development Log

### Current entry

- Version: `0.5.4-hidden-launcher-single-instance`
- Date: `2026-05-27`
- Status: Hidden GUI launcher and single-instance startup cleanup
- Short summary: Made `TranslateIT.bat` launch the app UI through a hidden internal launcher, added single-instance protection, added launcher crash logging, and removed the normal visible CMD window from everyday use.

### Important updates

- Added root and folder READMEs to define allowed content and naming rules.
- Created the master documentation and the detailed supporting documents.
- Documented the cascaded pipeline, local-first privacy rule, Large V3 Turbo default, Medium fallback, calibration flow, VAD rules, and latency planning.
- Prepared the first engine scaffold for LauncherApp, TranscriptEngine, and TranslateEngine.
- Added transcript latency, quality, and replay data models.
- Added audio preprocessing helpers for mono conversion, resampling, soft normalization, and noise gating.
- Added explicit placeholder behavior for translation and TTS when dependencies are missing.
- Added a PySide6 UI shell path with fallback console behavior when PySide6 is unavailable.
- Added config-backed ASR runtime profile creation from launcher settings.
- Added translation engine names to launcher config.
- Added cache-session JSON saving and saved-session JSON saving.
- Added microphone device validation, WASAPI availability checking, and short level-snapshot scaffolding.
- Added VAD rejection for unconfirmed speech and audio below calibrated energy threshold.
- Added UI shell action handlers for start or pause, save, settings, replay status, and copy status.
- Added in-memory audio capture scaffolding that reports missing `sounddevice`.
- Added ASR transcription wrapper that returns structured missing-dependency or transcription results.
- Added local-only translation model loading that does not use cloud or network translation by default.
- Added live pipeline worker wiring that emits calibration, segment, and error events back to the launcher UI.
- Added ASR backup loading behavior; CPU execution is now reserved for explicit CPU Degraded Mode when CUDA Core is not ready.
- Added translation fallback loading so the backup local model can be used when the primary local model fails.
- Added VAD speech-duration handling so endpoint silence does not inflate the minimum speech check.
- Added replay blocking while microphone capture is active so playback cannot feed back into live capture.
- Added saved-session bundle behavior that copies existing replay WAV files from cache into saved sessions.
- Added `ReplayController` for Windows WAV replay scaffolding.
- Created `DevelopingData/ToolKitData/rt` as the local development virtual environment.
- Installed `PySide6`, `sounddevice`, `faster-whisper`, `torch`, `transformers`, `sentencepiece`, `sacremoses`, and `numpy`.
- Downloaded Faster-Whisper Large V3 Turbo and Medium into `EngineData/TranscriptEngine/ModelData`.
- Downloaded NLLB distilled and MarianMT Indonesian-English into `EngineData/TranslateEngine/ModelData`.
- Corrected the NLLB target language handling so Indonesian input translates to English instead of the wrong target language.
- Corrected live pipeline endpointing latency so it uses measured trailing silence rather than the whole segment duration.
- Added session benchmark summary helpers for p50, p95, and worst-case latency timing.
- Added clearer rejected-segment transcript card placeholder text when translation is intentionally absent.
- Added the original setup, validation, and launch batch logic, now consolidated behind `TranslateIT.bat`.
- Added runtime validation reporting to `UserData/LogData/runtime_validation_latest.txt`.
- Added launcher event logging to `UserData/LogData/launcher_latest.log`.
- Added microphone diagnostic reporting to `UserData/LogData/microphone_diagnostic_latest.json`.
- Added benchmark exports to `UserData/LogData/benchmark_latest.json` and `UserData/LogData/benchmark_latest.txt`.
- Expanded the PySide6 launcher with runtime, model, microphone, capture, session, privacy, log, rejected-event, and benchmark panels.
- Added capture modes for Diagnostic Only, Mock Pipeline, Real ASR + Mock Translation, and Real ASR + Real Translation.
- Added accepted transcript card labels for segment ID, source text, translation text, model status, latency stages, copy controls, replay, and save/session status.
- Added `Replay IN` and `Speak OUT` controls to the clean transcript cards.
- Replaced silent Demo Test Mode replay WAVs with an audible local test tone.
- Added explicit local Windows SAPI translated voice WAV generation for `Speak OUT`; it is user-triggered only and blocked while capture is active.
- Simplified the Operator Console header to CUDA, Mic, and run-state badges plus one primary Start/Stop button.
- Made transcript `IN` and `OUT` rows the primary audio interaction and removed always-visible per-card replay/copy button clutter.
- Added simplified input and output audio device selection with Advanced Devices, sensitivity, output test, and persisted audio settings.
- Changed microphone diagnostic to separate noise measurement from speech measurement and added `Input low but usable`.
- Added worker-thread ASR preload messaging so CUDA/float16 model readiness is visible before capture processing.
- Added async TTS worker for OUT row clicks so local voice generation does not block the UI.
- Added cached translated audio reuse before regenerating OUT voice.
- Added local `HH:mm:ss` transcript timestamps and compact `EOS` latency badges.
- Added pre-ASR audio evidence rejection using RMS, peak, SNR gap, and voiced-frame ratio.
- Added post-ASR low-evidence hallucination rejection for no-speech candidates such as `Selamat menikmati`.
- Added latency fields for speech detection, model load, and TTS.
- Corrected the live capture loop so VAD, calibration, and microphone diagnostics use raw/resampled audio rather than soft-normalized audio.
- Split audio preprocessing into `prepare_for_vad` and `prepare_for_asr` so normalization can only happen after a segment is accepted.
- Added sustained speech gating before segment activation: short bursts must survive consecutive speech frames before ASR can run.
- Added hard pre-ASR reject reason codes: `rejected_silence`, `rejected_low_energy`, `rejected_low_snr`, `rejected_short_speech`, `rejected_unconfirmed_speech`, and `rejected_clipping`.
- Tightened post-ASR no-speech hallucination handling for phrases such as `Terima kasih telah menonton` and `Selamat menikmati` when audio evidence is weak or the confidence/duration pattern matches silence hallucination.
- Replaced default-device `winsound` replay with async `sounddevice` WAV playback that can target the selected output device when supported.
- Added automatic background OUT voice pre-generation after accepted translation so OUT clicks can replay cached WAV audio instead of generating from scratch.
- Updated the local translation engine to place Transformers models and generation tensors on CUDA when PyTorch CUDA is available, so translation latency is not silently CPU-bound on CUDA-ready systems.
- Added an auto-play translation-voice setting so accepted segments can speak immediately when TTS output is available.
- Added local TTS fallback support via `pyttsx3` if available, with Windows SAPI still available as a local offline fallback path.
- Reduced VAD speech-frame confirmation thresholds and short-speech duration requirements so normal speaking voice is less likely to be treated as too quiet.
- Wrote microphone threshold debug logs and latency debug logs from the runtime path so QA can inspect the actual stage timings.
- Confirmed zero-audio and low-noise smoke tests reject before ASR and do not create accepted transcript cards.
- Added a manual test guide under `ProjectDocuments`.
- Added a hidden GUI launcher script so normal double-click launch opens only the app UI.
- Added single-instance protection so a second launch shows a clean already-running message instead of opening another app copy.
- Added launcher crash logging so hidden startup failures still write a traceable error report.
- Updated the default user launch flow to keep CMD hidden during normal app use.
- Added a version snapshot utility and versioning guide to support safe V1 / Experimental refreshes.
- Added CUDA setup logic, now available from `TranslateIT.bat`.
- Added CUDA validation reports at `UserData/LogData/cuda_validation_latest.txt` and `.json`.
- Added CUDA Core App status classification: `CUDA_CORE_PASS`, `CUDA_CORE_FAIL`, `CUDA_CORE_WARN`, and `CPU_DEGRADED_AVAILABLE`.
- Added PyTorch CUDA tensor execution validation.
- Added CTranslate2/Faster-Whisper CUDA capability reporting when APIs are available.
- Added launcher buttons for CUDA status refresh, CUDA validation, CUDA setup guide, and explicit CPU Degraded Mode.
- Blocked real ASR modes by default when `CUDA_CORE_PASS` is not achieved.
- Added CUDA setup guide under `ProjectDocuments`.
- Confirmed `DevelopingData` is build-only and does not hold release-critical runtime models.
- Migrated the source-document content into the new documentation tree and removed the old root-level legacy documents from the planned final layout.

## Technical details

- Default ASR direction: `large-v3-turbo` on `cuda` with `float16`.
- Backup ASR direction: `medium`.
- Translation direction: separate local text translation after ASR.
- TTS direction: disabled by default.
- UI direction: Python plus PySide6.
- Preprocessing direction: numpy-backed mono conversion, resampling, soft normalization, and noise gate helpers.
- Session direction: transcript session JSON save/load helpers with cache and save path planning.
- Runtime config direction: ASR model, backup model, language, task, device, compute type, translation engine, privacy, cache, and saved-data paths are centralized in `EngineConfig`.
- VAD direction: low-energy and unconfirmed speech are rejected before ASR.
- ASR wrapper direction: validated audio can be passed to Faster-Whisper once dependencies and model files are installed.
- Translation direction: local model files are required for real local translation; placeholder mode stays explicit when they are unavailable.
- Live worker direction: capture, calibration, VAD, ASR, and translation now run in a background worker instead of the UI thread.
- Fallback direction: primary model loads may fall back to the backup local model when required by the documented runtime rules.
- VAD duration direction: minimum speech duration is evaluated separately from endpoint silence.
- Replay direction: replay uses existing WAV files only and must not be routed back into active microphone capture.
- Runtime model direction: ASR models belong in `EngineData/TranscriptEngine/ModelData`; translation models belong in `EngineData/TranslateEngine/ModelData`.
- Benchmark direction: session summaries report p50, p95, and worst-case stage timing, but real benchmark logs still require interactive microphone data.
- Manual-test direction: `TranslateIT.bat` is the supported setup, validation, CUDA, diagnostic, and launch path for Windows.
- Runtime logs now belong under `UserData/LogData`.
- CUDA direction: real ASR target performance requires `CUDA_CORE_PASS`; CPU execution is explicit degraded mode only.
- Known environment gap: `soffice` is still not installed for Word visual render QA.
- Word render QA gap: `soffice` is not available in this environment.

## Development timeline

| Version | Date | Status | Short summary | Main change |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-05-20 | Foundation rebuild in progress | Documentation-first base line created | Added the master documentation, detailed docs, log docs, folder READMEs, and the initial engine scaffold |
| 0.2.0 | 2026-05-20 | Prototype scaffold started | First implementation scaffold added | Added transcript session models, audio preprocessing, explicit placeholder translation behavior, and a basic UI shell entry point |
| 0.2.1 | 2026-05-20 | Prototype integration scaffold strengthened | Runtime and persistence scaffold strengthened | Added config-backed ASR profiles, cache-session JSON, saved-session JSON, VAD energy checks, device validation, and UI shell action handlers |
| 0.2.2 | 2026-05-20 | Prototype pipeline wiring scaffold started | Capture, ASR, translation, save bundle, and replay wiring started | Added in-memory capture result handling, ASR transcription wrapper, local-only translation loader, replay-audio copy behavior, and replay controller |
| 0.3.0 | 2026-05-20 | Local runtime dependencies and model assets installed | Runtime dependencies and local model assets installed | Installed the development runtime, placed ASR models under TranscriptEngine, placed translation models under TranslateEngine, and smoke-tested local ASR and translation |
| 0.3.1 | 2026-05-20 | Live pipeline wiring and fallback hardening | Live microphone worker and model fallback behavior added | Added the background live pipeline thread, endpoint silence fix, ASR backup loading, translation fallback loading, replay protection, and updated UI status handling |
| 0.3.2 | 2026-05-20 | Latency benchmark accounting and summary helpers | Benchmark latency accounting prepared for real microphone tests | Corrected endpointing latency accounting, added session benchmark p50/p95/worst-case summaries, and improved rejected-segment card text |
| 0.4.0-manual-test-ready | 2026-05-20 | Manual-test runnable foundation | Windows scripts, manual-test UI, diagnostics, logs, capture modes, and benchmark reporting added | Added setup/validate/run scripts, runtime validation logs, microphone diagnostics, full status panels, capture modes, session save/export controls, rejected-event logging, and manual testing documentation |
| 0.4.1-cuda-core-readiness | 2026-05-20 | CUDA Core readiness hardening | CUDA promoted to Core App requirement | Added CUDA validation reports, CUDA setup flow, PyTorch CUDA tensor execution checks, UI CUDA controls, CPU degraded-mode gating, benchmark CUDA classification, and CUDA setup documentation |
| 0.4.2-single-launcher | 2026-05-20 | Single launcher consolidation | Root launch flow simplified to one user-facing batch file | Added `TranslateIT.bat` menu and moved setup, validation, CUDA setup, launch, and microphone diagnostic batch flows into internal ToolKit scripts |
| 0.4.3-cuda-runtime-repair | 2026-05-20 | CUDA runtime repaired | PyTorch CUDA wheel installed and validated | Updated CUDA setup to use official `cu126` wheels with explicit confirmation, installed `torch 2.12.0+cu126`, and reached `CUDA_CORE_PASS` with CUDA tensor execution |
| 0.4.4-clean-operator-console | 2026-05-20 | Clean operator console UI | Main UI redesigned around the user-facing console | `TranslateIT.bat` now opens the app directly, the default PySide UI uses sidebar/header/transcript-card layout, and technical controls moved into Menu diagnostics |
| 0.4.5-audio-replay-voice-output | 2026-05-20 | Audio replay and explicit voice output fixed | Transcript audio controls made audible and user-controlled | Demo Test Mode now writes an audible replay tone, transcript cards expose `Replay IN` and `Speak OUT`, and translated voice output uses local Windows SAPI only after explicit user action |
| 0.4.6-ui-audio-cuda-calibration-fix | 2026-05-20 | Short-test quality fixes | UI simplified and current testing blockers reduced | Main header now shows only critical badges, transcript `IN`/`OUT` rows are clickable for audio, Settings has simplified input/output devices, calibration uses quiet plus speech phases, and real ASR preloads CUDA/float16 before capture processing |
| 0.4.7-latency-replay-vad-fix | 2026-05-20 | Latency, replay, and silence rejection fixes | Current short-test blockers addressed | Added async OUT voice generation, cached OUT replay reuse, timestamp/EOS card display, stricter pre-ASR silence rejection, post-ASR low-evidence hallucination filtering, and latency fields for speech/model/TTS stages |
| 0.4.8-runtime-vad-audio-repair | 2026-05-20 | Critical runtime repair | Raw-audio VAD, async replay, and hallucination gating corrected | Live capture now runs VAD on raw 16 kHz audio instead of normalized audio, ASR receives a separate accepted-speech path, ASR model caching is keyed by model/device/compute type, replay uses async `sounddevice` output, and silence/hallucination tests reject before transcript display |
| 0.4.9-qa2-audio-latency-mic-repair | 2026-05-21 | QA Stage 2 runtime repair | Translation voice auto-play, replay wiring, and mic threshold gating refined | Added local SAPI/pyttsx3 TTS fallback, auto-play translation voice setting, louder-speech sensitivity reductions, microphone threshold debug logs, and additional stage timing/report outputs for the latency bottleneck |
| 0.5.4-hidden-launcher-single-instance | 2026-05-27 | Hidden GUI launcher and single-instance cleanup | Normal launch no longer leaves a visible CMD window | Added an internal hidden launcher, single-instance protection, launcher logging, and crash logging for GUI startup |

## Critical revisions

| Revision ID | Date | Related version | Priority | Problem | Cause | Fix | Affected files | Prevention rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-0001 | 2026-05-20 | 0.1.0 | High | The source-document root contained legacy documents that did not match the approved clean layout | Early foundation documents were stored directly in `SourceDocument` root before the full documentation tree was defined | Migrate the content into the new documented substructure, keep the master doc as the source of truth, and remove the legacy root files from the final layout | `DevelopingData/DocumentationData/SourceDocument/` | Keep the source-document root limited to the approved master files only |
| CR-0002 | 2026-05-20 | 0.3.1 | High | Live segment finalization could reject speech incorrectly and translation context could duplicate accepted segments | Endpoint silence was not forwarded into the VAD decision path, and the translation context was extended without clearing the current snapshot first | Pass measured endpoint silence into the segment gate, clear the translation context before seeding the current window, add ASR and translation fallback loading, and block replay while microphone capture is active | `EngineData/LauncherApp/live_pipeline.py`, `EngineData/TranscriptEngine/asr_model_loader.py`, `EngineData/TranslateEngine/translation_engine.py`, `EngineData/LauncherApp/app_main.py` | Always validate endpoint metrics and context handling with smoke tests before calling the live pipeline complete |
| CR-0003 | 2026-05-20 | 0.3.2 | Medium | Reported total text latency could be inflated by the full speech segment duration | `endpointing_ms` was treated as segment duration instead of trailing silence after speech ended | Store endpointing latency from measured trailing silence and add session benchmark summaries for p50, p95, and worst-case timing | `EngineData/LauncherApp/live_pipeline.py`, `EngineData/TranscriptEngine/benchmark_metrics.py`, `EngineData/TranscriptEngine/transcript_session.py` | Benchmark total-after-EOS metrics must use post-speech latency stages, not full utterance duration |
| CR-0004 | 2026-05-20 | 0.4.0-manual-test-ready | High | Manual testing could not be started reliably from a fresh Windows terminal and recoverable runtime failures were not consistently logged | Root automation scripts, central runtime validation, launcher logging, microphone diagnostic reporting, and visible status panels were missing | Add setup, validation, runtime validation module, launcher log writer, microphone diagnostic report writer, status panels, capture modes, and benchmark exports | `EngineData/LauncherApp/`, `EngineData/TranscriptEngine/microphone_diagnostic.py`, `UserData/LogData/` | Manual-test readiness requires runnable scripts, visible UI status, and user-readable logs before declaring a version ready |
| CR-0005 | 2026-05-20 | 0.4.1-cuda-core-readiness | High | CUDA was treated as an optional warning even though Core App real ASR performance requires NVIDIA CUDA | Validation only checked `torch.cuda.is_available()` as a warning and real ASR modes could proceed without an explicit CUDA gate | Add CUDA Core validation with `nvidia-smi`, PyTorch CUDA build, CUDA tensor execution, CTranslate2 capability reporting, UI CUDA controls, and explicit CPU Degraded Mode gating | `EngineData/LauncherApp/cuda_validation.py`, `EngineData/LauncherApp/runtime_validation.py`, `EngineData/LauncherApp/app_main.py`, `TranslateIT.bat` | Real ASR modes must require `CUDA_CORE_PASS` unless the user explicitly enables CPU Degraded Mode |
| CR-0006 | 2026-05-20 | 0.4.2-single-launcher | High | The project root exposed multiple batch files and the user did not have one reliable launcher entry point | Setup, validation, CUDA setup, and app launch flows were separate root scripts | Consolidate the user entry point into `TranslateIT.bat` and move supporting batch flows into `DevelopingData/ToolKitData/Scripts` | `TranslateIT.bat`, `DevelopingData/ToolKitData/Scripts/`, root batch files | The root must expose exactly one active user-facing launcher batch file |
| CR-0007 | 2026-05-20 | 0.4.2-single-launcher | Medium | Launcher startup could fail if the primary launcher log file was temporarily unavailable | The app logger wrote directly to `launcher_latest.log` and allowed a file-system write error to escape during startup | Add a fallback `launcher_log_write_failure.log` path so log-write failures remain visible without crashing the desktop app | `EngineData/LauncherApp/app_logger.py` | Log writes must never be the reason a recoverable launcher startup fails |
| CR-0008 | 2026-05-20 | 0.4.3-cuda-runtime-repair | High | CUDA Core validation failed because the project runtime contained CPU-only PyTorch | Runtime setup had a valid Python environment but `torch.version.cuda` was `None`, so CUDA tensor execution could not run | Update CUDA setup to install official CUDA-enabled PyTorch wheels from `cu126` after explicit confirmation and verify actual CUDA tensor execution | `DevelopingData/ToolKitData/Scripts/setup_cuda_runtime_internal.bat`, `EngineData/LauncherApp/runtime_validation.py`, `EngineData/LauncherApp/app_main.py` | Core App readiness must require CUDA-enabled PyTorch and successful tensor execution, not just NVIDIA driver presence |
| CR-0009 | 2026-05-20 | 0.4.4-clean-operator-console | High | The first visible UI looked like a raw manual-test bench and the root launcher still showed a console menu by default | Technical panels and batch maintenance menu were exposed as the primary user experience | Redesign the default PySide UI into a clean operator console and make bare `TranslateIT.bat` open the app directly while preserving maintenance flags | `TranslateIT.bat`, `EngineData/LauncherApp/app_main.py`, `EngineData/LauncherApp/ui_theme.py` | The default user path must open the clean operator console; technical tools belong behind Menu/Diagnostics |
| CR-0010 | 2026-05-20 | 0.4.5-audio-replay-voice-output | High | User testing found no audible translation output and Demo/Test transcript replay produced no sound | TTS was only a disabled placeholder and Demo Test Mode wrote a silent WAV for source replay validation | Add explicit `Speak OUT` local Windows SAPI output and replace Demo Test Mode silence with an audible local test tone | `EngineData/TranslateEngine/tts_placeholder.py`, `EngineData/LauncherApp/live_pipeline.py`, `EngineData/LauncherApp/app_main.py` | Audio output must be either explicitly user-triggered or clearly labeled test audio, and replay smoke tests must verify the WAV is non-silent |
| CR-0011 | 2026-05-20 | 0.4.6-ui-audio-cuda-calibration-fix | High | Short testing showed the UI was still crowded, device settings were incomplete, Start state was unclear, and microphone low-input warnings were too strict | Main-screen controls exposed too much test scaffolding, audio output selection was missing, and calibration used overly strict single-phase assumptions | Minimize main UI, move details into Settings/Diagnostics, add input/output device settings, make Start/Stop stateful, and split microphone calibration into quiet and speech phases | `EngineData/LauncherApp/app_main.py`, `EngineData/LauncherApp/audio_settings.py`, `EngineData/TranscriptEngine/audio_capture.py`, `EngineData/TranscriptEngine/audio_calibration.py`, `EngineData/TranscriptEngine/microphone_diagnostic.py` | Normal user operation must stay visually minimal, and calibration must measure noise and speech separately before rejecting input |
| CR-0012 | 2026-05-20 | 0.4.7-latency-replay-vad-fix | Critical | Silence could be accepted as hallucinated text such as `Selamat menikmati`, and OUT voice generation could block the UI | Pre-ASR audio evidence checks were too weak and translated voice generation ran synchronously on click | Add pre-ASR RMS/peak/SNR/voiced-ratio rejection, post-ASR low-evidence hallucination checks, and background TTS generation with cached replay reuse | `EngineData/LauncherApp/live_pipeline.py`, `EngineData/TranscriptEngine/asr_quality_filter.py`, `EngineData/LauncherApp/app_main.py`, `EngineData/TranscriptEngine/transcript_segment.py` | No-speech candidates must be rejected before normal transcript display, and user-triggered audio generation must not block the UI thread |
| CR-0013 | 2026-05-20 | 0.4.8-runtime-vad-audio-repair | Critical | Previous short-test fixes still allowed no-speech cards because the live capture loop continued to run VAD on normalized/gated audio | `AudioPreprocessor.prepare()` soft-normalized the microphone frame before VAD, amplifying silence/noise and letting weak candidates reach ASR; replay also still depended on a default-output path | Route live VAD and microphone diagnostics through raw 16 kHz `prepare_for_vad`, send only accepted segments through `prepare_for_asr`, require sustained speech frames, cache ASR by model/device/compute type, and replace replay with async `sounddevice` output playback | `EngineData/LauncherApp/live_pipeline.py`, `EngineData/TranscriptEngine/audio_preprocessing.py`, `EngineData/TranscriptEngine/microphone_diagnostic.py`, `EngineData/LauncherApp/audio_playback.py`, `EngineData/LauncherApp/replay_controller.py`, `EngineData/TranscriptEngine/asr_model_loader.py` | Never run VAD on normalized audio; no-speech tests must assert ASR is not called before any runtime patch is reported as fixed |

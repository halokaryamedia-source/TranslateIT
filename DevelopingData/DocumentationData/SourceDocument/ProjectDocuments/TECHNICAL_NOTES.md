# Technical Notes

## 1. Technical rules

- Keep the pipeline local-first.
- Use cascaded speech recognition and translation.
- Preserve the source transcript and the translated text.
- Keep temporary cache separate from saved sessions.
- Keep all user-facing documentation in English.
- Keep placeholder behavior clearly labeled when a real dependency is missing.
- Keep anti-hallucination protection explicit in both code and documentation.

## 2. Technical decisions

| Decision | Selected value | Reason |
| --- | --- | --- |
| Default ASR model | Faster-Whisper Large V3 Turbo | Best balanced quality and latency for the target desktop GPU |
| Backup ASR model | Faster-Whisper Medium | Safer fallback when load, memory, or latency becomes unstable |
| Runtime target | `cuda` / `float16` | Matches the planned RTX 3070 test device |
| Source language | `id` | The first product scope is Indonesian speech |
| Target language | `en` | The first product scope is English text output |
| Translation engine | Local text translation after ASR | Preserves the original transcript and debugging traceability |
| Translation device | CUDA when PyTorch CUDA is available | Avoids silently keeping local Transformers translation on CPU in a CUDA-ready Core App runtime |
| TTS state | Explicit local output only | Protects latency and avoids echo feedback while still allowing user-requested translated voice playback |
| UI stack | Python + PySide6 | Matches the rest of the Python engine stack |
| Audio backend direction | `sounddevice` / PortAudio | Stable Python-first microphone capture path |
| Windows capture mode | WASAPI shared mode | Practical desktop capture mode for the target environment |
| Audio preprocessing | `audio_preprocessing.py` with numpy | Gives a clear place for mono conversion, resampling, normalization, and noise gating |
| VAD audio path | Raw 16 kHz mono without normalization | Prevents silence/noise from being amplified before speech detection |
| ASR audio path | Accepted speech only, lightly normalized | Keeps ASR input usable without letting normalization affect VAD decisions |
| Transcript session model | `transcript_session.py` | Centralizes JSON persistence, cache path planning, and save planning |
| Translation fallback behavior | Explicit placeholder mode | Avoids pretending a real local model is active when dependencies are missing |
| Runtime configuration | `app_config.py` | Keeps ASR, translation, TTS, cache, and privacy defaults in one launcher-owned config object |
| UI shell actions | Non-blocking handlers in `app_main.py` | Lets the first desktop shell expose start or pause, save, settings, replay status, and copy status without starting heavy inference |
| ASR transcription wrapper | `ASRModelLoader.transcribe_audio()` | Provides a clear future path from validated audio to Faster-Whisper while reporting missing dependencies safely |
| Local translation loader | `TranslationEngine.load_local_model()` | Attempts local-only model loading and avoids network or cloud translation by default |
| Replay controller | `replay_controller.py` plus `audio_playback.py` | Keeps source audio replay separate from microphone capture and supports async WAV playback through `sounddevice` |
| Live pipeline threading | Background `QThread` worker | Keeps capture, calibration, VAD, ASR, translation, and UI updates responsive |
| ASR fallback loading | Primary model then backup model | Preserves transcription continuity when the primary model fails |
| Translation fallback loading | NLLB then MarianMT | Preserves translation continuity when the primary model is unavailable or fails inference |
| Replay protection | Block replay while microphone active | Prevents replay audio from re-entering the live capture path |
| Translated voice output | Local Windows SAPI on explicit click | Provides offline `Speak OUT` playback without enabling automatic TTS by default |
| Runtime model placement | `EngineData/*/ModelData` | Keeps release-critical ASR and translation models out of `DevelopingData` |
| Development runtime environment | `DevelopingData/ToolKitData/rt` | Provides a local validation environment without making released app behavior depend on `DevelopingData` |
| Manual-test launcher | Single root `TranslateIT.bat` | Gives Windows users one repeatable setup, validation, diagnostic, and launch entry point |
| Normal launch mode | Hidden GUI launcher via `pythonw.exe` | Keeps CMD hidden for everyday app use while preserving explicit console menu modes for support and diagnostics |
| Single-instance protection | App-level lock in `EngineData/LauncherApp/single_instance.py` | Prevents double-running TranslateIT and keeps startup failures visible through logs and a clean message box |
| Runtime logs | `UserData/LogData` | Keeps validation, launcher, microphone, benchmark, and error reports with user runtime data |
| CUDA Core status | Required for real ASR target performance | Prevents silent CPU fallback and misleading benchmarks |
| Operator console UI | Sidebar, header badges, transcript cards, and Menu diagnostics | Keeps the primary workflow clean while preserving technical controls |
| Audio settings persistence | `UserData/CacheData/audio_settings.json` | Remembers selected input/output devices, sensitivity, and advanced-device preference without changing project layout |
| Microphone calibration flow | Quiet phase plus speech phase | Reduces false "input too low" results by measuring noise floor separately from speech level |
| Silence hallucination gate | Raw audio evidence before ASR plus confidence phrase filtering after ASR | Prevents silence or near-silence from becoming accepted transcript cards |
| TTS worker | Background QThread | Keeps OUT row voice generation from blocking the UI thread |

## 3. Reason for each decision

- Large V3 Turbo gives the best planned balance between quality and realtime latency.
- Medium is a practical backup when the primary model is unavailable.
- Local text translation keeps the source transcript visible and debuggable.
- TTS stays off as an automatic pipeline stage; translated voice output is generated only when the user clicks `Speak OUT`.
- PySide6 keeps the UI in the same language stack as the engine.
- Numpy-backed preprocessing is a lightweight fit for the first scaffold phase.
- VAD must not use soft-normalized audio. Soft normalization can amplify room noise, keyboard noise, or silent input enough to look like speech. Live capture therefore calls `prepare_for_vad()` for raw RMS/peak/SNR decisions and only calls `prepare_for_asr()` after the segment has passed sustained speech checks.
- Transcript session persistence belongs in the transcript layer so cache and save paths stay traceable.
- Runtime config now creates the ASR profile so `large-v3-turbo`, `medium`, `cuda`, `float16`, `id`, and `transcribe` remain consistent between documentation and code.
- Cache-session JSON and saved-session JSON are separated so temporary material remains under `UserData/CacheData` and approved saved sessions remain under `UserData/SavedData`.
- ASR transcription now has a callable wrapper so missing `faster_whisper` is reported as a structured result instead of a silent crash.
- Local translation model loading uses local files only; if local model files are unavailable, the result stays explicitly pending or placeholder.
- The live pipeline uses a background worker so the UI thread never handles microphone capture, ASR, or translation directly.
- The ASR loader can fall back to the backup model when the primary model load fails; CPU execution is allowed only after explicit CPU Degraded Mode approval when CUDA Core is not ready.
- The translation engine can fall back from NLLB to MarianMT when the primary local model is missing or inference fails.
- Local translation model inference moves the model and input tensors to CUDA when `torch.cuda.is_available()` is true. If CUDA is not available, the run is not target Core App performance and must be treated consistently with CPU Degraded Mode policy.
- Replay must stay blocked while the microphone worker is active to keep playback out of the live capture path.
- Replay audio copying only happens during save bundle behavior and only for files that already exist.
- Translation models must live under `EngineData/TranslateEngine/ModelData` because `DevelopingData` is build-only and may be excluded from release builds.
- ASR models must live under `EngineData/TranscriptEngine/ModelData` for the same runtime reason.
- `TranslateIT.bat` is the only approved user-facing root launcher and must not download models automatically.
- `TranslateIT.bat` now uses a hidden GUI launch path for the default no-argument run; explicit menu and validation modes remain available for support workflows.
- CUDA unavailable is a Core App failure for real ASR target performance. CPU fallback exists only as explicit CPU Degraded Mode.
- `CUDA_CORE_PASS` requires `nvidia-smi`, CUDA-enabled PyTorch, `torch.cuda.is_available()`, a non-null `torch.version.cuda`, and successful CUDA tensor execution.
- CUDA runtime repair uses official PyTorch CUDA wheels from `https://download.pytorch.org/whl/cu126` by default and logs to `UserData/LogData/cuda_setup_latest.txt`.
- The user-facing UI opens directly into the Operator Console; raw setup, diagnostics, logs, benchmark, and advanced modes are available through Menu instead of dominating the first screen.
- `Replay IN` uses the accepted source WAV. Demo Test Mode writes a local audible test tone so replay can be verified without a microphone pass.
- `Speak OUT` plays the cached translated WAV when available. Accepted translated segments can pre-generate OUT voice in a background worker so the click path is usually replay-only instead of generation plus replay.
- The replay controller uses `sounddevice` so selected output device routing can be attempted; if device targeting fails, playback can fall back to the Windows default output and log the limitation.
- `Speak OUT` remains blocked while capture is active for the same feedback-protection reason as source replay.
- Transcript cards use clickable `IN` and `OUT` rows as the primary audio interaction; visible per-card buttons are intentionally minimized.
- Input device lists hide Sound Mapper, virtual cable, loopback, and duplicate technical entries unless Advanced Devices is enabled.
- Output device selection is saved now, but the current Windows WAV playback backend uses the Windows default output until a direct-output playback backend is added.
- Real ASR preloads the Faster-Whisper model on the worker thread before live segment processing starts; failures on CUDA block real mode rather than silently loading CPU.
- Pre-ASR rejection combines segment RMS, peak, speech-to-noise gap, and voiced-frame ratio before calling Faster-Whisper.
- Post-ASR rejection combines no-speech probability, log probability, compression ratio, repetition checks, and low-audio-evidence hallucination phrase detection.
- TTS latency is stored in `LatencyMetrics.tts_ms`; speech detection and model-load instrumentation fields are also present for reports.

## 4. Possible alternatives

- Direct speech-to-English translation only.
- Cloud translation or cloud LLM correction.
- Aggressive noise suppression as the default first layer.
- Always-on TTS in the first prototype.
- Web UI instead of a Python desktop UI.

## 5. Risks

- Missing Python dependencies can block runtime integration.
- Wrong microphone selection can produce silent or clipped input.
- Overly aggressive filtering can drop valid speech.
- Under-filtering can let hallucinated text into the transcript.
- Latency can grow if the segment window is too long.
- Speaker output can re-enter the microphone path if replay or translated voice is allowed during capture.
- Placeholder translation can be mistaken for a real model if the UI does not label it clearly.
- Saving session bundles without path guards can leak data outside the approved storage folders.

## 6. Related files or folders

- `DevelopingData/DocumentationData/SourceDocument/MASTER_PROJECT_DOCUMENTATION.md`
- `DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/PROJECT_CONTEXT.md`
- `DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/SYSTEM_WORKFLOW.md`
- `EngineData/TranscriptEngine/`
- `EngineData/TranslateEngine/`
- `EngineData/LauncherApp/`
- `UserData/CacheData/`
- `UserData/LogData/`
- `UserData/SavedData/`
- `EngineData/TranscriptEngine/audio_preprocessing.py`
- `EngineData/TranscriptEngine/transcript_session.py`
- `EngineData/TranscriptEngine/benchmark_metrics.py`
- `EngineData/LauncherApp/app_config.py`
- `EngineData/LauncherApp/app_main.py`
- `EngineData/LauncherApp/replay_controller.py`
- `EngineData/LauncherApp/runtime_validation.py`
- `EngineData/LauncherApp/app_logger.py`
- `EngineData/LauncherApp/session_reporting.py`
- `EngineData/LauncherApp/cuda_validation.py`
- `EngineData/TranscriptEngine/microphone_diagnostic.py`
- `EngineData/TranscriptEngine/ModelData/`
- `EngineData/TranslateEngine/ModelData/`

## 7. Revision notes

- The initial source documents were merged into this new documentation structure.
- The source-document root is now intended to stay clean.
- The first implementation path is documentation-first and scaffold-only.
- The first code phase now includes transcript session, preprocessing, and explicit placeholder translation scaffolds.
- Version 0.2.1 strengthens the scaffold with config-backed ASR profiles, cache-session JSON, saved-session JSON, VAD energy gating, and UI action handlers.
- Version 0.2.2 starts pipeline wiring with in-memory capture, ASR transcription result handling, local-only translation loading, saved replay-audio copy behavior, and replay controller support.
- Version 0.3.0 installs the local development runtime dependencies and moves runtime model assets into EngineData so the app does not depend on build-only DevelopingData content.
- Version 0.3.1 wires the live microphone worker, endpoint silence handling, fallback loading, and replay protection into the first real runtime path.
- Version 0.3.1 also evaluates minimum speech duration separately from endpoint silence so short speech fragments do not pass only because they have long trailing silence.
- Version 0.3.2 corrects endpointing latency accounting and adds session benchmark summaries for p50, p95, and worst-case timing.
- Version 0.4.0-manual-test-ready adds Windows automation scripts, launcher status panels, microphone diagnostics, capture modes, runtime logs, benchmark exports, and manual testing documentation.
- Version 0.4.1-cuda-core-readiness promotes CUDA to a Core App requirement and gates real ASR modes behind CUDA validation or explicit CPU Degraded Mode.
- Version 0.4.3-cuda-runtime-repair installs CUDA-enabled PyTorch wheels and validates `CUDA_CORE_PASS` with actual tensor execution.
- Version 0.4.4-clean-operator-console redesigns the launcher into a CleanLook operator console and changes bare `TranslateIT.bat` to start the app directly.
- Version 0.5.4-hidden-launcher-single-instance changes the default start flow to hidden GUI launch, adds single-instance protection, and logs startup/crash failures instead of exposing a persistent CMD window.

## 8. Future improvement notes

- Add WebRTC noise suppression only if it proves useful.
- Add echo cancellation only when TTS or replay requires it.
- Add RNNoise or NVIDIA Broadcast support only later and only as optional layers.
- Add developer-only raw audio debug mode for troubleshooting.
- Add a real local translation model only after the dependency stack is installed and benchmarked.

## 9. Audio input rules

- Let the user choose the microphone device.
- Show a microphone input level meter.
- Capture at the native device rate when needed, then resample.
- Convert the ASR input to 16 kHz mono.
- Use a rolling buffer and 20 to 30 ms monitoring frames.
- Build speech segments between roughly 500 ms and 8 seconds.
- Do not run ASR on raw unvalidated chunks.
- Keep preprocessing steps explicit so later benchmark logs can isolate each stage.

## 10. VAD rules

- Start with light filtering.
- Use the shared headset-oriented noise configuration as the default.
- Keep minimum speech and silence thresholds configurable in the engine layer.
- Reject very short, clipped, or noise-dominated segments.
- Reject frames that do not confirm speech or stay below the calibrated energy threshold.
- Keep a developer-only raw debug mode for future troubleshooting.

## 11. Anti-hallucination rules

- Reject audio below the calibrated threshold.
- Reject audio that does not satisfy VAD.
- Reject very short segments.
- Reject severe clipping.
- Reject stationary background noise that dominates the segment.
- Reject segments that match app output echo.
- Reject high no-speech probability output.
- Reject low average log probability or repetitive nonsense output.
- Hide rejected silence from the normal transcript history unless Developer Mode is enabled.

## 12. Latency planning

- Measure final-output delay from the end of speech.
- Keep the ASR model warm in memory.
- Keep UI, capture, and inference on separate workers.
- Prefer shorter complete segments over one very long buffer.
- Plan for p50 total text latency around 1.0 to 1.5 seconds.
- Keep typical p95 total text latency below 2.5 seconds.
- Exclude TTS latency from the default text budget while TTS is disabled.
- Track capture, preprocessing, VAD, endpointing, ASR, translation, UI, and total-after-EOS timing from the start of the prototype.

## 13. Model selection

- Default ASR model: `large-v3-turbo`
- Backup ASR model: `medium`
- Fallback conditions: load failure, CUDA out-of-memory, GPU unavailable, repeated p95 latency misses, or manual Performance Mode selection
- Do not fall back because of one long sentence alone.

## 14. Benchmark method

1. Use the target desktop class hardware as the primary benchmark reference.
2. Measure short phrases, normal sentences, and longer noisy-room speech separately.
3. Record capture latency, endpointing latency, ASR latency, translation latency, UI latency, total text latency, p50, p95, and worst case.
4. Keep the benchmark logs in the log documentation, not in user transcript history.

## 15. Capture modes

- Diagnostic Only: microphone level and calibration behavior only.
- Mock Pipeline: labeled mock transcript and translation for UI/session verification.
- Real ASR + Mock Translation: real microphone, VAD, and ASR with labeled mock translation.
- Real ASR + Real Translation: local-only ASR and local-only translation.

## 16. Runtime reports

- Runtime validation: `UserData/LogData/runtime_validation_latest.txt`
- CUDA validation: `UserData/LogData/cuda_validation_latest.txt` and `cuda_validation_latest.json`
- Launcher log: `UserData/LogData/launcher_latest.log`
- Microphone diagnostic: `UserData/LogData/microphone_diagnostic_latest.json`
- Benchmark summary: `UserData/LogData/benchmark_latest.json` and `benchmark_latest.txt`


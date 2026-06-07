# MASTER PROJECT DOCUMENTATION

## Document control

- Project name: TranslateIT
- Current version: 0.4.7-latency-replay-vad-fix
- Status: Latency instrumentation, async translation voice, CUDA enforcement, and silence hallucination rejection patch
- Last updated: 2026-05-20
- Single source of truth: Yes

## 1. Project overview

TranslateIT is a local-first desktop application for Indonesian microphone speech input translated into English text.
The first target product scope preserves the original Indonesian transcript, the English translation, timestamps, latency indicators, quality status, and replay support for each accepted speech segment.

## 2. Project purpose

- Convert spoken Indonesian into readable English text with clear traceability.
- Preserve both the original transcript and the translation for debugging and review.
- Keep the first implementation practical, local-first, and suitable for the target desktop hardware.

## 3. Current development status

- Documentation foundation created.
- Master documentation established as the single source of truth.
- Engine scaffolds prepared inside the approved `EngineData` folders.
- Transcript session, audio preprocessing, and UI shell scaffolds added.
- Runtime config now drives ASR profile selection, translation engine names, cache paths, and saved-data paths.
- Cache-session and saved-session JSON helpers are implemented and smoke-tested with temporary paths.
- VAD gating now rejects unconfirmed speech and audio below the calibrated energy threshold.
- The PySide6 UI shell has non-blocking button handlers for start or pause, save, replay status, copy status, and settings status.
- Audio capture now has an in-memory capture interface that reports missing `sounddevice` clearly.
- ASR now has a transcribe wrapper that reports missing `faster_whisper` clearly and can use Faster-Whisper when installed.
- The translation engine now attempts local-only model loading when local model files are available and otherwise stays in explicit placeholder or pending-local-model mode.
- The live pipeline is wired through a background worker thread that emits calibration, segment, and error events back to the launcher UI.
- The ASR loader now tries the backup model when the primary model fails; CPU execution is reserved for explicit CPU Degraded Mode when CUDA Core is not ready.
- The translation engine now tries the backup local model when the primary local model is unavailable or fails inference.
- Noise rejection now uses one shared headset-oriented configuration for both VAD and post-ASR quality filtering.
- The VAD gate now distinguishes actual speech duration from endpoint silence to avoid short-speech false accepts.
- Replay is blocked while the microphone worker is active so playback does not feed back into live capture.
- Saved-session bundling can copy existing replay WAV audio from cache into `UserData/SavedData/SavedTranscript/`.
- Replay handling has a Windows WAV playback scaffold that does not feed audio back into the microphone pipeline.
- Local prototype runtime dependencies are installed in `DevelopingData/ToolKitData/rt` for development testing.
- Runtime model assets are stored under `EngineData/TranscriptEngine/ModelData` and `EngineData/TranslateEngine/ModelData` so the app does not depend on `DevelopingData` for release-critical models.
- Real local translation was smoke-tested from `EngineData/TranslateEngine/ModelData`.
- Faster-Whisper Large V3 Turbo was downloaded and smoke-tested from `EngineData/TranscriptEngine/ModelData`.
- Latency accounting now measures endpointing as the measured trailing silence instead of the full speech segment duration.
- Transcript sessions can now produce p50, p95, and worst-case benchmark summaries for latency stages.
- The root `TranslateIT.bat` launcher now provides setup, CUDA validation, runtime validation, app start, microphone diagnostic, logs, and guide access.
- The PySide6 launcher now exposes runtime, model, microphone, capture, session, privacy, log, and benchmark status panels.
- Microphone diagnostic and calibration reporting writes to `UserData/LogData/microphone_diagnostic_latest.json`.
- Capture modes now include Diagnostic Only, Mock Pipeline, Real ASR + Mock Translation, and Real ASR + Real Translation.
- Benchmark reports write to `UserData/LogData/benchmark_latest.json` and `UserData/LogData/benchmark_latest.txt`.
- CUDA is now a Core App requirement for target real ASR performance.
- CUDA validation checks `nvidia-smi`, PyTorch CUDA build, `torch.cuda.is_available()`, CUDA tensor execution, and CTranslate2 capability when available.
- CUDA setup now repairs CPU-only PyTorch by installing CUDA-enabled PyTorch wheels from the official `cu126` index after explicit user confirmation.
- Real ASR modes are blocked unless `CUDA_CORE_PASS` is achieved or the user explicitly enables CPU Degraded Mode.
- CPU Degraded Mode is labeled as slower and not target Core App performance.
- The default UI is now a CleanLook Operator Console with sidebar, header badges, Start/Menu controls, and transcript cards; technical panels live inside the app Menu.
- Transcript cards now separate `Replay IN` source-audio playback from explicit `Speak OUT` local English voice output.
- Demo Test Mode writes an audible local test tone for replay validation instead of a silent WAV.
- English voice output is local Windows SAPI, generated only after the user presses `Speak OUT`, and remains blocked while capture is active.
- Transcript cards now use clickable `IN` and `OUT` rows as the primary replay interaction.
- Header badges were reduced to the critical moment-by-moment state: CUDA, microphone, and listening/processing status.
- Settings now includes simplified input and output device selection, sensitivity, output test, advanced-device toggle, and use-anyway handling for low-but-usable input.
- Microphone diagnostics now separate quiet noise-floor measurement from normal speech measurement to reduce false low-input warnings.
- Real ASR model preloading runs before capture processing on the worker thread and reports the active CUDA/float16 policy.
- OUT voice generation now runs in a background worker and records TTS latency so row clicks do not block the UI.
- Silence and low-evidence segments are rejected before ASR using RMS, peak, speech-to-noise gap, and voiced-frame ratio.
- Post-ASR filtering rejects known no-speech hallucination candidates such as `Selamat menikmati` when audio evidence is low.
- Transcript cards show local `HH:mm:ss` timestamps and compact `EOS` latency.
- Microphone backend discovery is available through `sounddevice`; live capture still needs an interactive run and calibration pass.
- The live pipeline still needs a full interactive Indonesian speech pass before benchmark numbers are meaningful.
- Word visual render QA is not available in this environment because `soffice` is missing.

## 4. Current version

- Version: `0.4.7-latency-replay-vad-fix`
- Meaning: double-clicking the single root launcher opens the clean operator console directly; real ASR remains CUDA-first, silence hallucinations are rejected, transcript cards show clear timestamps and EOS latency, and IN/OUT audio clicks are asynchronous and cache-aware

## 5. Main folder structure

```text
Developing/
|-- DevelopingData/
|   |-- DocumentationData/
|   |   |-- LogData/
|   |   `-- SourceDocument/
|   |-- SampleData/
|   `-- ToolKitData/
|-- EngineData/
|   |-- LauncherApp/
|   |-- TranscriptEngine/
|   `-- TranslateEngine/
`-- UserData/
    |-- CacheData/
    |-- LogData/
    `-- SavedData/
`-- TranslateIT.bat
```

## 6. Documentation map

- `DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/PROJECT_CONTEXT.md`
- `DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/SYSTEM_WORKFLOW.md`
- `DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/FEATURE_SPECIFICATION.md`
- `DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/TECHNICAL_NOTES.md`
- `DevelopingData/DocumentationData/SourceDocument/Guides/CODEX_DEVELOPMENT_GUIDE.md`
- `DevelopingData/DocumentationData/SourceDocument/Guides/MANUAL_TEST_GUIDE.md`
- `DevelopingData/DocumentationData/SourceDocument/Guides/CUDA_SETUP_GUIDE.md`
- `DevelopingData/DocumentationData/LogData/DEVELOPMENT_LOG.md`
- `DevelopingData/DocumentationData/LogData/VERSION_HISTORY.md`
- `DevelopingData/DocumentationData/LogData/CRITICAL_REVISION_LOG.md`

## 7. Engine overview

### LauncherApp
- Owns the desktop application entry point and UI state coordination.
- Keeps the UI separate from the audio and model engines.

### TranscriptEngine
- Owns microphone capture, calibration, VAD, segment building, ASR loading, and quality filtering.
- Produces accepted transcript segments for the UI and translation layer.
- Owns transcript session data, latency metrics, quality metrics, replay paths, and audio preprocessing helpers.

### TranslateEngine
- Owns local text translation and future TTS placeholder behavior.
- Works on finalized accepted transcript segments only.

## 8. TranslateIT workflow overview

1. The app launches and loads configuration defaults.
2. The user selects a microphone device.
3. The app measures input level and runs first-use calibration.
4. The audio stream is buffered, normalized lightly, and passed through VAD.
5. A speech segment is finalized only after the speech and silence rules are satisfied.
6. Faster-Whisper Large V3 Turbo performs Indonesian ASR by default.
7. The original Indonesian transcript is kept.
8. A separate local translation engine converts the transcript to English.
9. The UI shows timestamp, latency, quality, and replay controls for the accepted segment.
10. The segment can be cached, copied, saved, or replayed without feeding back into live capture.

## 9. Active features

- Documentation-first project control
- Local-first development rule
- Cascaded pipeline selection
- Large V3 Turbo as the default ASR model
- Medium as the backup ASR model
- Separate Indonesian transcript and English translation storage
- Replay support for accepted segments
- Live pipeline thread wiring for capture, calibration, VAD, ASR, and translation
- Fallback loading for ASR and translation local models
- Temporary cache versus saved-data separation
- TTS disabled by default
- Python plus PySide6 desktop UI target
- Transcript session persistence scaffold
- Audio preprocessing and timing metric scaffold
- Runtime config and ASR profile scaffold
- Cache-session and saved-session JSON scaffold
- UI action-handler scaffold
- In-memory audio capture interface scaffold
- ASR transcription wrapper scaffold
- Local-only translation model loading scaffold
- Saved replay-audio copy scaffold
- Windows WAV replay scaffold
- Local runtime dependency environment for development validation
- Local ASR model assets under `EngineData/TranscriptEngine/ModelData`
- Local translation model assets under `EngineData/TranslateEngine/ModelData`
- Latency benchmark summary helpers for p50, p95, and worst-case stage timing
- Single root launcher with internal setup, validation, CUDA, diagnostic, and app start actions
- Runtime status panel
- Microphone diagnostic panel
- Capture mode selector
- Accepted transcript cards with model and latency labels
- Rejected segment log area
- Runtime event log panel
- Benchmark report export to `UserData/LogData`
- CUDA Core validation reports
- CUDA setup helper script
- Explicit CPU Degraded Mode control

## 10. Planned features

- Full target-hardware manual benchmark pass
- One shared headset-oriented noise configuration
- Session save and load behavior
- Saved folder open action
- Optional manual speak mode and auto speak mode later
- Optional cloud mode only if explicitly approved later

## 11. Current technical rules

- Use a local-first cascaded speech translation pipeline.
- Do not use direct speech-to-English-only translation as the default.
- Transcribe Indonesian speech first, then translate the transcript.
- Keep the runtime identifiers explicit in documentation and code:

```text
default_asr_model = "large-v3-turbo"
backup_asr_model = "medium"
```

- Keep TTS disabled by default during the first stable implementation.
- Keep audio input in 16 kHz mono for ASR.
- Use light filtering first, not aggressive noise suppression.
- Reject silence, clipping, and obvious hallucination before display.
- Translate only finalized accepted speech segments by default.
- Keep a short rolling context window of the last two to three accepted segments.
- Never let old context overwrite the current sentence meaning.
- Do not upload audio or transcript data to cloud services by default.

## 12. Codex working rules

- Always read this document before editing project files.
- Always read the related folder `README.md` before creating or editing files there.
- Do not create new root folders without approval.
- Do not place documentation files randomly.
- Do not place engine files inside documentation folders.
- Do not place user data inside engine folders.
- Use clear English names only.
- Update documentation after major changes.
- Update `LogData` only for important or critical changes.
- Keep the project structure clean.
- Never skip validation before reporting completion.

## 13. Important project decisions

- Default ASR model: Faster-Whisper Large V3 Turbo.
- Backup ASR model: Faster-Whisper Medium.
- Runtime ASR model storage: `EngineData/TranscriptEngine/ModelData`.
- Default runtime target: `cuda` with `float16`.
- Translation strategy: separate local text translation after ASR.
- Default translation candidate: NLLB distilled model.
- Lightweight translation fallback: MarianMT Indonesian-English model.
- Runtime translation model storage: `EngineData/TranslateEngine/ModelData`.
- `DevelopingData` is build-only and must not contain release-critical runtime models.
- TTS state: disabled by default.
- Audio backend direction: Python-first with `sounddevice` / PortAudio.
- Windows mode direction: WASAPI shared mode.
- UI stack: Python + PySide6.
- Privacy: local-only by default.
- Saved transcript bundles live under `UserData/SavedData/SavedTranscript/`.

## 14. Current known issues

- The development runtime packages are installed in `DevelopingData/ToolKitData/rt`, but release packaging still needs a final runtime strategy.
- Live microphone calibration has not been completed interactively yet.
- Full PySide6 visible event-loop testing still requires a user desktop session.
- Real ASR was smoke-tested with silence only; Indonesian microphone speech still needs live test data.
- CUDA Core validation currently passes on the target development machine with NVIDIA GeForce RTX 3070, PyTorch `2.12.0+cu126`, and successful CUDA tensor execution.
- `soffice` is not available, so DOCX visual render QA cannot be completed here.
- The early legacy source documents were present in the `SourceDocument` root and had to be consolidated into the new documentation set.

## 15. Pending tasks

- Run real audio capture and calibration with the selected microphone in a visible user session.
- Run the PySide6 UI in an interactive user session.
- Record real benchmark numbers in `LogData` after an interactive microphone pass.
- Decide how optional TTS will be enabled later.
- Expand structured persistence to copy replay audio when the user saves a session.
- Wire the live UI to session storage and replay handling once dependencies are installed.
- Keep placeholder translation clearly labeled until the real local model is wired.

## 16. Next development direction

- Keep the current scaffold minimal and clean.
- Add implementation only inside the approved engine folders.
- Validate imports and config loading before expanding behavior.
- Build the first balanced prototype around accepted speech segments only.
- Use `TranslateIT.bat` as the only user-facing root launcher.

## 17. Links to detailed documents

- [Project Context Document](ProjectDocuments/PROJECT_CONTEXT.md)
- [System Workflow Document](ProjectDocuments/SYSTEM_WORKFLOW.md)
- [Feature Specification Document](ProjectDocuments/FEATURE_SPECIFICATION.md)
- [Technical Notes Document](ProjectDocuments/TECHNICAL_NOTES.md)
- [Codex Development Guide](Guides/CODEX_DEVELOPMENT_GUIDE.md)
- [Manual Test Guide](Guides/MANUAL_TEST_GUIDE.md)

## 18. Links to LogData documents

- [Development Log](../LogData/DEVELOPMENT_LOG.md)
- [Version History](../LogData/VERSION_HISTORY.md)
- [Critical Revision Log](../LogData/CRITICAL_REVISION_LOG.md)


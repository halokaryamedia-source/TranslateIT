# Engine Translate Runtime Modules

This folder contains Rust-side TranslateIT runtime logic.

## Runtime foundation
- `mod.rs`: public engine facade used by Tauri commands.
- `state.rs`: shared command/lifecycle result types.
- `config.rs`: engine configuration defaults.
- `paths.rs`: project and user data path resolution.
- `settings.rs`: runtime settings load/save model.
- `hardware.rs`: native CPU/RAM usage sampler and honest GPU usage status.

## Audio runtime
- `audio/`: microphone input, capture plan, calibration, VAD, buffering, preprocessing, and live capture runtime.

## Translation/runtime planning
- `adapters/`: planning and validation logic for ASR, translation, playback, latency, session metrics, and runtime gates.
- `inference/`: native inference/backend validation helpers.
- `native_execution.rs` and `native_runners.rs`: native execution planning and runtime candidates.

## Session/data persistence
- `session_chat.rs`: launcher chat persistence under `UserData/SavedProject/Chat`.
- `session_store.rs`: saved transcript JSON output under `UserData/SavedProject/SavedTranscript`.
- `transcript.rs` and `transcript_session.rs`: transcript/session planning data.
- `runtime_state.rs` and `runtime_job.rs`: runtime ownership and job/session state.

## Logging and diagnostics
- `logging.rs`: runtime JSONL event logging.
- `diagnostics.rs`: runtime diagnostics and CUDA/GPU readiness reporting.

## Maintenance rule
Keep engine logic here. Do not put translation, audio, hardware, or persistence logic directly inside frontend files or the Tauri `main.rs` command registration file.

# Live Capture Runtime Progress Report

Date: 2026-06-14
Branch: `ChatGPT-ConvertEngine`
Scope: internal runtime cleanup after UI cleanup. Owner manual testing remains blocked until internal readiness is complete.

## Completed in this pass

### 1. Added CPAL live capture runtime owner

New module:

`EngineData/LauncherApp/RustApp/src-tauri/src/engine/audio/live_capture.rs`

The module adds explicit microphone stream ownership for the Rust runtime:

- Opens the default CPAL input stream.
- Stores the live stream in a single runtime owner guarded by `OnceLock<Mutex<Option<...>>>`.
- Blocks duplicate stream starts while a stream is already active.
- Drops the stream on Stop to release microphone ownership.
- Tracks stream metadata and callback status.
- Reports frame count from the CPAL callback.
- Reports callback errors without panicking.

### 2. Connected Start/Stop lifecycle to live capture

`start_capture()` now:

- Checks the existing lifecycle gate.
- Uses the full realtime handoff session if it is ready.
- Creates a direct microphone-only session if full realtime handoff is not ready yet.
- Starts live CPAL microphone capture after a session is recorded.
- Returns `listening` only when live capture starts successfully.
- Clears session state if microphone stream start fails.

`stop_capture()` now:

- Stops and releases live microphone stream ownership first.
- Clears runtime session state.
- Clears handoff state.
- Logs the stop result.

### 3. Added live capture status command

New Tauri command:

`get_live_capture_status`

This exposes live capture state to the frontend/developer diagnostics.

### 4. Runtime status bundle now includes live capture

`RuntimeStatusBundleReport` now includes:

- `live_capture.stream_active`
- `live_capture.device_name`
- `live_capture.sample_rate_hz`
- `live_capture.channels`
- `live_capture.frames_received`
- `live_capture.callback_error_count`
- `live_capture.note`

The bundle now uses live capture status to set `next_action` and summary.

### 5. Frontend now shows true live capture state

The frontend runtime status now reads `live_capture` from the bundle and updates:

- Capture pill: `Mic Active` when stream is active.
- Runtime footer: `Listening` when live capture is active.
- Runtime notes: microphone active state, frame count, and input device.
- Developer diagnostics: includes `get_live_capture_status` result.

## Current limitations

This pass does not complete the full speech-to-speech pipeline.

Still pending:

- Audio frame buffering from CPAL callback into the ASR pipeline.
- Resampling/downmixing to target 16 kHz mono when the device default differs.
- VAD-based segmentation from live microphone frames.
- ASR execution.
- Translation execution.
- TTS/playback execution.
- Internal build/typecheck validation.
- Packaging validation.

## Status

The app is now closer to a real Rust/Tauri runtime because Start/Stop can own a live microphone stream internally. However, the branch is still not ready for owner validation or production because speech-to-speech execution is not end-to-end yet.

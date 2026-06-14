# ASR Consume Guard Progress Report

Date: 2026-06-14
Branch: `ChatGPT-ConvertEngine`

## Completed

Added ASR duplicate/consume guard state in:

`EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/live_asr_boundary_logic.rs`

The ASR boundary now tracks:

- `duplicate_of_last_success`
- `last_consumed_segment_id`
- `last_consumed_unix_ms`
- `consume_after_success_only`
- `duplicate_guard_key`

A new consume guard function was added:

`mark_live_asr_segment_consumed_after_success()`

This intentionally only marks a segment as consumed after a successful decoder call. Since the decoder is still not connected, no segment is consumed yet and no transcript is claimed.

## Still pending

- Native ASR decoder connection.
- Actual ASR model execution.
- Real transcript output.
- Translation execution.
- TTS/playback.
- Internal Rust/typecheck/build validation.
- Packaging validation.

## Status

Internal duplicate/consume guard is prepared. The app still must not claim ASR is working until the native decoder is connected and validated.

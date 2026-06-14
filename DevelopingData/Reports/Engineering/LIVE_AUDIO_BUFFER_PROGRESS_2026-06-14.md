# Live Audio Buffer Progress Report

Date: 2026-06-14
Branch: `ChatGPT-ConvertEngine`
Scope: continue internal runtime cleanup after CPAL live capture ownership.

## Completed in this pass

### 1. Added live audio rolling buffer

New module:

`EngineData/LauncherApp/RustApp/src-tauri/src/engine/audio/live_audio_buffer.rs`

This module adds a small rolling in-memory audio buffer for live microphone input.

It tracks:

- Whether audio has been received.
- Device sample rate and channel count.
- Target format: 16 kHz mono.
- Buffered sample count.
- Buffered duration in milliseconds.
- Total frames received.
- Whether resampling is required before target pipeline use.
- Whether downmixing is required before target pipeline use.
- Audio evidence metrics such as RMS and peak.
- VAD gate result.
- Readiness for VAD.
- Readiness for segment pipeline.
- Human-readable blocker and note.

### 2. Connected CPAL callbacks to the rolling buffer

The live capture callback now feeds audio chunks into the rolling buffer:

- `f32` samples are clamped and downmixed to mono for evidence/VAD evaluation.
- `i16` samples are converted to `f32`, clamped, and downmixed.
- `u16` samples are converted to centered `f32`, clamped, and downmixed.

The existing frame counter still remains active.

### 3. Start/Stop now reset and clear the buffer

On Start:

- The live audio buffer is reset using the selected CPAL stream sample rate and channel count.
- If stream build or stream play fails, the buffer is cleared.

On Stop:

- The live stream ownership is released.
- The rolling audio buffer is cleared so stale audio cannot leak into the next runtime session.

### 4. Runtime status bundle now exposes buffer status

`RuntimeStatusBundleReport` now includes:

- `live_audio_buffer`
- `live_audio_buffer.ready_for_vad`
- `live_audio_buffer.ready_for_segment_pipeline`
- `live_audio_buffer.buffered_duration_ms`
- `live_audio_buffer.requires_resample_to_target`
- `live_audio_buffer.requires_downmix_to_target`
- `live_audio_buffer.evidence`
- `live_audio_buffer.vad_result`
- `live_audio_buffer.blocker`

`next_action` now accounts for live audio state:

- If segment pipeline is ready: `feed_live_segment_to_asr_pipeline`
- If VAD is ready but segment format is not ready: `prepare_resample_or_segment_boundary`
- If microphone is active: `continue_listening_or_stop`

## Current limitations

This pass does not yet perform real ASR execution.

Still pending:

- Actual resampling implementation to 16 kHz.
- Confirmed target-format segment extraction.
- Feeding accepted segment audio into ASR execution.
- ASR model execution.
- Translation execution.
- TTS/playback execution.
- Internal build/typecheck validation.
- Frontend detailed buffer display still needs one more update pass; the runtime bundle already contains the data.

## Status

The runtime is now closer to a real speech pipeline:

`CPAL microphone stream -> rolling audio buffer -> audio evidence -> VAD readiness -> segment pipeline readiness`

The branch remains internal-development only and is still not ready for owner validation or production.

# Target Segment Extraction Progress Report

Date: 2026-06-14
Branch: `ChatGPT-ConvertEngine`
Scope: continue internal runtime work after live audio buffer and VAD readiness.

## Completed in this pass

### 1. Added target-format segment extraction

`EngineData/LauncherApp/RustApp/src-tauri/src/engine/audio/live_audio_buffer.rs` now includes `LiveTargetSegmentReport` and `live_target_segment_snapshot()`.

This creates a target ASR-ready audio snapshot when the live buffer passes readiness checks.

The target segment is:

- `AudioFrame`
- 16 kHz sample rate
- mono channel
- normalized `f32` samples
- created from the latest live rolling buffer window

### 2. Added internal linear resampling

If the microphone device uses a sample rate other than 16 kHz, the target segment extractor now applies simple linear interpolation resampling into 16 kHz.

This is intentionally implemented as a minimal internal bridge so the next ASR stage has a consistent input shape. It is not yet claimed as a final high-quality audio DSP solution.

### 3. Corrected downmix semantics

The live buffer stores mono samples after downmixing from the source device channels. Therefore, the segment path no longer blocks just because the source microphone device has more than one channel.

The status now distinguishes:

- `source_channels`
- `buffer_channels`
- `source_downmixed_to_mono`
- `target_channels`

### 4. Added target ASR frame readiness

The live audio buffer now reports:

- `ready_for_vad`
- `ready_for_segment_pipeline`
- `ready_for_target_asr_frame`

The target segment report now reports:

- `ready`
- source sample rate and source channels
- target sample rate and target channels
- source and target duration
- source and target sample count
- whether resampling was applied
- whether downmixing was applied
- final target-frame evidence
- final target-frame VAD result
- optional `AudioFrame`
- blocker and note

### 5. Runtime status bundle now includes target segment state

`RuntimeStatusBundleReport` now includes:

- `live_target_segment`

`next_action` now accounts for target segment readiness:

- `send_target_segment_to_asr_execution` when a target ASR frame is ready
- `extract_target_asr_frame` when buffer is ready for extraction
- `continue_collecting_until_segment_ready` when VAD is ready but segment is still too short
- `continue_listening_or_stop` when microphone is active but audio is not ready yet

## Current pipeline after this pass

Current internal path:

`CPAL microphone stream -> rolling mono buffer -> audio evidence -> VAD readiness -> target 16 kHz mono AudioFrame extraction -> ASR-ready segment report`

## Still pending

This pass does not complete speech-to-speech.

Still pending:

- Real ASR execution using the target `AudioFrame`.
- Model path readiness and model loading policy.
- Segment consume/clear policy after ASR so repeated ASR calls do not process the same audio forever.
- Translation execution.
- TTS/playback execution.
- Internal Rust/typecheck/build validation.
- Packaging validation.

## Status

The runtime is now ready for the next engineering step: connect `live_target_segment.frame` into an ASR execution boundary. The branch remains internal-development only and is not ready for owner validation or production.

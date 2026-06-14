# Live ASR Boundary Progress Report

Date: 2026-06-14
Branch: `ChatGPT-ConvertEngine`
Scope: continue internal runtime work after target ASR-ready audio segment extraction.

## Completed in this pass

### 1. Added live ASR boundary logic

New module:

`EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/live_asr_boundary_logic.rs`

This module analyzes whether the current live target segment can be passed to ASR execution.

It checks:

- Whether `live_target_segment.frame` exists.
- Whether the frame is target format: 16 kHz mono.
- Whether an ASR model profile is ready.
- Whether the native backend is ready.
- Whether the native decoder is connected.
- A deterministic `segment_id` and `duplicate_guard_key` for future consume/deduplication policy.

### 2. No fake transcription is produced

The ASR boundary intentionally keeps:

- `execution_attempted = false`
- `transcript_text = None`
- `decoder_connected = false`
- `ok = false`

This prevents the app from claiming ASR is working before the native decoder/model execution layer is actually connected.

### 3. ASR model/backend readiness is now evaluated from the boundary

The boundary uses:

- `ProjectPaths::discover().asr_model_dir`
- `build_asr_profile_plan(...)`
- `NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate()`

This gives the runtime a truthful decision boundary:

- target audio ready
- ASR model ready or missing
- CUDA/native backend ready or blocked
- native decoder connected or still pending

### 4. Runtime status bundle now includes ASR boundary state

`RuntimeStatusBundleReport` now includes:

- `live_asr_boundary`

The runtime `next_action` can now move to:

- `prepare_live_asr_boundary`
- `resolve_asr_model_backend_or_decoder`
- `call_native_asr_decoder`

But because the decoder is still intentionally marked disconnected, the app must not claim ASR transcription is complete.

## Current pipeline after this pass

Current internal path:

`CPAL microphone stream -> rolling mono buffer -> audio evidence -> VAD readiness -> target 16 kHz mono AudioFrame extraction -> ASR boundary readiness`

## Still pending

- Native ASR decoder connection.
- Actual ASR model execution.
- Real transcript output.
- Consume/clear behavior after successful ASR execution.
- Translation execution.
- TTS/playback execution.
- Internal Rust/typecheck/build validation.
- Packaging validation.

## Status

The project now has a truthful ASR execution boundary, but it does not yet transcribe speech. The branch remains internal-development only and is not ready for owner validation or production.

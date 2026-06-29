# V1-Advance Capture Bridge Migration Prep

Branch: `V1-Advance`
Status: source-side migration step 1 active

## Purpose

This note records the current source-side preparation for migrating capture start/stop toward the long-running Python helper bridge and the live voice pipeline.

## Current helper capture path

`runtime_capture.rs` builds reusable helper bridge request payloads for:

```text
capture_start
capture_stop
```

The preview response carries migration fields:

```text
helper_task
requires_provider_ready
migration_ready
preview_only
```

Developer Diagnostics exposes dedicated dispatch commands:

```text
dispatch_capture_start_request
dispatch_capture_stop_request
```

## Python worker entry wrapper

The helper bridge prefers:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker_entry.py
```

That entry wrapper imports the existing `realtime_local_worker.py`, registers migration stubs for:

```text
capture_start
capture_stop
asr_handoff
translation_handoff
tts_handoff
```

and then runs the original worker main loop.

This prevents helper dispatch from returning `worker:unknown_command` while keeping helper-routed capture and pipeline handoffs clearly blocked until implemented.

## Main Start/Stop step 1

Main `start_capture` and `stop_capture` attempt helper capture dispatch first when the helper bridge appears dispatch-capable.

Then they fall back to the existing capture path.

This keeps the current capture behavior available while giving Developer Diagnostics and main capture flow the same helper bridge envelope path.

## Capture helper dispatch status

Rust stores the last helper capture dispatch result in a session-local status object:

```text
attempted
command
ok
state
message
generation_token
runtime_claim
updated_unix_ms
```

The status is exposed through:

```text
get_capture_helper_dispatch_status
```

and the frontend has a matching `CaptureHelperDispatchStatus` type plus runtime API binding.

## Capture transcript boundary status

Rust exposes a source-side boundary status between capture and ASR/transcript handoff:

```text
get_capture_transcript_boundary_status
```

The boundary status reports:

```text
capture_dispatch_attempted
capture_dispatch_ok
existing_capture_active
frames_received
buffered_duration_ms
ready_for_vad
ready_for_target_asr_frame
transcript_handoff_ready
blocker
next_action
```

This helps Developer Diagnostics distinguish these states:

```text
helper capture dispatch attempted/blocked
existing capture path active/inactive
live audio buffer not ready for ASR frame yet
capture boundary ready for ASR handoff
```

## ASR handoff request stub

Rust prepares and dispatches a source-side ASR handoff request stub:

```text
prepare_asr_handoff_request
dispatch_asr_handoff_request
```

The request is only prepared when `get_capture_transcript_boundary_status` reports `transcript_handoff_ready = true`.

The current payload is metadata-only:

```text
frames_received
buffered_duration_ms
ready_for_vad
ready_for_target_asr_frame
capture_dispatch_attempted
capture_dispatch_ok
```

No audio frame payload is sent yet.

The Python worker entry wrapper receives `asr_handoff` and returns a clear blocker:

```text
asr:handoff_runtime_not_implemented
```

## Live pipeline handoff stubs

Rust has a separate `pipeline_handoff.rs` module for the next pipeline stages:

```text
prepare_translation_handoff_request
dispatch_translation_handoff_request
prepare_tts_handoff_request
dispatch_tts_handoff_request
get_live_pipeline_handoff_status
```

These stages are still metadata-only. They intentionally block until upstream stages provide real payloads:

```text
translation_handoff -> waits for ASR transcript text
tts_handoff -> waits for translated text
```

The Python worker entry wrapper receives these commands and returns clear blockers:

```text
translation:handoff_runtime_not_implemented
tts:handoff_runtime_not_implemented
```

Developer Diagnostics exposes buttons for capture, ASR, translation, TTS, and full pipeline status.

## Session-local pipeline cache

Rust now stores source-side handoff status in session memory for:

```text
asr_handoff
translation_handoff
tts_handoff
```

`get_live_pipeline_handoff_status` reads cached stage status when available, so Developer Diagnostics can report the most recent prepare/dispatch result instead of recomputing every stage as a fresh preview.

The frontend also caches the latest live pipeline handoff snapshot in `globalThis` for the Developer view:

```text
__translateitLivePipelineHandoffStatus
```

This is still UI/session evidence only. It is not persisted and is reset when the app session restarts.

## Current boundary

Main Start/Stop Capture still depends on the existing capture path for actual capture behavior.

Helper capture dispatch, capture transcript boundary status, ASR handoff, translation handoff, TTS handoff, and the live pipeline snapshot cache are still migration/wiring evidence only. They do not prove microphone capture quality, ASR decoding, translated transcript, TTS synthesis, virtual microphone routing, or target latency.

## Why this matters

The next implementation step can attach a real target audio frame payload, connect it to decoder output, then pass transcript -> translation -> TTS as actual runtime payloads only after local compile/runtime evidence exists.

## Not claimed yet

This change does not prove microphone capture, ASR, translation, TTS, virtual microphone routing, or target latency.

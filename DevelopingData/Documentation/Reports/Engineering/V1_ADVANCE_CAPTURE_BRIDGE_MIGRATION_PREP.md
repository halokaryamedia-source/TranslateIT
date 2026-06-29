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

This prevents helper dispatch from returning `worker:unknown_command` while keeping helper-routed capture and pipeline handoffs clearly bounded until implemented.

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
seed_dev_asr_transcript
seed_dev_translated_text
prepare_translation_handoff_request
dispatch_translation_handoff_request
prepare_tts_handoff_request
dispatch_tts_handoff_request
get_live_pipeline_handoff_status
get_live_pipeline_session_snapshot
reset_live_pipeline_handoff_status
```

These stages are still metadata/dev-payload only. They intentionally block until upstream stages provide real payloads:

```text
translation_handoff -> waits for ASR transcript text or dev-seeded transcript text
tts_handoff -> waits for translated text or dev-seeded translated text
```

The Python worker entry wrapper receives these commands and can accept valid developer payload contracts:

```text
translation_handoff + transcript_text -> ok=true, contract accepted, no model executed
tts_handoff + translated_text/tts_text -> ok=true, contract accepted, no TTS executed
```

If required payloads are missing, it returns clear blockers:

```text
translation:missing_transcript_payload
tts:missing_translated_text_payload
```

Developer Diagnostics exposes buttons for capture, ASR, dev transcript seed, dev translation seed, translation, TTS, full pipeline status, pipeline snapshot, and reset pipeline cache.

## Session-local pipeline cache

Rust stores source-side handoff status in session memory for:

```text
asr_handoff
translation_handoff
tts_handoff
```

Rust also stores source-side payload markers in session memory:

```text
transcript_text
translated_text
tts_text
transcript_available
translation_available
tts_text_available
payload_source
```

`get_live_pipeline_handoff_status` reads cached stage status when available, so Developer Diagnostics can report the most recent prepare/dispatch result instead of recomputing every stage as a fresh preview.

The frontend also caches the latest live pipeline handoff snapshot in `globalThis` for the Developer view:

```text
__translateitLivePipelineHandoffStatus
```

This is still UI/session evidence only. It is not persisted and is reset when the app session restarts.

## Live pipeline session snapshot

`get_live_pipeline_session_snapshot` returns a compact source-side session summary:

```text
progress_percent
stage_count
prepared_count
dispatch_ok_count
active_stage
active_blocker
next_action
summary
payload
stages
```

`reset_live_pipeline_handoff_status` clears cached translation/TTS handoff state and clears source-side payload markers, then refreshes ASR handoff state from the current capture boundary. This prevents stale Developer Diagnostics stage summaries while keeping the operation source-side only.

The progress percentage is a wiring/progress indicator for Developer Diagnostics. It is not live runtime readiness.

## Developer payload seed commands

`seed_dev_asr_transcript` and `seed_dev_translated_text` are Developer Diagnostics helpers only.

They allow the source-side chain to be exercised in this order without waiting for real model output:

```text
seed transcript -> prepare/dispatch translation handoff
seed translation -> prepare/dispatch TTS handoff
pipeline snapshot -> confirm payload markers and stage blockers
```

The worker can accept these dev payload contracts and return `ok=true` for the relevant handoff stages, but the response runtime claim remains:

```text
pipeline_dev_payload_contract_acceptance_no_model_runtime_claim
```

This helps verify payload contracts and stage transitions, but it does not prove ASR decoding, translation quality, TTS synthesis, virtual microphone routing, or latency.

## Current boundary

Main Start/Stop Capture still depends on the existing capture path for actual capture behavior.

Helper capture dispatch, capture transcript boundary status, ASR handoff, translation handoff, TTS handoff, dev payload seeds, worker contract acceptance, the live pipeline snapshot, and the session cache are still migration/wiring evidence only. They do not prove microphone capture quality, ASR decoding, translated transcript, TTS synthesis, virtual microphone routing, or target latency.

## Why this matters

The next implementation step can replace dev-seeded transcript/translation payloads with real ASR decoder output and real local translation model output only after local compile/runtime evidence exists.

## Not claimed yet

This change does not prove microphone capture, ASR, translation, TTS, virtual microphone routing, or target latency.

# V1-Advance Capture Bridge Migration Prep

Branch: `V1-Advance`
Status: source-side migration step 1 active

## Purpose

This note records the current source-side preparation for migrating capture start/stop toward the long-running Python helper bridge.

## Current change

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
```

and then runs the original worker main loop.

This prevents dispatch from returning `worker:unknown_command` while keeping helper-routed capture clearly blocked until implemented.

## Main Start/Stop step 1

Main `start_capture` and `stop_capture` attempt helper capture dispatch first when the helper bridge appears dispatch-capable.

Then they fall back to the existing capture path.

This keeps the current capture behavior available while giving Developer Diagnostics and main capture flow the same helper bridge envelope path.

## Capture helper dispatch status

Rust now stores the last helper capture dispatch result in a session-local status object:

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

## Current boundary

Main Start/Stop Capture still depends on the existing capture path for actual capture behavior.

Helper capture dispatch is still a migration wiring test. It does not prove microphone capture, ASR, translation, TTS, virtual microphone routing, or target latency.

## Why this matters

The next implementation step can replace the fallback path with real helper-routed capture only after local compile/runtime evidence exists.

## Not claimed yet

This change does not prove microphone capture, ASR, translation, TTS, virtual microphone routing, or target latency.

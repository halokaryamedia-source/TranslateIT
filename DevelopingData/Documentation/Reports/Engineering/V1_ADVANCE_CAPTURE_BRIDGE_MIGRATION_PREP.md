# V1-Advance Capture Bridge Migration Prep

Branch: `V1-Advance`
Status: source-side preparation started

## Purpose

This note records the current source-side preparation for migrating capture start/stop toward the long-running Python helper bridge.

## Current change

`runtime_capture.rs` now builds reusable helper bridge request payloads for:

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

These commands send the prepared capture envelope to the running helper bridge without replacing the main Start/Stop Capture flow yet.

## Python worker entry wrapper

The helper bridge now prefers:

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

## Current boundary

Main Start/Stop Capture remains on the existing capture path.

Capture helper dispatch is a migration wiring test only. It does not prove microphone capture, ASR, translation, TTS, virtual microphone routing, or target latency.

## Why this matters

The next implementation step can reuse the same request envelope when Start/Stop Capture is migrated from temporary local capture behavior to helper bridge request/response behavior.

## Not claimed yet

This change does not prove microphone capture, ASR, translation, TTS, virtual microphone routing, or target latency.

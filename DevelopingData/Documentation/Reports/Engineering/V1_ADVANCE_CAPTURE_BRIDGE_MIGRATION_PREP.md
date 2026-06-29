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

The preview response now carries migration fields:

```text
helper_task
requires_provider_ready
migration_ready
preview_only
```

## Current boundary

The commands still remain preview-only for capture helper bridge migration.

They do not start or stop helper-routed capture yet.

## Why this matters

The next implementation step can reuse the same request envelope when Start/Stop Capture is migrated from temporary local capture behavior to helper bridge request/response behavior.

## Not claimed yet

This change does not prove microphone capture, ASR, translation, TTS, virtual microphone routing, or target latency.

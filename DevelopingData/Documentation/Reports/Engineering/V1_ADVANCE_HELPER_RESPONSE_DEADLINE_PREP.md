# V1-Advance Helper Response Deadline Prep

Branch: `V1-Advance`
Status: source-side deadline handling prepared

## Purpose

This note records source-side preparation for helper response deadline handling.

## Current change

Rust/Tauri helper bridge requests add deadline metadata to JSON-line worker requests when missing:

```text
request_unix_ms
deadline_unix_ms
deadline_ms
```

The default metadata deadline is:

```text
30000 ms
```

The capture migration worker stub echoes this metadata so Developer Diagnostics can confirm the request envelope reached Python.

## Backend deadline-aware read path

Rust/Tauri now includes a deadline-aware helper response read wrapper.

The helper bridge uses it for:

```text
worker task requests
raw helper bridge requests
helper startup ping/status reads
helper-backed text translation reads
```

If a worker response exceeds the deadline, Rust/Tauri marks the helper bridge blocked and terminates the active helper child process instead of leaving the command waiting indefinitely.

## Current boundary

This is source-side timeout preparation and must still be proven locally on Windows.

It does not prove helper spawn, model loading, microphone capture, ASR, translation quality, TTS, virtual microphone routing, or target latency.

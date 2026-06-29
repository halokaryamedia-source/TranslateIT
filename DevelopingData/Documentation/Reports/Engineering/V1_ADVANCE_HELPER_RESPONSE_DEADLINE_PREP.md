# V1-Advance Helper Response Deadline Prep

Branch: `V1-Advance`
Status: source-side preparation started

## Purpose

This note records source-side preparation for helper response deadline handling.

## Current change

Rust/Tauri helper bridge requests now add deadline metadata to JSON-line worker requests when missing:

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

## Current boundary

This is deadline metadata, not a full OS-level non-blocking read timeout yet.

Frontend timeout guards still protect user-facing UX, and backend hard timeout/deadline handling remains a later implementation step.

## Next implementation step

Replace blocking helper stdout reads with a backend deadline-aware worker response mechanism after local Rust/Tauri compile proof is available.

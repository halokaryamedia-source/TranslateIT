# V1-Advance Helper Command Contract

Branch: `V1-Advance`
Status: active non-local helper command documentation

## Purpose

This document records the current Rust/Tauri to Python helper command boundary.

It is documentation only. It does not claim local helper spawn, model loading, CUDA, microphone, virtual microphone, TTS, or latency readiness.

## Runtime boundary

```text
Rust/Tauri owns the user-facing desktop shell and readiness UI.
Python helper owns worker-side ASR, translation, TTS, CUDA diagnostics, model checks, and audio/provider tasks.
```

Helper process existence is not runtime readiness. Worker responses must be treated as evidence and still require target-PC validation.

## Response shape

High-level worker commands return this Rust-side shape:

```text
ok: boolean
state: string
task: string
message: string
generation_token: number
runtime_claim: string
worker_response_json: string
```

`worker_response_json` preserves the raw worker response for diagnostics and developer display.

## Lifecycle commands

### get_helper_bridge_status

Purpose:

```text
Read Rust-side helper bridge state.
```

Does not start the helper worker.

### start_helper_bridge

Purpose:

```text
Resolve worker Python, spawn realtime_local_worker.py, attach stdin/stdout/stderr, send ping, then request status.
```

Important boundaries:

- may report `ready` only for the bridge process state,
- must still rely on worker status/provider evidence for CUDA/provider/model readiness,
- stderr logs are captured under approved helper bridge logs,
- failure must produce blocked/error state with actionable message.

### stop_helper_bridge

Purpose:

```text
Terminate helper worker process and invalidate active generation.
```

After stop, CUDA/provider/degraded flags are reset to false.

### cancel_helper_bridge_task

Purpose:

```text
Invalidate current helper generation token and clear active task.
```

This is cancellation/invalidation, not proof that a Python-side long task was safely interrupted.

## Raw worker request command

### send_helper_bridge_request

Purpose:

```text
Forward a raw JSON-line worker request to the running Python helper.
```

Rules:

- task must be non-empty,
- worker must already be running,
- payload receives `command: <task>`,
- response updates runtime via worker response mapping,
- not intended as a user-facing readiness claim.

## High-level worker commands

### helper_bridge_worker_status

Worker command:

```text
status
```

Purpose:

```text
Ask the worker for runtime/dependency/model/provider status evidence.
```

### helper_bridge_preload_asr

Worker command:

```text
asr_preload
```

Purpose:

```text
Ask the worker to preload the configured ASR model.
```

This does not prove ASR readiness until it succeeds on target PC with real model files.

### helper_bridge_preload_translation

Worker command:

```text
translation_preload
```

Payload:

```text
mode: string, defaults to Realtime
```

Purpose:

```text
Ask the worker to preload translation resources for the selected mode.
```

This does not prove end-to-end translation until the worker and UI flow succeed locally with model assets.

### helper_bridge_tts_preflight

Worker command:

```text
tts_preflight
```

Purpose:

```text
Ask the worker to verify whether the local TTS provider path is usable.
```

This is provider evidence only, not TTS quality or meeting-output routing proof.

### helper_bridge_synthesize_text

Worker command:

```text
synthesize
```

Payload:

```text
text: string, max 2000 cleaned characters
output_path: optional string
```

Rules:

- empty text is rejected locally with `tts:empty_text`,
- output path is optional,
- successful synthesize does not prove virtual microphone routing or meeting output readiness.

## Current non-local boundary

These commands are allowed to exist in source and docs during non-local work.

They must not be used to claim:

```text
helper spawn pass
ASR ready
translation ready
TTS ready
CUDA ready
microphone ready
virtual microphone ready
installer ready
latency target achieved
```

Those claims require target-PC evidence.

## Next local evidence

The first local evidence step remains:

```text
Run npm run check:tauri-rust-local on Windows.
```

After Rust/Tauri compile proof passes, helper command runtime validation can start in this order:

1. start helper,
2. worker status,
3. ASR preload,
4. translation preload,
5. TTS preflight,
6. synthesize test,
7. text translation end-to-end,
8. voice capture and output routing.

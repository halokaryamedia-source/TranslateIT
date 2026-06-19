# Capture Helper Bridge Migration Plan

Branch: `Dev-Rust`

## Purpose

This document defines the non-local migration boundary for moving the temporary capture implementation to the long-running Rust/Tauri helper bridge.

The current safe state is:

- Rust/Tauri is the final desktop shell.
- Python remains the helper runtime.
- `start_helper_bridge` can spawn the project-local Python worker and verify `ping`.
- `send_helper_bridge_request` can send JSON-line requests to the running worker.
- `check_helper_bridge_health` can request worker `status` when helper state is already `ready`.
- `prepare_capture_start_request` and `prepare_capture_stop_request` can preview helper bridge payloads without running real capture.
- `start_capture` blocks until helper provider readiness is verified.

## Non-local migration boundary

The full capture pipeline must not be switched to the long-running helper bridge without target-PC validation because it affects live audio capture, ASR, translation, TTS, device selection, and cancellation semantics.

Non-local work may safely prepare:

1. Command contracts.
2. Readiness states.
3. Validator guards.
4. UI controls.
5. Evidence log paths.
6. Documentation.
7. Request/response schema preparation.

Non-local work must not claim:

1. Microphone capture success.
2. ASR model readiness.
3. Translation model readiness.
4. TTS output readiness.
5. CUDA runtime readiness.
6. Low latency readiness.
7. Packaged app readiness.

## Target capture routing

The target final flow is:

1. User presses Start Capture.
2. Rust/Tauri invalidates any previous generation token.
3. Rust/Tauri checks helper bridge status.
4. If helper is not ready, Rust/Tauri starts helper or blocks with setup instructions.
5. Rust/Tauri sends a capture-start request to the helper bridge.
6. Helper returns status/evidence for microphone, ASR, translation, and TTS.
7. Runtime only marks capture active after valid helper response evidence.
8. User presses Stop Capture.
9. Rust/Tauri invalidates generation token.
10. Rust/Tauri sends capture-stop/cancel request to helper.
11. Any stale helper output whose token does not match the current generation must be ignored.

## Required helper request schema

Future helper bridge capture requests should follow JSON-line messages:

```json
{
  "command": "capture_start",
  "generation_token": 1,
  "source_language": "id",
  "target_language": "en",
  "runtime_profile": "Realtime",
  "input_device_id": null,
  "output_device_id": null
}
```

Stop/cancel request:

```json
{
  "command": "capture_stop",
  "generation_token": 2
}
```

## Required helper response fields

Capture response evidence should include:

```json
{
  "ok": false,
  "stage": "capture_start",
  "generation_token": 1,
  "blocker": "target_pc_validation_required",
  "microphone_ready": false,
  "asr_ready": false,
  "translation_ready": false,
  "tts_ready": false,
  "cuda_ready": false,
  "degraded_mode": false,
  "evidence_path": null
}
```

## Migration phases

### Phase 1: Non-local guardrails

Status: mostly complete.

- Helper lifecycle commands exist.
- Helper health command exists.
- Helper bridge validator exists.
- UserData root policy validator exists.
- Machine-specific path validator exists.
- Provider/quality routes remain blocked until evidence.

### Phase 2: Bridge request preparation

Status: prepared as preview-only runtime scaffolding.

- Capture-start/capture-stop request contract exists.
- Tauri preview commands prepare requests without claiming runtime success.
- UI copy shows helper readiness requirements.
- Validators guard generation token, no-ready-without-evidence behavior, and preview-only wording.

### Phase 3: Target-PC implementation

Requires local runtime access:

- Start helper on the target PC.
- Validate `.venv` and worker dependencies.
- Validate microphone device selection.
- Validate ASR/translation/TTS model availability.
- Validate CUDA/fallback mode.
- Validate Start/Stop cancellation.
- Save local evidence summary.

## Current not-ready rule

Do not remove the temporary capture implementation until the long-running helper bridge has passed target-PC validation and saved evidence.

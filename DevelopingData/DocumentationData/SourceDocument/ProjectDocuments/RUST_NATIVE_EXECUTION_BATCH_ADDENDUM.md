# Rust Native Execution Batch Addendum

## Document control

- Project: TranslateIT
- Branch: `ChatGPT-ConvertEngine`
- Date: `2026-06-14`
- Scope: Rust native execution planning

## Added backend capability

```text
EngineData/LauncherApp/RustApp/src-tauri/src/engine/native_execution.rs
```

The native execution boundary now supports single-stage planning, batch planning, and a native execution contract result shape.

## Single-stage planner

```text
plan_native_execution
```

Plans one stage:

- ASR
- translation
- output

It checks:

- input readiness
- model readiness
- backend readiness
- visible CPU degraded mode approval
- selected device
- selected compute type
- blocker reason

## Native execution contract

```text
prepare_native_execution_contract
```

Prepares the stable result shape used before real inference is connected:

- segment id
- stage
- ready-to-execute flag
- selected model
- selected device
- selected compute type
- input kind
- input summary
- output target
- queue/preprocess/inference/postprocess/total timing fields
- error field
- blocker field

This prevents the app from reporting fake model execution while still giving the native adapter a stable contract.

## Batch planner

```text
plan_native_execution_batch
```

Plans all runtime stages together:

- ASR plan
- translation plan
- output plan
- all-ready flag
- any-CPU-degraded flag
- CUDA-ready-for-core-stages flag
- blocker list

## Session persistence helper

```text
EngineData/LauncherApp/RustApp/src-tauri/src/engine/session_store.rs
```

The session store now includes:

- session store status
- session save preview
- JSON payload save helper

The preview helper lets the app show the planned file path and segment count before writing a saved transcript.

## Current hardened behavior

- ASR defaults to CUDA / float16.
- Translation defaults to CUDA / float16.
- Output defaults to windows-default-output / audio.
- CPU degraded mode is allowed only when explicitly requested and not for the output stage.
- The batch report separates all-ready from CUDA-ready-for-core-stages so the app cannot confuse CPU degraded mode with real CUDA readiness.

## Tauri exposure status

The single-stage command is already exposed as:

```text
plan_native_execution_step
```

The batch planner and native execution contract are available in Rust backend code but have not been exposed to `main.rs` yet because the current command bridge update is being kept conservative while migration continues.

## Validation policy

No final validation has been run. Final validation remains manual-only until the migration is functionally complete.

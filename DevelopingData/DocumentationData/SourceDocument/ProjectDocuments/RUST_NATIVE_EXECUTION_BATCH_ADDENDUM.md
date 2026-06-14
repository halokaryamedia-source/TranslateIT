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

The native execution boundary now supports both single-stage and batch planning.

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

The batch planner is available in Rust backend code but has not been exposed to `main.rs` yet because the current command bridge update is being kept conservative while migration continues.

## Validation policy

No final validation has been run. Final validation remains manual-only until the migration is functionally complete.

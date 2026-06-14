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
- blocker list

## Tauri exposure status

The single-stage command is already exposed as:

```text
plan_native_execution_step
```

The batch planner is available in Rust backend code but has not been exposed to `main.rs` yet because the current command bridge update is being kept conservative while migration continues.

## Validation policy

No final validation has been run. Final validation remains manual-only until the migration is functionally complete.

# V1-Pull Frontend Backend Contract Status

Branch: `V1-Pull`

## Purpose

Ensure there are no silent misses between:

```text
Frontend runtimeApi
Tauri/Rust command registry
Rust engine modules
Python local worker handlers
UI visual controls and bindings
```

## Added contract reports

### Frontend Backend Contract

```text
EngineData/Frontend/RustApp/scripts/run_frontend_backend_contract_report.mjs
```

Checks every `invoke(...)` command used by `runtimeApi.ts` against `src-tauri/src/commands/registry.rs`.

Fails if frontend calls a Tauri command that is not registered in Rust.

### Worker Contract

```text
EngineData/Frontend/RustApp/scripts/run_worker_contract_report.mjs
```

Checks worker commands used by scripts/Rust against Python `HANDLERS`.

Core required worker commands:

```text
ping
status
asr_preload
transcribe
translate
tts_preflight
synthesize
```

### Rust Module Linkage

```text
EngineData/Frontend/RustApp/scripts/run_rust_module_linkage_report.mjs
```

Checks that `manual_translation_accelerated.rs` is not a dead file and is exported by `engine/mod.rs`.

### Accelerated Worker Usage

```text
EngineData/Frontend/RustApp/scripts/run_accelerated_worker_usage_report.mjs
```

Checks that accelerated worker support exists and is used by:

```text
manual text translation
runtime report
audio pipeline capture lifecycle
```

This is a hard gate because text and voice must not silently use different worker paths.

### UI Binding and Action Binding

```text
run_ui_binding_consistency_report.mjs
run_action_binding_report.mjs
```

Checks that visible UI controls have matching handlers and that renderer-bound IDs exist in settings views.

## Final command coverage

`npm run test:local-final` now includes:

```text
validate:quick
frontend-backend contract
worker contract
Rust module linkage
accelerated worker usage
runtime report
voice preflight
voice capture evidence
UI readiness
UI binding consistency
action binding
settings integrity
professional gate
```

## Known unresolved item

A direct backend patch to make `capture_lifecycle.rs` prefer `realtime_local_worker_accelerated.py` was attempted but blocked by connector safety because the file is large.

The accelerated worker usage report is now a hard gate so this cannot be forgotten. If it fails, the next safe patch should use a smaller Rust helper module or a narrower backend update strategy.

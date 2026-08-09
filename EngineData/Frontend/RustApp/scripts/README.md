# RustApp Scripts

This directory contains current source/build/contract validation utilities for the TranslateIT Tauri application.

## Ownership Rule

A persistent script in this directory is current only when it is reachable from one of these owners:

```text
package.json
-> canonical developer/source-validation entrypoints

auto_test_registry.mjs
-> canonical registered source/preflight/diagnostic test graph

reachable script/helper
-> direct dependency required by one of the above
```

A local proof script that needs Windows/runtime/device execution must also have an explicit current owner/entrypoint. Do not keep orphan scripts in `EngineData` merely because they may be useful later; Git history preserves retired tooling.

## Rules

- Scripts protect current source/runtime/package contracts; they do not define product requirements.
- Do not keep branch-specific V1/V1-Advance/V1-Pull automation as current `New` tooling.
- Do not make current validation depend on historical `DevelopingData` reports/policies.
- Developer/source-validation output belongs under ignored `.tmp/validation/`, never `UserData`.
- Runtime/user diagnostics written by the application itself remain a separate `UserData/LogData` concern.
- Do not keep retired validator stubs, one-off repair scripts, duplicated aggregate gates, model-download experiments, or per-task cleanup tooling merely for history.
- Local runtime/device/build proof remains a separate proof level; source validators must not manufacture live proof.

## Current Entrypoints

See `../package.json` for the canonical npm profiles.

Primary source-side paths:

```text
validate:source-contracts
validate:quick
test:auto-map
test:auto-strict
test:contract-reports
```

The explicitly owned local compile proof is:

```text
check:tauri-rust-local
```

`auto_test_registry.mjs` owns the scripts/fixtures used by the auto-test matrix. `run_contract_reports.mjs` owns its bounded diagnostic report helpers.

Generated validation reports are disposable and must not be committed.

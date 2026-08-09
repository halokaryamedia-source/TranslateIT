# RustApp Scripts

This directory contains current source/build/contract validation utilities for the TranslateIT Tauri application.

## Rules

- Scripts protect current source/runtime/package contracts; they do not define product requirements.
- Do not keep branch-specific V1/V1-Advance sync automation as current `New` tooling.
- Do not make current validation depend on historical `DevelopingData` reports/policies.
- Developer/source-validation output belongs under ignored `.tmp/validation/`, never `UserData`.
- Runtime/user diagnostics written by the application itself remain a separate `UserData/LogData` concern.
- Do not keep retired validator stubs or per-task deletion lists merely for history; Git/V1 branches already preserve that history.
- Local runtime/device/build proof scripts remain manual when their environment is required; source-only validators should remain runnable without inventing live proof.

## Current package profiles

See `../package.json` for the canonical npm entrypoints. `validate:source-contracts` and `validate:quick` are current source-side guards; local Tauri compile/runtime commands are separate proof levels.

Generated validation reports are disposable and should not be committed.

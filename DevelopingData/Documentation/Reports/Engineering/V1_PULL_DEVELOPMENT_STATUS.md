# V1-Pull Development Status

Branch: `V1-Pull`

## Purpose

`V1-Pull` is now the active staging branch for development and local auto-pull testing.

`V1` remains the manual stable branch. Merge from `V1-Pull` to `V1` should happen only after enough fixes are validated.

## Added in this pass

### Accelerated text translation routing

Added:

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/manual_translation_accelerated.rs
```

Updated:

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/mod.rs
```

Text translation now routes through the accelerated module first. The module calls the local worker and prefers the accelerated worker when it exists. The previous `manual_translation` module remains as fallback.

### V1-Pull local automation

Added:

```text
EngineData/Frontend/RustApp/scripts/run_v1_pull_local_sync_and_test.ps1
EngineData/Frontend/RustApp/run_v1_pull_local_sync_and_test.cmd
```

Use these for local staging sync/testing against `V1-Pull` instead of `V1`.

## Local test command

```powershell
cd "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\EngineData\Frontend\RustApp"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\run_v1_pull_local_sync_and_test.ps1" -OpenReport
```

## Current known focus

1. Confirm `validate:quick` passes on `V1-Pull`.
2. Confirm runtime report still passes.
3. Run `npm.cmd run test:translation-gpu-final` after CT2 conversion setup.
4. Confirm app text translation output no longer displays planner/preview style output.
5. Voice capture guard still needs a dedicated smaller pass because a large voice UI rewrite was blocked by connector safety.

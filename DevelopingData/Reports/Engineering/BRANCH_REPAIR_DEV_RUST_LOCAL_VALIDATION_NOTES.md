# Dev-Rust Branch Repair Local Validation Notes

## Purpose
These notes define the final local validation step for the Dev-Rust branch repair.

## Local validation target
Run validation from the active app folder:

`EngineData/LauncherApp/RustApp`

## Existing package scripts to use
- `npm run validate:internal`
- `npm run validate:full`
- `npm run check:rust`
- `npm run build:frontend`
- `npm run build`
- `npm run validate:worker`
- `npm run smoke:worker`

## Added helper
A validation wrapper has been added at:

`DevelopingData/Tooling/Scripts/Execution/run_dev_rust_branch_repair_validation.ps1`

## Completion rule
The repair can be marked 100% only after the local app validation and worker validation pass on a real checkout.

## Boundary decisions still required
- `translation_engine.py`
- `realtime_turn_planner.py`
- `realtime_status_presenter.py`
- old app-main patcher intent
- language LLM runtime/session patcher intent

Each item must be kept as evidence, moved behind LocalWorker, or rewritten into Rust/Tauri before feature development continues.

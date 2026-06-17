# Branch Repair Dev-Rust Final Closeout Checklist

## Purpose
This checklist defines what remains before the branch repair can be called fully complete.

## Completed repair validations
- Misplaced file range has been triaged.
- Safe helper/evidence files have been ported.
- Dev-Rust architecture has been crosschecked.
- Python helper classification has been documented.
- LocalWorker boundary map has been added.
- High-risk unported files have a documented resolution.
- Boundary migration queue has been created.
- Direct-reference search did not show migrated Python helper names wired into `RustApp/src-tauri`.

## Required before 100%
1. Run local repository checkout validation on `Dev-Rust`.
2. Run Rust/Tauri build or validation command from `EngineData/LauncherApp/RustApp`.
3. Confirm `EngineData/Backend/LocalWorker/WorkerRuntime` still validates after helper-map addition.
4. Decide final placement for `translation_engine.py`, `realtime_turn_planner.py`, and `realtime_status_presenter.py`.
5. Rewrite old Python app-main patch intent as Rust/Tauri or LocalWorker tasks only if still needed.
6. Close or update PR #3 once the repair has a clean final path.

## Current status
Repair is near complete, but not 100% until local build/test validation and final boundary decisions are done.

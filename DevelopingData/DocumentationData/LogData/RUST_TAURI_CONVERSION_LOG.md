# Rust Tauri Conversion Log

## Current entry

- Version: `0.8.0-active-rustapp-launcher-cleanup`
- Date: `2026-06-14`
- Branch: `ChatGPT-ConvertEngine`
- Status: Active LauncherApp Python files removed and root launcher pointed to RustApp
- Root baseline: `Developing` commit `f412ba06bace37f6c0118eb20a6a2f91f0a63e76`
- Observed commit: `76139bc13bd0b8f59f4307d98703a5f335460470`

## Summary

The active `EngineData/LauncherApp` folder now uses the Rust/Tauri `RustApp` launcher path. Previous Python launcher modules have been removed from the active launcher folder on this branch. The root `TranslateIT.vbs` now points to `RustApp`. The app still does not claim full runtime readiness until validation passes.

## Changes made

- Added RustApp scaffold and Tauri command bridge.
- Added runtime state, config, path, settings, log, model, and diagnostics modules.
- Added native audio device discovery using `cpal`.
- Added Rust input preparation boundary.
- Routed `start_capture` through Rust input preparation status.
- Added audio buffer status and audio payload analysis.
- Added calibration flow status and calibration profile save command.
- Added backend visibility check module.
- Exposed `validate_native_cuda_backend` command.
- Added required native file list to backend validation output.
- Added standard model directory checks to backend validation output.
- Added backend validation details to runtime diagnostics and frontend diagnostics.
- Added ASR dry check module and command.
- Added text dry check module and command.
- Added output plan module and command.
- Exposed `check_model_plan` command.
- Added focused runtime boundary checker.
- Added output boundary checker.
- Added model boundary checker to final validation checklist.
- Added final validation runner script.
- Added RustApp validation GitHub Actions workflow.
- Removed active Python launcher files from `EngineData/LauncherApp`.
- Updated `TranslateIT.vbs` to launch `EngineData/LauncherApp/RustApp`.

## Important decision

The final target is full Rust runtime ownership. Python is allowed only as a historical behavior reference through git history. Runtime readiness must remain false until real validation is complete.

## Testing status

No final runtime test was executed in this chat. Validation can now be run locally with the PowerShell runner or in GitHub Actions.

## Next conversion target

- Run RustApp validation workflow.
- Fix any compile or packaging issues found by validation.

# ROOT CLEANUP REPORT

## Files Moved
- `ENGINE_HARDENING_REPORT.md`
- `ENGINE_LATENCY_P1_REPORT.md`
- `ENGINE_RUNTIME_VALIDATION_P4_REPORT.md`
- `ENGINE_TTS_BACKEND_P3_REPORT.md`
- `ENGINE_TTS_PLAYBACK_P2_REPORT.md`
- `README.md`
- `tests/`
- `run_translateit_legacy_tts.bat`
- `run_translateit_sapi_direct_async.bat`
- `TranslateIt.vbs`
- `TranslateIt.bat`

## Folders Created
- `DevelopingData/Reports/Engineering/`
- `DevelopingData/Reports/Validation/`
- `DevelopingData/Docs/`
- `DevelopingData/LauncherHelpers/`
- `DevelopingData/Tests/`

## Launcher Behavior
- Root launcher is now only `TranslateIt.vbs`.
- The VBS front launcher resolves the project root and calls `DevelopingData/LauncherHelpers/TranslateIt.bat`.
- The helper BAT defaults `TRANSLATEIT_TTS_BACKEND` to `sapi_direct_async` when the variable is not already set.
- The helper BAT preserves an existing `TRANSLATEIT_TTS_BACKEND` value if one is present.
- `legacy_sapi_wav` remains available as internal fallback.

## Test Command Changes
- Old style:
  - `python -m unittest discover -s tests`
- New style:
  - `python -m unittest discover -s DevelopingData/Tests`

## Validation Commands Run
- `python -m compileall -q EngineData`
- `python -m unittest discover -s DevelopingData/Tests`

## Validation Results
- Compile passed.
- Unit tests passed.
- The moved test suite still resolves `EngineData` imports after the path update.

## Limitations
- Root cleanup does not change the underlying fact that `sapi_direct_async` is still direct async playback, not true streaming.
- Audible-start measurement remains a proxy, not an exact hardware callback.
- Manual microphone/speaker testing is still required later to compare real-world latency.

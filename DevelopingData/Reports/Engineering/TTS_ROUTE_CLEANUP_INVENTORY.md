# TTS Route Cleanup Inventory

## Scope
- Inventory the current TTS route files and confirm which one is live by default.

## Live Route Files
- [`EngineData/TranslateEngine/tts_placeholder.py`](../../EngineData/TranslateEngine/tts_placeholder.py)
  - Owns backend selection and the direct-async / legacy fallback chain.
- [`EngineData/LauncherApp/launcher_bootstrap.py`](../../EngineData/LauncherApp/launcher_bootstrap.py)
  - Sets `TRANSLATEIT_TTS_BACKEND=sapi_direct_async` when the variable is not already defined.
- [`DevelopingData/LauncherHelpers/TranslateIt.bat`](../../DevelopingData/LauncherHelpers/TranslateIt.bat)
  - Default helper launcher for interactive testing.
- [`TranslateIT.vbs`](../../TranslateIT.vbs)
  - Front launcher that preserves user-supplied backend values and defaults to direct async otherwise.

## Backend Status
- `sapi_direct_async`
  - Default live backend when launched normally.
  - Used for direct voice proxy output.
- `legacy_sapi_wav`
  - Fallback only.
  - Still required for environments where the direct route fails.
- `experimental_streaming`
  - Placeholder only.

## Cleanup Notes
- No engine file has been deleted.
- No file was moved to archive because the currently used route files are still referenced at runtime.
- The safe path is to keep legacy WAV available internally but not as the default live route.

## Validation Commands Run
- `python -m compileall -q Experimental\EngineData`
- `python -m unittest discover -s Experimental\DevelopingData\Tests`
- `python -m EngineData.LauncherApp.launcher_bootstrap --self-test`

## Validation Results
- `compileall` passed for `Experimental\EngineData`.
- `unittest` passed with 15 tests.
- Launcher self-test passed.
- The added test proves launcher bootstrap defaults live output to `sapi_direct_async`.
- Legacy WAV remains available only as fallback.

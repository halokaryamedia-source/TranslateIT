# LAUNCHER REPAIR REPORT

## Why The BAT-Only Root Broke The Launcher
- The previous cleanup removed the working front launcher behavior that was already wired through `TranslateIt.vbs`.
- `TranslateIt.bat` alone did not preserve the same front-door launch path the user relied on for double-click startup.
- The root launcher also needs to be robust to Windows Explorer launching behavior, and the VBS wrapper provided that behavior.
- The launcher flow was also too dependent on the current working directory after the move, so the helper no longer had a stable root to resolve from.

## What Was Restored
- Restored `TranslateIt.vbs` as the only root launcher.
- Moved batch launch logic into `DevelopingData/LauncherHelpers/TranslateIt.bat`.
- Added `DevelopingData/LauncherHelpers/TranslateIt_Debug.bat` for visible console debugging.
- Kept the helper BAT responsible for defaulting `TRANSLATEIT_TTS_BACKEND` to `sapi_direct_async` only when not already set.
- Preserved engine fallback support for `legacy_sapi_wav`.
- Made the launcher pass the explicit Experimental root path from VBS to BAT.

## Final Root Structure
- `DevelopingData/`
- `EngineData/`
- `UserData/`
- `TranslateIt.vbs`

## Launch Flow
1. User double-clicks `TranslateIt.vbs`.
2. VBS resolves the project root from its own file location.
3. VBS launches `DevelopingData\LauncherHelpers\TranslateIt.bat` and passes the root path as an argument.
4. BAT resolves the root, creates `UserData\CacheData\RuntimeLogs`, and writes `launcher_debug.log`.
5. BAT sets `TRANSLATEIT_TTS_BACKEND=sapi_direct_async` only if it is not already present.
6. BAT launches `EngineData.LauncherApp.app_main` via the bundled Python runtime.

## Backend Default
- Default backend for launcher testing: `sapi_direct_async`
- Internal fallback backend remains: `legacy_sapi_wav`

## Debug Log Location
- `UserData\CacheData\RuntimeLogs\launcher_debug.log`

## How To Run Hidden Launcher
- Double-click `TranslateIt.vbs` in the root.

## How To Run Debug Helper
- Run `DevelopingData\LauncherHelpers\TranslateIt_Debug.bat`

## Validation Commands Run
- `python -m compileall -q EngineData`
- `python -m unittest discover -s DevelopingData/Tests`

## Validation Results
- Engine source compiled successfully.
- Unit tests passed successfully.
- Root now contains only the intended launcher file.

## Limitations
- GUI double-click validation is still pending from a real Windows session.
- The repair does not claim latency improvement.
- `sapi_direct_async` remains direct async playback, not true streaming.

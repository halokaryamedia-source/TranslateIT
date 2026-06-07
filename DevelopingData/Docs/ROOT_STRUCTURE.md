# ROOT STRUCTURE

## Required Root Layout
- `DevelopingData/`
- `EngineData/`
- `UserData/`
- `TranslateIT.vbs`

The root should not contain extra launchers or engineering reports.

## What Belongs In `DevelopingData`
- Engineering reports
- Validation outputs
- Tests
- Development launcher helpers
- Developer notes and docs

## What Belongs In `EngineData`
- LauncherApp source code
- TranslateEngine source code
- TranscriptEngine source code
- Runtime engine modules
- Application source required at runtime

## What Belongs In `UserData`
- Cache data
- Saved data
- Runtime logs
- Session reports
- Latency reports

## How To Launch Direct Async Testing
- Double-click `TranslateIT.vbs` from the root.
- The launcher defaults `TRANSLATEIT_TTS_BACKEND` to `sapi_direct_async` if it is not already set.
- To force another backend later, set `TRANSLATEIT_TTS_BACKEND` before launching.
- Helper BAT files live in `DevelopingData/LauncherHelpers/`.
- The debug helper is `DevelopingData/LauncherHelpers/TranslateIt_Debug.bat`.

## Where Reports And Logs Are Written
- Runtime logs: `UserData/LogData/`
- Latency reports: `UserData/LogData/`
- Session reports: `UserData/LogData/`
- Validation outputs: `DevelopingData/Reports/Validation/`
- Engineering reports: `DevelopingData/Reports/Engineering/`

## How To Run Tests After Moving The Tests Folder
```bash
python -m unittest discover -s DevelopingData/Tests
```

## Notes
- `legacy_sapi_wav` remains available inside the engine as fallback.
- `sapi_direct_async` is the default test backend for the launcher.
- `experimental_streaming` remains a placeholder only.

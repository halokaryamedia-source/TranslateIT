# APP STARTUP CRASH REPAIR REPORT

## Exact Exception Found
- `AttributeError: 'BenchmarkSummary' object has no attribute 'total_after_eos'`

## Root Cause
- `EngineData.LauncherApp.app_main` still renders the benchmark panel using legacy summary fields.
- `EngineData.TranscriptEngine.benchmark_metrics.BenchmarkSummary` had been simplified and no longer exposed `total_after_eos`, `average_asr_ms`, or `average_translation_ms`.
- The crash occurred during window construction, before the GUI finished opening.

## Files Changed
- `EngineData/TranscriptEngine/benchmark_metrics.py`
- `DevelopingData/Reports/Engineering/APP_STARTUP_CRASH_REPAIR_REPORT.md`

## Fix Applied
- Restored compatibility properties on `BenchmarkSummary`:
  - `completed_segments`
  - `rejected_segments`
  - `total_after_eos`
  - `average_asr_ms`
  - `average_translation_ms`
- Kept the startup bootstrap and launcher logs intact so any future startup failure is still written to disk.

## Validation Commands Run
- `DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test`
- `DevelopingData\ToolKitData\rt\Scripts\python.exe -m compileall -q EngineData`
- `DevelopingData\ToolKitData\rt\Scripts\python.exe -m unittest discover -s DevelopingData\Tests`

## Validation Results
- Packaged `python.exe` exists.
- Packaged `pythonw.exe` exists.
- Bootstrap self-test passed.
- Engine compile passed.
- Unit tests passed.

## Remaining Limitations
- Full GUI double-click validation is still pending in a real Windows desktop session.
- If the UI later expects more legacy benchmark fields, those can be aliased in `BenchmarkSummary` without changing the startup path.

## Status
Status: Launcher repaired and ready for manual double-click validation

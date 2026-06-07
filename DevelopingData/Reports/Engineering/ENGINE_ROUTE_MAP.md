# Engine Route Map

## Root Launch Route
- `TranslateIT.vbs`
  - Root launcher for the desktop flow.
  - Delegates into the helper BAT and launcher bootstrap path.

## Bootstrap Route
- `EngineData/LauncherApp/launcher_bootstrap.py`
  - Normalizes the environment.
  - Sets `TRANSLATEIT_TTS_BACKEND=sapi_direct_async` when no backend is already present.
  - Starts `EngineData.LauncherApp.app_main`.

## Live Speech Route
1. Microphone capture
2. VAD / endpointing
3. ASR
4. Translation
5. Transcript card creation
6. Direct async TTS dispatch
7. Playback proxy / report capture
8. Background telemetry and report writing

## Route Rules
- Never block accepted transcript display on report writing.
- Never block TTS start on post-acceptance telemetry.
- Never use `legacy_sapi_wav` as the default live route.
- Never wait for legacy fallback before trying the warmed direct route first.
- Never show missing latency as fake `0 ms`; use `Latency unavailable` instead.
- Preserve `input_latency_budget_ms`, `output_latency_budget_ms`, and `io_latency_budget_ms` through the report writer, summary reader, and probe.

## Background Path
- `write_json_report_async()` uses a background worker and queue.
- Session persistence and report generation happen after accepted-path dispatch has already been started.
- The accepted path now keeps TTS ahead of replay/report writing.

## Diagnostics
- The input/output latency probe now prefers an accepted trace that reached TTS.
- If the latest latency JSON is stale, the probe can derive budget values from preserved component timings.

## Validation Commands Run
- `python -m compileall -q Experimental\EngineData`
- `python -m unittest discover -s Experimental\DevelopingData\Tests`
- `D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test`
- `D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\Diagnostics\input_output_latency_probe.py`

## Validation Status
- Compilation passed.
- Unit tests passed.
- Launcher self-test passed.
- Route map matches the live bootstrap and direct async default policy.


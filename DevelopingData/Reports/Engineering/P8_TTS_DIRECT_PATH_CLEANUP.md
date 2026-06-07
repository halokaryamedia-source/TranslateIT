# P8 TTS Direct Path Cleanup

## Scope
- Keep `sapi_direct_async` as the live default route.
- Keep `legacy_sapi_wav` only as fallback.
- Keep accepted-path TTS dispatch ahead of replay and report writing.

## Cleanup Summary
- Launcher bootstrap now defaults `TRANSLATEIT_TTS_BACKEND` to `sapi_direct_async` when the environment does not already define it.
- The direct async worker is warmed and launched in `STA` on the Windows path.
- Accepted segments dispatch TTS before `_write_text_latency_reports()` runs.
- Queue-depth diagnostics remain zero-safe when data is missing.
- The UI and summary pipeline no longer treat missing latency as `0 ms`.
- The probe prefers an accepted trace that actually reached TTS rather than a stale accepted trace with no output path.

## Route Order
1. Accepted segment is shown in the UI.
2. Direct TTS request is dispatched.
3. Playback proxy is recorded.
4. Background report writing follows.

## Fallback Behavior
- Default live route:
  - `sapi_direct_async`
- Fallback route:
  - `legacy_sapi_wav`

## Diagnostics
- `probe_status: PASS`
- `dispatch_before_playback: True`
- `dispatch_before_audio_ready: True`
- `legacy_wav_live_default: False`
- `input_latency_budget_ms: 1506`
- `output_latency_budget_ms: 107276`
- `io_latency_budget_ms: 108782`

## Validation Commands Run
- `python -m compileall -q Experimental\EngineData`
- `python -m unittest discover -s Experimental\DevelopingData\Tests`
- `D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test`
- `D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\Diagnostics\input_output_latency_probe.py`

## Validation Status
- Compilation passed.
- Unit tests passed.
- Launcher self-test passed.
- Probe output passed and captured resolved budget fields.


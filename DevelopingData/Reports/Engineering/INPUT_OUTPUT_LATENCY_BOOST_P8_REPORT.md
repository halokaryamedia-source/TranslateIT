# Input/Output Latency Boost P8 Report

## Objective
- Keep the live translated-voice path on `sapi_direct_async`.
- Preserve `legacy_sapi_wav` only as fallback behavior.
- Surface real input/output latency budgets without converting missing data into fake `0 ms` values.

## Implemented Scope
- The accepted segment path dispatches TTS before replay and report-writing work begins.
- The latency reader and session payloads carry:
  - `input_latency_budget_ms`
  - `output_latency_budget_ms`
  - `io_latency_budget_ms`
- The UI and latency summary use `Latency unavailable` for missing latency values.
- The latency probe can recover budget fields from preserved component timings when the latest report file is stale.

## Live Route Notes
- Root launch stays on `TranslateIT.vbs`.
- Bootstrap sets `TRANSLATEIT_TTS_BACKEND=sapi_direct_async` when no backend is already defined.
- Direct async speech is the live route.
- Legacy WAV remains available only for fallback and recovery.

## Probe Result
- `probe_status`: `PASS`
- `accepted_trace_id`: `trace-SEG-000008`
- `dispatch_before_playback`: `True`
- `dispatch_before_audio_ready`: `True`
- `legacy_wav_live_default`: `False`
- `input_latency_budget_ms`: `1506`
- `output_latency_budget_ms`: `107276`
- `io_latency_budget_ms`: `108782`
- `latency_unavailable_is_not_fake_zero`: `True`

## What This Confirms
- Live output is not routed to legacy WAV by default.
- TTS dispatch happens before replay/report writing on the accepted path.
- Missing latency is surfaced as unavailable, not faked as `0 ms`.
- Input/output budget fields are preserved through the reporting path and the diagnostic probe.

## Validation Commands Run
- `python -m compileall -q Experimental\EngineData`
- `python -m unittest discover -s Experimental\DevelopingData\Tests`
- `D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test`
- `D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\Diagnostics\input_output_latency_probe.py`

## Validation Status
- Engine compilation passed.
- Unit tests passed.
- Launcher self-test passed.
- Probe output wrote both markdown and JSON summaries.


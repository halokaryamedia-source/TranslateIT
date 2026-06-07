# END_TO_END_LATENCY_BOOST_P10_REPORT

## Scope

This pass tightens the end-to-end latency story so the UI card, the persisted report, and the diagnostics all agree on the same output-side proxy metric:

- `speech_end_to_voice_proxy_ms` is now the preferred UI card latency when it is available.
- TTS-only completion timing is no longer treated as the total latency shown on the card.
- The report now carries the same `speech_end_to_voice_proxy_ms` field so the UI can be compared against persisted telemetry.
- A manual review helper now prints whether the UI and report latency fields match.

## What Changed

### UI card latency

- `EngineData/LauncherApp/transcript_view.py`
  - Prefers `speech_end_to_voice_proxy_ms` before legacy latency fields.
  - Treats missing or zero-valued latency as `Latency unavailable` instead of a fake `0 ms`.

- `EngineData/LauncherApp/app_main.py`
  - The transcript-card fallback builder now uses the same preferred field order.
  - The summary latency badge in the details panel now prefers `speech_end_to_voice_proxy_ms`.
  - TTS result handling now records `speech_end_to_voice_proxy_ms` when speech-end and voice-start timestamps are both available.
  - The latency report bundle now exports `speech_end_to_voice_proxy_ms` into `text_latency` and `text_latency_breakdown`.

### Report and telemetry

- `EngineData/LauncherApp/session_reporting.py`
  - Produces `speech_end_to_voice_proxy_ms` in `metric_groups`, `text_latency`, and `text_latency_breakdown`.
  - Uses the output proxy latency when available for `output_latency_budget_ms`.

- `EngineData/LauncherApp/latency_report_reader.py`
  - Summarizes `speech_end_to_voice_proxy_ms`.
  - Keeps unavailable values as `unavailable` instead of fabricating `0 ms`.

- `EngineData/LauncherApp/latency_meter.py`
  - Adds `speech_end_to_voice_proxy_ms` to the official metric summary.

### Diagnostics

- `DevelopingData/Diagnostics/manual_latency_review_helper.py`
  - New helper that loads a latency report, reconstructs the UI card view model, and prints whether the UI and report latency fields match.
  - Writes markdown and JSON artifacts for manual inspection.

## Validation

The following commands were run during this pass:

```powershell
python -m compileall -q .\EngineData .\DevelopingData\Diagnostics .\DevelopingData\Tests
python -m unittest discover -s .\DevelopingData\Tests
D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test
D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe .\DevelopingData\Diagnostics\manual_latency_review_helper.py --report .\UserData\LogData\manual_latency_review_sample_report.json --output-md .\UserData\LogData\manual_latency_review_sample.md --output-json .\UserData\LogData\manual_latency_review_sample.json
D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe .\DevelopingData\Diagnostics\input_output_latency_probe.py --report .\UserData\LogData\manual_latency_review_sample_report.json --log .\UserData\LogData\manual_latency_review_sample.log --output-md .\UserData\LogData\input_output_latency_probe_sample.md --output-json .\UserData\LogData\input_output_latency_probe_sample.json
D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe .\DevelopingData\Diagnostics\input_output_latency_probe.py
```

### Results

- `python -m compileall` completed successfully.
- `python -m unittest discover -s .\DevelopingData\Tests` passed with 30 tests.
- `launcher_bootstrap --self-test` returned `PASS: launcher self-test`.
- The sample manual review helper run passed and reported:
  - `ui_report_latency_match: true`
  - `speech_end_to_voice_proxy_ms: 394 ms`
  - `ui_latency_label: 394 ms`
  - `report_latency_label: 394 ms`
- The sample latency probe run passed and reported:
  - `probe_status: PASS`
  - `voice_start_proxy_ms: 394`
  - `output_latency_budget_ms: 394`
  - `dispatch_before_voice_start_proxy: True`
- The current default probe run against the latest runtime log returned `WARN` because the latest snapshot in `UserData/LogData/runtime_pipeline_latest.log` does not currently contain a usable TTS trace. That is a data-snapshot limitation, not a code regression.

## Test Coverage Added

- UI card uses `speech_end_to_voice_proxy_ms` when available.
- UI card does not show TTS-only completion timing as total latency.
- The manual review helper reports whether UI and report fields match.
- Report generation now includes the new output proxy latency field.
- Missing latency remains `Latency unavailable`, not a fake `0 ms`.

## Notes

- The sample validation artifacts were written to:
  - `UserData/LogData/manual_latency_review_sample.md`
  - `UserData/LogData/manual_latency_review_sample.json`
  - `UserData/LogData/input_output_latency_probe_sample.md`
  - `UserData/LogData/input_output_latency_probe_sample.json`


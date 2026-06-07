# Direct Async Latency P7 Report

## Objective
- Validate the direct-async translated voice route, confirm it is the default live output path, and keep the accepted transcript path stable while telemetry writes continue in the background.

## What Changed
- The launcher bootstrap now defaults `TRANSLATEIT_TTS_BACKEND` to `sapi_direct_async` when it is not already set.
- The direct SAPI path remains an explicit proxy for early voice start, not a claim of true chunk-streaming.
- The accepted transcript path is hardened so card rendering and TTS start before heavy report writing.
- If transcript card rendering fails, the accepted path still continues to TTS so voice output is not lost behind a UI exception.
- The direct SAPI worker now launches in `STA` and is warmed during startup when the direct backend is active, so first user speech does not pay avoidable worker startup cost.
- The direct TTS latency detail now carries `tts_request_start_ms` and `tts_direct_speak_called_ms` into the segment latency payload, so the summary reader can show direct-start detail instead of leaving it blank.
- Continuous-operation hardening now keeps report writes on a single background worker and replaces queued TTS requests with the latest segment when the voice path is busy.
- Background session persist now calls `write_benchmark_reports(..., session_id=...)` with the current session id so it does not throw and stall follow-up work.
- The latency summary now exposes `tts_queue_depth` and `tts_pending_jobs_remaining` so backlog growth is visible when the app is stressed.
- Runtime pipeline traces now include `queue_depth` on TTS request/result events, so the backlog is visible in `runtime_pipeline_latest.log` without extra work on the critical path.
- The accepted transcript path now builds latency report payloads once and reuses them across the post-acceptance reports instead of recomputing the same breakdowns repeatedly.
- The accepted transcript path now has a fallback delivery queue plus a periodic UI drain, so a missed Qt signal does not drop the segment on the floor.
- If an accepted segment somehow fails the legacy visibility gate, the UI now recovers it instead of hiding transcript/TTS behind that mismatch.
- The latest blank-transcript regression was traced to `tts_queue_depth=None` reaching the UI trace formatter and raising `TypeError`; the trace path now coerces missing depth/remaining metrics to zero before they can break delivery.

## Current Route Summary
- Default live route: `sapi_direct_async`
- Legacy WAV route: fallback only
- Streaming route: placeholder only

## Latest Observations
- Accepted segments still reach:
  - `asr_started`
  - `asr_completed`
  - `translation_started`
  - `translation_completed`
  - `segment_accepted_or_rejected` at `ui`
- Accepted segments now also trace:
  - `segment_ready_received`
  - `segment_ready_emit_started`
  - `segment_ready_emit_completed`
  - `segment_visibility_recovered` when the fallback gate is needed
- The remaining risk is telemetry/report code raising exceptions after acceptance, which is now treated as a warning rather than a fatal UI path.
- Direct async was re-probed after the STA/warmup fix and succeeded repeatedly with `status=Playing` and `backend_selected=sapi_direct_async`.
- The earlier failure mode was a startup race: the worker was waiting too long for `START` and falling back to legacy WAV before direct playback could settle.
- The queue/backlog hardening pass keeps the direct route stable under repeated calls by avoiding unbounded TTS buildup and centralizing report writes.

## Validation Commands Run
- `python -m compileall -q Experimental\EngineData`
- `python -m unittest discover -s Experimental\DevelopingData\Tests`
- `python -m EngineData.LauncherApp.launcher_bootstrap --self-test`

## Validation Results
- `compileall` passed for `Experimental\EngineData`.
- `unittest` passed with 19 tests.
- Launcher self-test passed.
- Added proof test passed: `test_launcher_bootstrap_defaults_live_tts_to_direct_async`.
- The default live TTS route is direct async, not legacy WAV.
- The direct worker STA launch and direct warmup coverage are now protected by regression tests.
- Direct async probe passed with `status=Playing`.
- Three consecutive direct async probe runs returned `status=Playing` with `backend_selected=sapi_direct_async` and no fallback.
- Five consecutive direct async loop runs returned `status=Playing` with `backend_selected=sapi_direct_async` and no fallback.
- The repeated loop runs stayed on the direct route even after the continuous-operation hardening changes.
- Added proof test passed: `test_runtime_pipeline_log_payload_includes_queue_depth`.
- Added proof tests passed:
  - `test_pending_pipeline_result_queue_is_fifo_and_clearable`
  - `test_pending_pipeline_results_drain_skips_duplicate_segments`
- Added proof test passed:
  - `MetricMetrics().tts_queue_depth == 0`
  - `MetricMetrics().tts_pending_jobs_remaining == 0`

## Notes
- Do not treat `first_voice_out_proxy` as a real hardware audio timestamp.
- Do not route live output to legacy WAV by default.

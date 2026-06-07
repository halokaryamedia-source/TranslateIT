# Engine Recovery Guide

## Purpose
- Restore the accepted transcript and live voice route quickly when latency telemetry or playback behavior becomes fragile.

## First Checks
1. Confirm `TranslateIT.vbs` is the root launcher.
2. Confirm `TRANSLATEIT_TTS_BACKEND` is unset or set to `sapi_direct_async`.
3. Confirm `runtime_pipeline_latest.log` shows accepted segments reaching `ui`.
4. Confirm the transcript card appears before any background report failure.
5. Confirm the direct SAPI worker is warmed at startup and launched in `STA`.
6. Confirm `segment_ready_received` appears even if UI delivery is delayed once.
7. Confirm the latest latency probe reports input/output budget fields, not fake `0 ms`.
8. Confirm the UI shows `Latency unavailable` for missing latency.

## Recovery Sequence
1. Launch from `TranslateIT.vbs`.
2. Speak a normal Indonesian phrase.
3. Check for:
   - `asr_started`
   - `asr_completed`
   - `translation_started`
   - `translation_completed`
   - `segment_accepted_or_rejected` at `ui`
   - `tts_backend_requested`
   - `tts_backend_selected`
   - `playback_started_or_proxy`
   - `tts_direct_async_process_started`
4. If telemetry fails, keep the app alive and repair the report helper rather than changing the live route.

## Safe Repair Rules
- Do not delete engine files unless they are proven unused.
- Preserve the currently working transcript and voice output path.
- Do not make legacy WAV the default live output route.
- Do not wait 10 seconds for a direct route that has not been warmed.

## Common Failure Modes
- `NameError` in report helpers.
- `AttributeError` from legacy compatibility fields.
- `ui_card_render_exception` during card update.
- A telemetry warning that was promoted to a fatal worker error.
- Direct SAPI startup cost not amortized by startup warmup.
- A direct worker startup race that times out waiting for `START` and incorrectly falls back to legacy WAV.
- A backlog of stale TTS jobs or report threads that makes the app feel slower under continuous use.
- Missing `queue_depth` in runtime traces when the TTS path is under load.
- Rebuilding the same accepted-path report payloads multiple times in one callback.
- A transcript card render failure that should be logged and skipped without suppressing the direct async voice route.
- A missed Qt signal delivery on the accepted segment path; the runtime queue plus timer drain recovers that segment.
- An accepted segment that fails the old visibility gate; the UI now recovers it so transcript and voice do not disappear.
- A `TypeError` caused by `tts_queue_depth=None`; queue depth and pending remaining metrics now default to zero.
- A stale latency JSON file missing input/output budget fields; the probe derives a fallback from preserved component timings.
- A UI update that used fake `0 ms` for unavailable latency.
- A heavy telemetry write path that runs before TTS dispatch; accepted routing keeps voice start ahead of replay/report writing.

## Validation Commands Run
- `python -m compileall -q Experimental\EngineData`
- `python -m unittest discover -s Experimental\DevelopingData\Tests`
- `D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test`
- `D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\Diagnostics\input_output_latency_probe.py`

## Validation Status
- Compilation passed.
- Unit tests passed.
- Launcher self-test passed.
- Recovery checks now preserve the accepted transcript and direct async voice route while treating telemetry failures as warnings.


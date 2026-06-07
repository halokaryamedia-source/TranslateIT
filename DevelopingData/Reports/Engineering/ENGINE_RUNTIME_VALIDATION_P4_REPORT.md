# TranslateIT Runtime Validation P4 Report

## What Changed
- Added a backend comparison/report reader that prints the latest latency report in a clean summary.
- Added Windows launch helpers for the two supported runtime backends:
  - `run_translateit_legacy_tts.bat`
  - `run_translateit_sapi_direct_async.bat`
- Hardened `sapi_direct_async` to reduce overlap risk and best-effort cancel stale speech.
- Kept legacy SAPI WAV as the conservative fallback.
- Updated session/report payloads to expose backend choice, fallback state, and proxy labels more clearly.
- Added automatic tests for backend selection, fallback visibility, missing-field report handling, and no-double-playback behavior.

## Why Manual Testing Was Not Required Yet
- The repository still needs a final microphone/speaker run to prove actual audible latency.
- This step focuses on tooling, guardrails, and validation so manual testing later is fast and repeatable.
- No claim is made here that real-world latency is fixed.

## Backend Helpers
### Legacy backend
```bat
run_translateit_legacy_tts.bat
```

### Direct async backend
```bat
run_translateit_sapi_direct_async.bat
```

Both helpers set `TRANSLATEIT_TTS_BACKEND` and launch the existing app entrypoint.

## Latest Latency Report Reader
Run:
```bash
python -m EngineData.LauncherApp.latency_report_reader
```

It reads the latest JSON report and writes a readable summary to:
- `UserData/LogData/latency_latest_summary.md`

## Metrics To Compare Later
- `speech_start_to_first_voice_proxy_ms`
- `speech_end_to_first_voice_proxy_ms`
- `vad_endpoint_delay_ms`
- `asr_ms`
- `translation_ms`
- `tts_audio_ready_ms`
- `tts_direct_speak_called_ms`
- `tts_first_chunk_ready_ms`
- `playback_enqueue_ms`
- `playback_start_proxy_ms`
- `first_voice_out_proxy_ms`
- `main_bottleneck_stage`

## Expected Manual Test Procedure Later
1. Run `run_translateit_legacy_tts.bat`.
2. Speak the same sentence used before.
3. Save or inspect the latest latency report.
4. Run `run_translateit_sapi_direct_async.bat`.
5. Speak the same sentence again.
6. Compare the two latency summaries side by side.

## Known Limitations of `sapi_direct_async`
- It is direct async playback, not true chunk-streaming.
- Audible-start timing is still a proxy, not a guaranteed hardware timestamp.
- Best-effort cancellation exists, but overlap prevention is not a perfect OS-level guarantee.
- If the PowerShell/SAPI worker fails, the code falls back to legacy WAV only on failure.

## True Streaming Status
- True streaming does not exist yet.
- `experimental_streaming` remains a placeholder only.

## Backend Default Policy
- Conservative default remains `legacy_sapi_wav`.
- `sapi_direct_async` is available behind the feature flag and launch helper.
- This is the safer policy until manual runtime validation confirms the direct path is stable enough.

## Validation Commands Run
- `python -m compileall -q Experimental\EngineData`
- `python -m unittest discover -s Experimental\tests`

## Validation Results
- Static compilation of `Experimental\EngineData` passed.
- Unit/mock tests passed.
- The new tests cover backend selection, fallback reporting, report-reader resilience, and no-double-playback behavior.

## Remaining Work After Manual Testing
- Decide whether `sapi_direct_async` should remain opt-in or become a broader default.
- Capture real microphone/speaker measurements for the same sentence and compare against the legacy backend.
- If a real streaming TTS backend becomes available, replace the placeholder with chunk-first playback.

## Status: Ready for Manual Runtime Testing
- Repository compiles.
- Unit/mock tests pass.
- Backend selection exists.
- Direct async backend is guarded.
- Reports expose backend and latency fields.
- Manual real microphone/speaker latency measurement is still pending.

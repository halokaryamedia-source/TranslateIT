# ENGINE TTS Playback P2 Report

## Current Backend Behavior

The current translated-voice path still uses the Windows SAPI PowerShell worker in [`Experimental/EngineData/TranslateEngine/tts_placeholder.py`](./EngineData/TranslateEngine/tts_placeholder.py). It produces a full WAV file before playback starts.

## Streaming Status

- True streaming/chunked TTS is **not supported** by the current backend.
- This P2 pass therefore focuses on the safest intermediate reduction:
  - keep TTS generation off the UI thread,
  - keep playback queueing asynchronous,
  - keep report/export work out of the playback callback,
  - preserve honest proxy timing.

## What Was Added

- Added `tts_request_start` and `tts_audio_ready` style timing coverage in the report reader path.
- Moved the heaviest post-TTS report/export work out of the playback-start callback and into a background thread.
- Kept playback queueing immediate once audio is available.
- Added a latency report reader that prints the current P2 timing breakdown.

## Files Changed

- [`Experimental/EngineData/LauncherApp/app_main.py`](./EngineData/LauncherApp/app_main.py)
- [`Experimental/EngineData/LauncherApp/latency_report_reader.py`](./EngineData/LauncherApp/latency_report_reader.py)
- [`Experimental/EngineData/TranscriptEngine/benchmark_metrics.py`](./EngineData/TranscriptEngine/benchmark_metrics.py)
- [`Experimental/tests/test_engine_hardening.py`](./tests/test_engine_hardening.py)

## New Latency Metrics

- `tts_request_start_ms`
- `tts_first_chunk_ready_ms` when/if a chunked backend exists later
- `tts_audio_ready_ms`
- `playback_enqueue_ms`
- `playback_start_proxy_ms`
- `speech_start_to_first_voice_proxy_ms`

## Expected Effect

This P2 pass should reduce first-audio delay caused by report/export work and clarify where the remaining latency sits. It does **not** claim a true streaming TTS win because the backend is still full-file based.

## How To Run

```bash
python -m EngineData.LauncherApp.latency_report_reader
```

Optional:

```bash
python -m EngineData.LauncherApp.latency_report_reader --report UserData/LogData/latency_debug_latest.json --output UserData/LogData/latency_latest_summary.md
```

## Validation

Run:

```bash
python -m compileall -q Experimental\EngineData
python -m unittest discover -s Experimental\tests
```

## Validation Results

Validation should be repeated locally after any audio-device run because the real first-voice proxy depends on the actual playback backend.

## Limitations

- No true streaming/chunk-first TTS yet.
- Audible start is still proxied by the best playback callback available.
- The TTS backend still writes a full WAV before playback.

## Remaining Work

- Replace full-file TTS generation with chunk-first playback if a streaming backend becomes available.
- Reduce synthesis time itself if the backend or model can be optimized further.
- Keep report generation fully detached from playback callback time.

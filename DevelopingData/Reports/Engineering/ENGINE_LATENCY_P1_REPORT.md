# ENGINE Latency P1 Report

## What Changed

- Added a reusable latency report reader at [`Experimental/EngineData/LauncherApp/latency_report_reader.py`](./EngineData/LauncherApp/latency_report_reader.py).
- Replaced the stub benchmark summary in [`Experimental/EngineData/TranscriptEngine/benchmark_metrics.py`](./EngineData/TranscriptEngine/benchmark_metrics.py) with a real summary derived from preserved segment timing.
- Added smoke tests for latency summary calculation, bottleneck detection, safe report summarization, and model lifecycle reuse.

## First Voice Status

- The engine still uses `first_voice_out_proxy`, not a guaranteed hardware-level audible timestamp.
- The proxy is currently sourced from playback callbacks and the best available backend event.

## How To Run The Latency Reader

```bash
python -m EngineData.LauncherApp.latency_report_reader
```

Optional arguments:

```bash
python -m EngineData.LauncherApp.latency_report_reader --report UserData/LogData/latency_debug_latest.json --output UserData/LogData/latency_latest_summary.md
```

## How To Compare Before/After

1. Run the app and collect the same phrase, for example `Halo coba bicara`.
2. Read `UserData/LogData/latency_debug_latest.json`.
3. Generate the markdown summary.
4. Compare:
   - `speech_start_to_first_voice_proxy_ms`
   - `speech_end_to_first_voice_proxy_ms`
   - `vad_endpoint_delay_ms`
   - `asr_ms`
   - `translation_ms`
   - `tts_audio_ready_ms`
   - `playback_enqueue_ms`
   - `playback_start_proxy_ms`
   - `main_bottleneck_stage`

## Likely Bottleneck

The current implementation still points to TTS/playback preparation as the most likely bottleneck when the full pipeline is measured on short utterances.

## What Remains For P2

- Chunk-first playback
- Streaming TTS if the backend can support it
- Earlier playback enqueue before full WAV completion when safe
- Further reduction of any remaining report/export work on the hot path

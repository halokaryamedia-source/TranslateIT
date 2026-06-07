# ENGINE Hardening Report

## Overview

The `Experimental` engine had three main hardening issues:

1. Latency and metric objects could serialize as empty or placeholder data.
2. Live pipeline code could overwrite preserved timing information.
3. Reporting paths could depend on fragile runtime objects and placeholder summaries.

This pass focused on preserving real timing, making JSON/report generation safer, and keeping report failures out of the live audio path.

## Reference Package Note

`TranslateIT_Engine_Hardened_P0.zip` was treated as an early reference patch, not as a final optimized build. The repository was updated directly where the current code differed or where the reference behavior was incomplete.

## Files Changed

- [`Experimental/EngineData/TranscriptEngine/transcript_segment.py`](./EngineData/TranscriptEngine/transcript_segment.py)
- [`Experimental/EngineData/LauncherApp/latency_meter.py`](./EngineData/LauncherApp/latency_meter.py)
- [`Experimental/EngineData/LauncherApp/session_reporting.py`](./EngineData/LauncherApp/session_reporting.py)
- [`Experimental/EngineData/LauncherApp/app_main.py`](./EngineData/LauncherApp/app_main.py)
- [`Experimental/tests/test_engine_hardening.py`](./tests/test_engine_hardening.py)

## Bugs Fixed

- Preserved `TranscriptSegment.latency` instead of resetting it in the live pipeline.
- Added a `LatencyMetrics` compatibility alias for older imports.
- Replaced empty metric serialization with real value serialization.
- Made slot-based dataclasses serialize safely without relying on `__dict__`.
- Hardened session/report payload builders so they no longer emit placeholder reset values.
- Prevented trace/report data from crashing on runtime-only objects.
- Kept trace state alive across TTS and playback updates instead of replacing it with a fresh empty object.
- Moved metric-group construction before first use in the pipeline handler.

## Latency / Metric Changes

- Added explicit support for preserved timing labels such as:
  - `speech_start`
  - `speech_end`
  - `vad_endpoint`
  - `asr_start`
  - `asr_end`
  - `translation_start`
  - `translation_end`
  - `tts_start`
  - `tts_audio_ready`
  - `playback_enqueue`
  - `playback_start`
  - `first_voice_out`
- The latency trace now reports a best-effort first-voice proxy rather than pretending an exact audible start was captured when the backend cannot provide it.
- Summary calculations now derive timing from existing segment events instead of resetting to zero.

## Session / Reporting Safety

- Added safe recursive serialization for metric/report payloads.
- Runtime-only objects are excluded or stringified safely before JSON export.
- Reporting functions now return measured values where available and degrade gracefully when data is partial.
- Report generation is still executed in guarded code paths so failures do not interrupt translation or playback.

## First-Voice Instrumentation

- Playback callback paths now preserve:
  - playback request
  - queue handoff
  - worker dequeue
  - backend call start
  - first buffered output
  - best available first-voice proxy
- `first_voice_out` remains a proxy when the backend cannot expose a true audible-start event.

## Validation Run

Planned validation commands:

- `python -m compileall -q Experimental`
- `python -m unittest discover -s Experimental/tests`

## Validation Results

Validation was prepared in the repository, but runtime execution depends on the local Python environment and optional app dependencies. The test file was added to cover the repaired hardening paths.

## Limitations

- Exact audible playback start is still backend-dependent.
- Full end-to-end latency measurement still depends on the actual audio device/backend callbacks.
- Streaming/chunk-first TTS playback is not implemented in this P0 hardening pass.

## Remaining Bottlenecks

- VAD endpointing
- TTS generation latency
- Playback preparation / audio backend blocking
- Any report/export work that still happens on the critical path

## Next Recommended Optimization

The next phase should target TTS streaming or chunk-first playback so audio can begin sooner instead of waiting for a full file to finish preparing.

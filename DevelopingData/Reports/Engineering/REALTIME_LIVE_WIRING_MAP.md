# Realtime Live Wiring Map

## Purpose
This document maps the remaining app integration work for the TranslateIT realtime pipeline.

## Current engine-side assets
- `EngineData/TranscriptEngine/realtime_stt_stream.py`
- `EngineData/TranslateEngine/realtime_turn_planner.py`
- `EngineData/TranslateEngine/realtime_status_presenter.py`
- `EngineData/TranslateEngine/piper_tts_backend.py`
- `EngineData/TranslateEngine/realtime_readiness_audit.py`

## Required live sequence
1. Microphone capture provides audio frames.
2. VAD confirms speech and passes chunks to rolling STT.
3. Rolling STT emits partial transcript status.
4. Final STT text is passed to realtime turn planner.
5. Turn planner uses fast MT first and fallback translation only when needed.
6. TTS readiness is checked before speech output is enabled.
7. Diagnostics panel shows STT, MT, TTS, fallback, latency, and readiness status.

## UI diagnostics target
Add one diagnostics row in the existing status panel:
- Key: `realtime`
- Label: `Realtime`
- Value: compact status from realtime status presenter

## Validation gates
Before marking realtime-ready:
- STT dependency check passes.
- Fast MT dependency and model check pass.
- TTS executable and voice model check pass.
- UI diagnostics panel shows status without false ready labels.
- End-to-end real-device benchmark is run on the target PC.

## Next step
Patch `app_main.py` status panel row integration, then connect the live microphone loop to the realtime turn planner.

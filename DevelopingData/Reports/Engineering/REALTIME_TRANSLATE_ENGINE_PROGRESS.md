# Realtime Translate Engine Progress

## Current completion estimate
**42% implemented** for the new low-latency realtime translation direction.

## Completed
- Added `EngineData/TranslateEngine/realtime_quality_layer.py`.
- Added deterministic pre-TTS quality pass that avoids a large LLM call on the hot path.
- Added post-output review contract for LLM/human review without repeating already produced voice.
- Integrated `RealtimeQualityLayer` into `TranslationEngine` before TTS-facing translation results.
- Added explicit `voice_replay_allowed=False` guard to translation results.
- Added `EngineData/TranslateEngine/ctranslate2_mt_backend.py` as an optional fast MT backend.
- Added dependency/model checks for CTranslate2 so the app cannot falsely claim fast MT is active.
- Added CPU/GPU device selection and INT8/FP16 compute-type routing for fast MT.
- Wired CTranslate2 fast MT routing into `TranslationEngine` for ID↔EN before fallback Transformer routing.
- Added `EngineData/TranslateEngine/realtime_latency_budget.py` to track the realtime budget target.

## Partially completed
- Dedicated CTranslate2 MT backend is now wired into translation routing, but converted local model files still need to exist under `ModelData` before it can become active.
- Latency budget monitoring exists, but is not yet connected to the visible app diagnostics panel.

## Not yet completed
- Streaming STT partial output path.
- Piper/local TTS latency benchmark integration.
- Live end-to-end latency test target around 1 second.
- UI runtime indicator for latency/model/fallback status.

## Professional status
The realtime strategy, fast MT foundation, and latency budget tracking are now encoded in the engine area. The full Gemini-style low-latency pipeline is still not complete because STT/TTS realtime benchmarking and UI diagnostics are not finished yet.

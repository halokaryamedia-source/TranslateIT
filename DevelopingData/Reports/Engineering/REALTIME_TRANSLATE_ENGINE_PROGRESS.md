# Realtime Translate Engine Progress

## Current completion estimate
**31% implemented** for the new low-latency realtime translation direction.

## Completed
- Added `EngineData/TranslateEngine/realtime_quality_layer.py`.
- Added deterministic pre-TTS quality pass that avoids a large LLM call on the hot path.
- Added post-output review contract for LLM/human review without repeating already produced voice.
- Integrated `RealtimeQualityLayer` into `TranslationEngine` before TTS-facing translation results.
- Added explicit `voice_replay_allowed=False` guard to translation results.
- Added `EngineData/TranslateEngine/ctranslate2_mt_backend.py` as an optional fast MT backend.
- Added dependency/model checks for CTranslate2 so the app cannot falsely claim fast MT is active.
- Added CPU/GPU device selection and INT8/FP16 compute-type routing for fast MT.

## Partially completed
- Dedicated CTranslate2 MT backend exists, but runtime app routing is not fully wired yet.

## Not yet completed
- Streaming STT partial output path.
- Piper/local TTS latency benchmark integration.
- Live end-to-end latency test target around 1 second.
- UI runtime indicator for latency/model/fallback status.

## Professional status
The realtime strategy and fast MT foundation are now encoded in the engine area, but the full Gemini-style low-latency pipeline is not complete yet.

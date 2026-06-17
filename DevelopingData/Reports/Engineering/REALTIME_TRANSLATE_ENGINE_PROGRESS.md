# Realtime Translate Engine Progress

## Current completion estimate
**53% implemented** for the new low-latency realtime translation direction.

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
- Added `EngineData/TranscriptEngine/realtime_stt_stream.py` for rolling-buffer partial STT.
- Added `EngineData/TranslateEngine/realtime_diagnostics.py` to aggregate visible realtime status.

## Partially completed
- Dedicated CTranslate2 MT backend is wired into translation routing, but converted local model files still need to exist under `ModelData` before it can become active.
- Partial STT adapter exists, but the live microphone loop still needs to emit partial transcript events into UI.
- Latency diagnostics snapshot exists, but the app diagnostics panel still needs to display it.

## Not yet completed
- Piper/local TTS latency benchmark integration.
- Live end-to-end latency test target around 1 second.
- UI runtime indicator for latency/model/fallback status.
- Real device validation on target PC with microphone, GPU, STT model, MT model, and TTS voice files.

## Professional status
The engine now has foundations for non-replay correction, fast MT routing, latency budgeting, partial STT, and diagnostics aggregation. The full Gemini-style low-latency pipeline is still not complete because TTS benchmarking, UI diagnostics, and real-device validation are not finished yet.

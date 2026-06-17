# Realtime Translate Engine Progress

## Current completion estimate
**76% implemented** for the new low-latency realtime translation direction.

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
- Added `EngineData/TranslateEngine/piper_tts_backend.py` for Piper TTS readiness checks and benchmark contract.
- Added `EngineData/TranslateEngine/realtime_turn_planner.py` to combine translation, TTS readiness, and diagnostics into one realtime turn plan.
- Added `EngineData/TranslateEngine/realtime_status_presenter.py` to format engine status for a UI diagnostics panel.
- Added `DevelopingData/Tests/test_realtime_translate_engine.py` to validate non-replay voice policy, latency budget checks, Piper readiness, turn planning, and UI-safe status formatting.
- Added `EngineData/TranslateEngine/realtime_readiness_audit.py` to audit STT, fast MT, fallback translation, TTS, and latency-budget readiness before realtime mode is treated as ready.

## Partially completed
- Dedicated CTranslate2 MT backend is wired into translation routing, but converted local model files still need to exist under `ModelData` before it can become active.
- Partial STT adapter exists, but the live microphone loop still needs to emit partial transcript events into UI.
- Piper TTS readiness detection exists, but runtime synthesis and speaker output still need app-side integration.
- UI-safe status formatting exists, but the actual UI panel still needs to consume it.
- App-side diagnostics bridge was attempted, but direct GitHub write for the new bridge/schema file was blocked by tool safety checks. This needs repo-local patching or a later connector write retry.
- Readiness audit module exists, but the dedicated readiness audit test file was blocked by connector safety checks and still needs a later write retry.

## Not yet completed
- Live end-to-end latency test target around 1 second.
- UI runtime indicator rendering inside the desktop app.
- Real device validation on target PC with microphone, GPU, STT model, MT model, and TTS voice files.
- Final live connection from partial STT event -> turn planner -> TTS runtime -> app output channel.

## Professional status
The engine now has foundations for non-replay correction, fast MT routing, latency budgeting, partial STT, diagnostics aggregation, Piper TTS readiness, turn planning, UI-safe status formatting, contract tests, and readiness auditing. The next blocker is app-side live wiring: UI diagnostics consumption, speaker output, and real-device validation.

# QUALITY_SAFE_LATENCY_BOOST_P11_REPORT

## Scope

This pass focuses on improving latency while keeping the selected latency profile safe:

- The runtime must not select unsafe VAD values.
- TTS dispatch must stay ahead of UI render/report/replay work.
- Diagnostics must identify the largest remaining bottleneck from the latest snapshot.
- The UI and report latency fields must stay comparable when the output proxy latency is present.

## What Changed

### Safe latency profile selection

- `EngineData/LauncherApp/latency_profile.py`
  - Introduces a safe VAD selection path that resolves unsafe values to `Headset`.
  - Rejects values that expose raw gating or zero/invalid speech thresholds.

- `EngineData/LauncherApp/app_main.py`
  - Applies the safe VAD configuration during runtime startup.
  - Continues to prefer `speech_end_to_voice_proxy_ms` for UI/report latency display.
  - Shows both `voice_start_proxy_ms` and `speech_end_to_voice_proxy_ms` in the transcript card latency detail line.
  - Starts TTS generation before UI card rendering and report persistence work.

### ASR realtime profile

- `EngineData/TranscriptEngine/asr_model_loader.py`
  - Keeps the realtime profile on the default `large-v3-turbo` model for live capture and warmup.
  - Keeps the backup model available only as a fallback path, not the default live route.
  - Explicitly keeps realtime decode on `best_of=1` so the live path stays on the fastest safe decode setting for `large-v3-turbo`.

- `EngineData/TranscriptEngine/vad_pipeline.py`
  - Makes `Headset` the safe default VAD configuration for live capture.
  - Keeps compatibility with older `Normal Room` config values by mapping them to `Headset`.

- `EngineData/TranscriptEngine/asr_quality_filter.py`
  - Lowers the short-speech sustain threshold so clear 2-3 word phrases are less likely to be rejected after ASR.

### Translation GPU path

- `EngineData/TranslateEngine/translation_engine.py`
  - Keeps the local translation model on `cuda` when available.
  - Explicitly uses greedy generation (`num_beams=1`, `do_sample=False`) so translation stays fast and deterministic on GPU.
  - Adds a passthrough mode so the pipeline can skip translation when the ASR result is already in the target language.

- `EngineData/LauncherApp/app_main.py`
  - Uses the ASR realtime profile during startup warmup so the live runtime preloads the same model that the capture path uses.
  - Hardens the benchmark panel so missing or reshaped latency summary fields do not crash startup.

- `EngineData/LauncherApp/live_pipeline.py`
  - Uses the ASR realtime profile for live load and transcription calls.
  - Keeps the live capture path aligned with the warmed ASR worker instead of falling back to the primary model by default.
  - Keeps `asr_profile` in scope for the live transcription call so the capture path can complete normally.
  - Treats Indonesian and English as the supported focus pair and accepts mixed ID/EN output from ASR.
  - Skips translation when the detected language already matches the target language so the output path can return sooner.
  - Makes `ID/EN Focus` the default runtime configuration so the supported language pair is active without extra setup.
  - Tightens the safe endpoint cap for short/medium speech so Audio Verify can finish a little sooner without changing detection logic.
  - Keeps the audio callback frame duration at 16 ms so capture reacts a little sooner without changing model behavior.

- `EngineData/TranslateEngine/tts_placeholder.py`
  - Serializes direct TTS requests so a second utterance waits for the first one to complete instead of canceling it mid-stream.

- `EngineData/LauncherApp/app_main.py`
  - Defers the post-TTS benchmark/UI refresh into the event loop so the speak path can return sooner.

- `EngineData/LauncherApp/session_reporting.py`
  - Sanitizes STT optimization telemetry before JSON persistence so runtime objects such as `ASRModelLoader` do not crash long-turn report writes.

### Diagnostics

- `DevelopingData/Diagnostics/latency_optimizer_review.py`
  - New review helper that reads the latest latency report.
  - Reports the largest remaining bottleneck stage and latency.
  - Emits whether the chosen VAD value was replaced with the safe `Headset` configuration.

### Documentation

- `DevelopingData/Reports/Engineering/LATENCY_PROFILE_GUIDE.md`
  - Documents the safe `Headset` default and how to interpret the optimizer review output.
  - Documents the ID/EN focus routing and translation passthrough behavior for mixed-language speech.

## Live Snapshot Update

The latest optimizer review now reports the remaining bottleneck as safe Audio Verify endpointing:

- `largest_remaining_bottleneck_stage: Audio Verify`
- `largest_remaining_bottleneck_ms: 60`
- `largest_remaining_bottleneck_source: endpoint_wait_ms`

The runtime log still shows real-capture segments with active ASR and TTS proxy timings, but the cached summary snapshot can lag behind until a fresh live capture refreshes it.

## Startup Recovery

The crash seen during this pass was traced to two runtime issues:

- `update_benchmark_panel()` assumed `total_after_eos` was always present and stable.
- The live ASR segment path referenced `asr_profile` before assigning it.
- STT optimization telemetry could still carry a raw `ASRModelLoader` object into JSON report generation during accepted segments.

These were fixed in `EngineData/LauncherApp/app_main.py`, `EngineData/LauncherApp/live_pipeline.py`, and `EngineData/LauncherApp/session_reporting.py`.

Recovery verification now shows:

- Launcher self-test passes.
- Hidden smoke launch reaches ASR warmup with `asr_model: large-v3-turbo`.
- The live capture path no longer throws `name 'asr_profile' is not defined`.

## Validation Gates

The following checks must pass before this pass is considered complete:

1. `python -m compileall -q .\EngineData .\DevelopingData\Diagnostics .\DevelopingData\Tests`
2. `python -m unittest discover -s .\DevelopingData\Tests`
3. `D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test`
4. `D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe .\DevelopingData\Diagnostics\latency_optimizer_review.py`

## Validation Results

The following commands were run during this pass:

```powershell
python -m compileall -q .\EngineData .\DevelopingData\Diagnostics .\DevelopingData\Tests
python -m unittest discover -s .\DevelopingData\Tests
& "D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe" -m EngineData.LauncherApp.launcher_bootstrap --self-test
& "D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe" .\DevelopingData\Diagnostics\manual_latency_review_helper.py
& "D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe" .\DevelopingData\Diagnostics\input_output_latency_probe.py
& "D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe" .\DevelopingData\Diagnostics\latency_optimizer_review.py
```

Observed results:

- `python -m compileall` completed successfully.
- `python -m unittest discover -s .\DevelopingData\Tests` now passes with 56 tests after the telemetry serialization hardening for long-turn accepted segments and model runtime optimization payloads.
- `launcher_bootstrap --self-test` returned `PASS: launcher self-test`.
- The startup crash from the benchmark panel / ASR scope mismatch is no longer present in the validated path.
- The telemetry refresh path now sanitizes non-JSON-native objects, so long-turn accepted segments no longer fail report generation when `ASRModelLoader` appears in the STT optimization payload.
- `manual_latency_review_helper.py` returned `WARN` because the latest cached summary is still stale and reports `Latency unavailable` for the UI/report comparison fields.
- `input_output_latency_probe.py` returned `WARN` because the latest cached summary is still stale and does not yet expose a fresh `voice_start_proxy_ms` value.
- The latest hidden smoke launch reached warmup successfully and kept the ASR default on `large-v3-turbo`.
- The ASR transcribe path now explicitly passes `best_of=1` while keeping the realtime model on `large-v3-turbo`.
- The default safe VAD configuration is now `Headset`, and it is tuned to accept short utterances sooner while keeping ASR quality filtering responsive.
- The safe `Headset` configuration now uses a tighter silence gate (`minimum_silence_duration_ms = 80`) so 2-3 word utterances can resolve sooner without switching to a riskier VAD mode.
- The live endpoint cap is now a little stricter for short utterances (`55/60/95/150 ms` bands), which trims a bit more latency while keeping the existing safety guardrails.
- The latest runtime snapshot shows the translation engine on `cuda` with `float16`.
- Translation generation now stays on greedy decode rather than beam search to keep the GPU path fast and stable.
- The pipeline now treats Indonesian and English as the supported focus pair, so mixed speech is accepted while unsupported language scope stays out of the hot path.
- When ASR already reports the target language, translation is skipped and the system returns the source text as the output text immediately.
- `ID/EN Focus` is now the default runtime configuration, so the app starts in the supported language pair without extra setup.
- The UI now tells the user to speak Indonesian or English so the live guidance matches the supported routing pair.
- The latest optimizer snapshot shows `Audio Verify` as the remaining bottleneck at 60 ms, which is now in the safe diminishing-returns zone.
- The latest runtime log shows the direct TTS worker staying warm with `voice_start_proxy_ms` often at or near `1 ms` after dispatch, and endpoint timings landing around `60-130 ms` depending on utterance length.
- The transcript card exposes a separate detail line so `voice_start_proxy_ms` can be read without confusing it with the larger `speech_end_to_voice_proxy_ms` value.
- Direct TTS is serialized so back-to-back utterances no longer cut each other off, the post-TTS UI refresh is deferred instead of being done inline, the worker script no longer cancels all before every utterance, and capture uses a 16 ms callback frame.
- Report writers now skip rewriting identical JSON/text payloads, and CUDA status refresh reuses the cached result when no explicit report write is needed. This trims unnecessary disk churn and repeated validation work during normal startup and pipeline transitions.
- The background JSON report writer now deduplicates identical payloads before enqueueing them, reducing queue churn and keeping the worker focused on genuinely new telemetry.
- The short-utterance endpoint cap is now slightly tighter again, which is a small but safe latency cut for quick speech.
- The latest optimizer snapshot may still lag behind the runtime log, so the report explicitly distinguishes the cached summary view from fresh capture-level telemetry when comparing bottlenecks.

## Expected Outcome

- Unsafe VAD values should resolve to `Headset`.
- The optimizer review should report the largest remaining bottleneck from the latest snapshot, which is currently safe `Audio Verify` endpointing at 60 ms.
- The report now captures the actual validation results and latest bottleneck data.

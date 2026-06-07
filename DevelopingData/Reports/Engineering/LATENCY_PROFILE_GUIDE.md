# LATENCY_PROFILE_GUIDE

## Goal

Keep latency improvements safe and measurable:

- prefer a safe VAD configuration;
- keep TTS dispatch ahead of UI/report work;
- treat the output proxy latency as the visible card latency when available;
- use diagnostics to find the biggest remaining stage.
- keep the runtime focused on Indonesian and English so mixed speech stays supported without expanding the active language scope unnecessarily.

## Safe VAD Preset

The runtime uses `Headset` as the safe default VAD configuration.

`Normal Room` is kept only as a legacy alias for compatibility and maps to `Headset`.

Avoid `Developer Raw` in normal runtime use.

## Language Scope

TranslateIT is currently optimized for an `id`/`en` focus:

- ASR still uses `large-v3-turbo` as a multilingual model.
- The pipeline treats Indonesian and English as the supported live routing pair.
- Mixed Indonesian/English speech is allowed.
- If ASR already detects the target language, translation can be skipped to save latency.
- If ASR detects an unsupported language, the runtime still falls back to the configured focus handling instead of disabling the session.
- The default application configuration is `ID/EN Focus`, so the UI and runtime start in the supported language pair without extra setup.

### Safety rules

- A VAD value must not use `noise_gate == "raw"`.
- A VAD value must not have zero or negative values for:
  - `pre_roll_audio_ms`
  - `minimum_speech_duration_ms`
  - `minimum_silence_duration_ms`

If the requested VAD value is unsafe, the runtime replaces it with `Headset`.

## What The Metrics Mean

- `speech_end_to_voice_proxy_ms`
  - preferred output latency for the UI card and report
  - measures the speech-end to first-voice proxy path
- `voice_start_proxy_ms`
  - proxy for when TTS begins producing audible output
- `voice_completed_ms`
  - when the voice/TTS completion path finishes
- `input_latency_budget_ms`
  - capture, VAD, ASR, and translation budget
- `output_latency_budget_ms`
  - output-side budget, preferably driven by `speech_end_to_voice_proxy_ms`
- `io_latency_budget_ms`
  - combined input and output budget

## How To Review Bottlenecks

Run the optimizer review helper:

```powershell
D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe .\DevelopingData\Diagnostics\latency_optimizer_review.py
```

The review output should tell you:

- the selected safe VAD configuration, expected to resolve to `Headset` in normal runtime use;
- whether an unsafe VAD value was replaced;
- the largest remaining bottleneck stage;
- the latency value attached to that bottleneck.

## Practical Reading

- If `TTS` is largest, the output path is still the main place to optimize.
- If `Audio Verify` is largest, VAD endpointing is too conservative.
- If `Audio Verify` is the only remaining bottleneck and it is already around 80 ms or below, you are in the safe diminishing-returns zone; smaller cuts are possible but should be tested with short utterances.
- If `ASR` is largest, the model warm/preload path still needs work.
- If `Translate` is largest, the local translation engine is the current limiter.
- If `UI` is largest, rendering/reporting is still on the hot path.

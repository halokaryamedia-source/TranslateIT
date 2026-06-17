# Dev-Rust Gemini 3.5 Realtime Translate Gap Map

## Purpose
Define the specific gap between current TranslateIT realtime translation work and the internal target called Gemini 3.5 realtime translate.

This is a product quality target for realtime translation, not a claim that TranslateIT already matches any external Gemini product.

## Scope correction

The target is not a general multimodal assistant target.

The target is:

- realtime speech translation,
- low latency,
- stable partial transcript,
- stable partial translation,
- natural translated voice output,
- strong ID <-> EN quality,
- local-first desktop runtime where possible.

## Current TranslateIT status

| Layer | Current status | Gap |
| --- | --- | --- |
| UI state | Non-visual realtime status state exists. | Visible UI binding still waits for DesignPreview approval. |
| Tauri command | Realtime status command is wired. | Full runtime translation command quality is not proven. |
| Audio capture | Start/stop route exists. | Streaming partial ASR and interruption behavior are not proven. |
| Translation | Text route and worker route exist. | Benchmark quality and partial streaming translation are missing. |
| TTS | Provider route exists. | Naturalness, latency, and interruption-safe playback are not proven. |
| Validation | Workflow route exists. | Pass evidence and target-PC runtime evidence are missing. |
| Runtime assets | Manifest/checkers exist. | Model/voice assets are not proven on target PC. |

## What is still needed for Gemini 3.5 realtime translate target

### 1. Streaming ASR

- Partial transcript events.
- Stable segment finalization.
- VAD tuning per microphone.
- Noise robustness test set.
- Timestamped transcript segments.

### 2. Streaming translation

- Partial translation output before final ASR segment.
- Final correction after stable transcript.
- ID -> EN and EN -> ID benchmark set.
- Terminology memory.
- Context-aware phrase correction.

### 3. Low-latency voice output

- Fast TTS first-audio latency.
- Interruptible playback.
- Fallback from high-quality voice to fast voice.
- Audio output evidence.

### 4. Realtime quality controls

- Latency p50 and p95 tracking.
- ASR confidence and translation confidence.
- Automatic fallback to Quality mode when realtime confidence is low.
- Visible runtime status.

### 5. Validation evidence

- TypeScript pass.
- Rust pass.
- Worker smoke pass.
- Runtime asset validation pass.
- Target-PC realtime translation evidence.

## Target readiness estimate

| Area | Readiness |
| --- | ---: |
| Realtime translate app integration | 79-83% |
| Runtime model/assets proof | 35-45% |
| Streaming ASR readiness | 30-40% |
| Streaming translation readiness | 25-35% |
| Natural TTS realtime output | 30-40% |
| Validation evidence | 35-45% |
| Gemini 3.5 realtime translate target | 38-48% |

## Next priority

Build toward measurable realtime translate quality:

1. Add latency benchmark recorder.
2. Add ID/EN translation benchmark dataset.
3. Add realtime segment event contract.
4. Add streaming transcript/translation state model.
5. Add TTS first-audio latency evidence.
6. Validate target-PC runtime assets.

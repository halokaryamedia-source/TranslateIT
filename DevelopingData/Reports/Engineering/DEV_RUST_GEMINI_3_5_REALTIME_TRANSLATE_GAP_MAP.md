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

## Current honest score

| Item | Estimate |
| --- | ---: |
| Current TranslateIT Gemini-class readiness | 45/100 |
| Remaining gap | 55/100 |
| Safe post-branch wiring gain, not locally proven yet | +3 to +7 |
| Practical target after local PC validation passes | 52-60/100 |
| Product-class target | 85+/100 |

The current score remains around 45/100 until target-PC evidence proves the runtime actually records audio, transcribes it, translates it, produces voice output, and reports real latency. Recent branch work improves wiring, but wiring alone is not proof of Gemini-class realtime behavior.

## Current TranslateIT status

| Layer | Current status | Gap |
| --- | --- | --- |
| UI state | Realtime status binding and voice-result card route exist. | Needs local proof that state updates correctly during real capture. |
| Tauri command | Realtime status, audio evidence, start/stop capture commands are wired. | Full runtime command quality is not proven on target PC. |
| Audio capture | Start/stop route exists. | Streaming partial ASR and interruption behavior are not proven. |
| Translation | Text route and worker route exist. | Benchmark quality and partial streaming translation are missing. |
| TTS | Provider route exists. | Naturalness, latency, and interruption-safe playback are not proven. |
| Validation | Repo-safe GitHub guard exists. | Local TypeScript/Rust/worker/model/runtime evidence is still required. |
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

- TypeScript pass on developer PC.
- Rust pass on developer PC.
- Worker smoke pass on developer PC.
- Runtime asset validation pass on developer PC.
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
| Gemini-class realtime translate target | 38-48% |

## Remaining work split

| Priority | Work | Expected score gain |
| --- | --- | ---: |
| P1 | Prove local runtime assets and worker execution on target PC | +8 to +12 |
| P1 | Replace batch stop-capture flow with streaming ASR events | +10 to +15 |
| P1 | Add partial translation state and final correction | +8 to +12 |
| P2 | Measure and display p50/p95 latency evidence | +5 to +8 |
| P2 | Improve TTS first-audio latency and interruptible playback | +7 to +10 |
| P2 | Add ID/EN benchmark set and quality regression checks | +7 to +10 |

## Next priority

Build toward measurable realtime translate quality:

1. Run local target-PC evidence only on developer machine.
2. Add realtime segment event contract.
3. Add streaming transcript/translation state model.
4. Add latency benchmark recorder.
5. Add ID/EN translation benchmark dataset.
6. Add TTS first-audio latency evidence.

## Non-negotiable rule

Do not mark the app as Gemini-class ready until target-PC runtime evidence exists. Repo-safe GitHub checks only prove file contracts, not actual realtime translation performance.

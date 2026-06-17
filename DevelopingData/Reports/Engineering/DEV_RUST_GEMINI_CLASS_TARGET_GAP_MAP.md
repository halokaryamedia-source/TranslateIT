# Dev-Rust Gemini-Class Target Gap Map

## Purpose
Define what TranslateIT still needs to approach a Gemini-class realtime assistant target.

This document treats Gemini-class as a quality target, not as a claim that TranslateIT currently matches Gemini.

## Current TranslateIT position

TranslateIT currently has a stronger realtime foundation:

- Rust/Tauri command route exists.
- Realtime status payload route exists.
- Frontend non-visual state route exists.
- Approval-safe visible binding route exists.
- Validation workflow route exists.

However, it is still not Gemini-class because the core runtime, assets, latency evidence, natural speech behavior, and target-PC validation are incomplete.

## Major gaps

| Area | Current status | Required for Gemini-class target |
| --- | --- | --- |
| Native realtime audio | Cascaded ASR -> translation -> TTS route is being wired. | Lower-latency streaming pipeline with fewer blocking stages. |
| Full-duplex conversation | Start/stop capture route exists, but interruption handling is not proven. | User can interrupt speech output and continue naturally. |
| Latency evidence | Latency gate exists, but target-PC samples are not recorded. | Real measured latency budget, p50/p95, and regression history. |
| Translation quality | Command route exists, but quality evaluator and bilingual test set are missing. | Automated ID/EN translation scoring and fallback policy. |
| Noise robustness | Audio pipeline exists, but noisy-room tests are not proven. | Noise/VAD/ASR robustness test set and calibration profiles. |
| Voice naturalness | TTS provider route exists, but expressive voice quality is limited. | Natural voice, speed control, interruption-safe playback, and fallback quality. |
| Context memory | Chat session storage exists, but contextual translation memory is not complete. | Persistent bilingual memory, terminology memory, and session-aware corrections. |
| Multimodal awareness | Text/audio focus only. | Screen/camera/file/context awareness if targeting Gemini Live style. |
| Agentic tooling | Runtime commands exist, but no robust tool planner/evaluator loop. | Tool orchestration, retry policy, confidence, and evidence logging. |
| Safety and privacy | Local-first intent exists. | Explicit offline/online policy, sensitive-data routing, and visible status. |
| Validation evidence | Workflow route exists, but no pass evidence yet. | CI/local pass logs plus target-PC runtime evidence. |

## Target milestones

### Milestone 1: Product-grade realtime translator

- Pass TypeScript validation.
- Pass Rust validation.
- Validate model assets on target PC.
- Record p50/p95 latency samples.
- Prove ID -> EN and EN -> ID flow with audio input and voice output.

### Milestone 2: Natural realtime assistant behavior

- Interruptible playback.
- Streaming partial transcript.
- Streaming partial translation.
- Better VAD calibration.
- Bilingual context memory.
- Translation correction memory.

### Milestone 3: Gemini-class direction

- Multimodal input support.
- Long-context workspace awareness.
- Tool planner with evidence.
- Quality scoring across benchmark sets.
- Natural expressive TTS.
- Full-duplex voice interaction.

## Honest readiness against Gemini-class target

| Area | Readiness |
| --- | ---: |
| Realtime translator foundation | 70-76% |
| Gemini-class voice behavior | 25-35% |
| Multimodal/context assistant behavior | 15-25% |
| Product-grade validation evidence | 35-45% |
| Overall Gemini-class target | 28-38% |

## Next development priority

Focus on measurable runtime quality, not UI polish:

1. Validate app check workflow or local checks.
2. Validate model/runtime assets.
3. Add latency benchmark recorder.
4. Add translation quality benchmark set.
5. Add audio/noise test set.
6. Add interruption-safe playback plan.
7. Add memory/terminology layer.

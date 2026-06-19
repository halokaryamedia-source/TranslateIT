# Noise and Hallucination Filtering Policy

Branch: `Dev-Rust`

## Purpose

TranslateIT must avoid treating speech-to-text output as reliable when the audio signal is weak, noisy, too short, repetitive, or produced by a degraded fallback path.

Filtering must be evidence-based. It must not rely only on a static phrase blocklist.

## Final architecture boundary

- Rust/Tauri owns user-facing readiness and warnings.
- Python helper performs ASR, audio metrics, and provider diagnostics when those features are available.
- Filtering decisions must be returned to Rust/Tauri as evidence, not hidden inside the helper.

## Required evidence fields

Future ASR/helper responses should include these fields when available:

```json
{
  "ok": false,
  "stage": "asr_filter",
  "transcript": "",
  "accepted": false,
  "filter_reason": "low_confidence",
  "confidence": 0.0,
  "speech_probability": 0.0,
  "noise_floor_db": null,
  "rms_db": null,
  "duration_ms": 0,
  "segment_count": 0,
  "repeated_output": false,
  "fallback_active": false,
  "device": "unknown",
  "evidence_path": null
}
```

## Required filter signals

Filtering should consider multiple signals:

1. ASR confidence.
2. Speech probability or VAD score.
3. Segment duration.
4. Audio RMS/peak level.
5. Noise floor or silence ratio.
6. Repeated transcript output.
7. Known fallback mode.
8. Empty or near-empty transcript.
9. Transcript-language mismatch.
10. Consecutive identical outputs from different audio windows.

## Decision states

Allowed filter decisions:

- `accepted`
- `needs_retry`
- `blocked_low_confidence`
- `blocked_noise`
- `blocked_silence`
- `blocked_repetition`
- `blocked_runtime_not_ready`
- `blocked_language_mismatch`

## UI rule

Rust/Tauri should show a user-facing warning when output is filtered.

Examples:

- `Audio was too quiet. Please retry closer to the microphone.`
- `Speech confidence was low. Translation was not sent.`
- `Repeated ASR output detected. Waiting for clearer audio.`
- `Worker is in fallback mode. Result needs review.`

## Evidence rule

Filtered output must be logged with:

- filter decision,
- supporting metrics,
- helper generation token,
- runtime profile,
- source/target language,
- capture timestamp,
- whether fallback/degraded mode was active.

## Not ready claim

This policy does not mean filtering is fully implemented.

Filtering is not runtime-ready until target-PC evidence shows ASR/helper responses contain the required evidence fields and Rust/Tauri surfaces the warning correctly.

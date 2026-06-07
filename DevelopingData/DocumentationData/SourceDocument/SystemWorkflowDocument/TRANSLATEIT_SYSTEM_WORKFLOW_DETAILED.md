# TranslateIT System Workflow Detailed Guide

This document explains how TranslateIT works end to end in the current
Experimental workspace. It focuses on the normal product flow used for manual
QA and real microphone usage.

## 1. What TranslateIT does

TranslateIT is a local microphone translation application. It:

1. Captures live speech from the selected microphone.
2. Validates the audio before sending it to ASR.
3. Runs speech-to-text with the local CUDA ASR stack.
4. Translates the accepted source text with the local translation engine.
5. Shows the result in a transcript card.
6. Optionally speaks the final translated text with local TTS.

The system is designed to keep the UI responsive while preserving quality.
Short utterances should finish quickly. Long utterances should stream in stable
phrase chunks without showing unstable raw partial text.

## 2. Core runtime components

TranslateIT is organized into several main parts:

- `EngineData/LauncherApp/`
  - Main application flow, session handling, state management, UI updates,
    live pipeline orchestration, and logging.
- `EngineData/TranscriptEngine/`
  - Audio validation, segment building, ASR model loading, transcript filtering,
    and segment-level runtime data.
- `EngineData/TranslateEngine/`
  - Local translation engine, translated audio helpers, and optional TTS
    fallback support.
- `UserData/`
  - Runtime logs, cache, session files, and temporary artifacts.
- `DevelopingData/`
  - Tooling, documentation, scripts, diagnostics, and sample data.

The normal launch path should always use the Experimental workspace and must
not depend on V1 or root stable files.

## 3. Normal startup flow

When the user opens TranslateIT and presses Start, the app follows this flow:

1. Reset session state for the new live run.
2. Clear active runtime buffers and old turn state.
3. Reset ASR context and translation context.
4. Activate live-input cache guards so stale sample data cannot leak in.
5. Check CUDA readiness.
6. Confirm the ASR model is loaded and ready on CUDA float16.
7. Confirm the translation model is loaded.
8. Initialize TTS only if it is needed by the current settings.
9. Open the selected microphone stream.
10. Wait for real callback frames from the audio device.
11. Show Ready to Listen only after the stream is actually live.

If any readiness step fails, the app should show a clear setup or input error
instead of pretending that capture is active.

## 4. Live microphone capture flow

Once listening starts, the microphone stream becomes the primary source of
truth. The app should treat microphone callback frames as the only live input.

Capture responsibilities:

- Read frames from the selected microphone.
- Keep the capture loop non-blocking.
- Convert audio to the expected format for the downstream pipeline.
- Track frame timing and buffer growth.
- Detect silence, clipped speech, or low-energy audio.
- Reject invalid frames before they reach ASR.

Important safety rules:

- Live microphone mode must not reuse sample WAV input.
- Live microphone mode must not reuse replay simulation data.
- Live microphone mode must not reuse stale cached audio.
- Live microphone mode must reset previous context before the new session.

## 5. Audio validation before ASR

Raw microphone audio is not sent directly into ASR without checks.
The system validates:

- Signal energy
- Peak level
- Silence ratio
- Speech-to-noise ratio
- Duration
- Minimum voiced frame coverage
- Duplicate audio range protection

If the audio looks like silence, noise, or a weak fragment, the segment should
be rejected early rather than accepted as transcript. This is important because
many false hallucinations happen when the input is too weak or too short.

The validation layer is also responsible for preventing stale or cached audio
from being mistaken for new microphone input.

## 6. ASR flow

Accepted audio is passed to the local ASR model:

- Model: Faster-Whisper Large V3 Turbo
- Device: CUDA
- Compute type: float16
- Language: Indonesian
- Task: transcribe

The ASR output should represent the actual speech that was captured, not a
prompt or old context.

For normal live use:

- The ASR model should remain loaded.
- The model should not be downgraded silently.
- CPU fallback should only happen if the user explicitly enables CPU Degraded
  Mode.
- Previous transcript context should not poison the next live session.

## 7. Transcript quality filtering

After ASR returns text, the transcript passes through a quality filter.

The quality filter protects the UI from:

- Hallucinated outro-like phrases
- Low-confidence fragments
- Silence-based false positives
- Generic phrases that do not match the input audio

If the result is suspicious, the segment is rejected and should not appear as an
accepted transcript.

The system can flag likely hallucinations such as:

- "Terima kasih telah menonton"
- "selamat menikmati"
- "jangan lupa subscribe"

The guard must not rely only on blacklists. It should also inspect:

- RMS
- Peak
- Speech duration
- Voiced ratio
- Silence ratio
- no_speech_prob if available
- avg_logprob if available
- compression_ratio if available

## 8. Translation flow

Accepted source text is translated with the local translation engine.

Translation rules:

- Preserve meaning first.
- Keep context from the current turn.
- Avoid per-word translation.
- Avoid duplicated phrases.
- Avoid using old-session context.

For short utterances, translation should appear quickly after the final
accepted text is ready.

For long utterances, the app should translate stable phrase chunks while the
user is still speaking, then correct or merge the output at the final endpoint.

## 9. Stable Streaming Turn behavior

Stable Streaming Turn is the mechanism that makes long speech feel like a live
meeting translator instead of a batch tool.

The idea is:

- Keep one active speaking turn.
- Accumulate the full turn audio in memory.
- Detect stable phrase boundaries inside the turn.
- Process stable chunks before the user finishes speaking.
- Append chunk results to the same card.
- Run final correction only after the turn ends.

Important distinction:

- Stable chunk audio is intermediate.
- Full turn audio is final.

Stable chunk processing must never delete the full-turn buffer needed for final
correction.

## 10. Short utterance path

Short speech should remain fast.

Behavior for short utterances:

- Do not wait for long-turn timers.
- Do not force chunk streaming logic.
- Finalize as soon as the endpoint is confidently detected.
- Keep the response latency low.

This path is important for simple phrases such as:

- "Halo, coba bicara."
- "Halo coba lagi."
- "Coba bicara."

Short speech should not be slowed down by long-speech machinery.

## 11. Long utterance path

Long speech must preserve the beginning, middle, and end of the sentence.

Behavior for long utterances:

- Keep the complete turn buffer.
- Emit stable phrase chunks when a safe boundary is found.
- Translate each stable chunk with short context.
- Append the result to the same card.
- Keep listening for the rest of the turn.
- At the final endpoint, run final correction using the whole turn audio.

The final transcript should still be coherent even if the stable chunks were
emitted in pieces.

## 12. Transcript card behavior

The UI should generally use one card per speaking turn.

Card rules:

- One active turn creates one active card.
- Stable chunks append into the same card.
- Final correction updates the same card.
- New card creation should not happen for every phrase if the speech belongs to
  the same turn.

The card stores:

- Source chunks
- Target chunks
- Display source text
- Display target text
- Final source text
- Final target text
- Turn ID
- Latency information

## 13. Final correction

Final correction is the last pass after the user stops speaking.

Its job:

- Re-run or finalize the full-turn source text if needed.
- Compare the stable accumulated text with the final full-turn result.
- Merge the best version into the same card.
- Remove duplicates.
- Keep the output clean.

Final correction should not replace the whole card with only the last chunk.
It should improve the full turn.

## 14. TTS policy

The default TTS policy is conservative:

- Stable chunk TTS: OFF by default
- Final TTS: allowed after final correction if enabled

Why:

- Stable chunks may still be corrected.
- Speaking unstable text out loud would be confusing.
- Final-only TTS keeps the experience clean and trustworthy.

## 15. Cache handling

TranslateIT uses cache carefully:

- Temporary audio may be cached for replay or diagnostics.
- Live microphone sessions must not inherit old sample WAV data.
- Context, segment buffers, and turn state must be reset for new sessions.

Cache is for support and diagnostics, not for silently replacing current live
microphone input.

## 16. Logging and diagnostics

TranslateIT keeps several runtime logs under `UserData/LogData`.

Useful logs include:

- Launcher events
- Engine readiness
- Live input proof
- Latency debug
- Stable streaming diagnostics
- Long speech regression logs
- Rejection and hallucination reports

The logs are important because they prove:

- Which input source was used
- Whether stale cache was bypassed
- Whether the mic stream was actually receiving frames
- Whether the output came from a real accepted segment

## 17. Error handling

The app should fail loudly and clearly when something is wrong:

- Missing microphone
- Invalid input device
- CUDA failure
- Missing ASR or translation model
- Silence-only or low-energy audio
- Suspected hallucination
- Queue saturation or worker blockage

The UI should not freeze or silently accept bad output.

## 18. What manual QA should check

When testing the normal live app, verify:

1. Start resets the session cleanly.
2. Ready to Listen appears only after mic frames are confirmed.
3. Short phrases stay fast.
4. Long phrases begin translating before the sentence fully ends.
5. One turn usually stays in one card.
6. The beginning of long speech is not lost.
7. The output is not duplicated.
8. Hallucinated outro phrases are rejected.
9. Final correction still runs.
10. TTS stays final-only by default.

## 19. Summary

The core design of TranslateIT is:

- Clean live microphone capture
- Safe audio validation
- CUDA ASR
- Context-aware translation
- Stable streaming for long turns
- Fast finalization for short turns
- Final correction for quality
- Conservative TTS
- Strong logging and diagnostics

If any part of that chain breaks, the user will feel lag, confusion, or false
transcripts. The system should therefore always prefer honesty, stability, and
clean turn handling over flashy but unreliable behavior.

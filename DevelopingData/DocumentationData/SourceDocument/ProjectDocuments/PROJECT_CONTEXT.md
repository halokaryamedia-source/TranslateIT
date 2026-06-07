# Project Context

## Why TranslateIT exists

TranslateIT exists to help a user speak Indonesian into a microphone and receive an English text translation without losing the original Indonesian transcript.

## What problem the app solves

- It preserves the source transcript for debugging and review.
- It separates speech recognition from translation so both layers stay inspectable.
- It keeps replay, latency, and quality information attached to each accepted speech segment.
- It stays local-first so microphone content is not pushed to the cloud by default.

## Target user workflow

1. Open the app.
2. Select a microphone.
3. Run a quick calibration pass.
4. Speak Indonesian naturally.
5. Review the original transcript and the English translation.
6. Replay the original audio if needed.
7. Save the session only if the user wants a permanent record.

## Project scope

- In scope: microphone input, calibration, VAD, ASR, translation, transcript display, replay, cache, and save flow.
- In scope: local-first behavior and simple developer diagnostics.
- Out of scope for the first stable implementation: cloud upload, direct speech-to-English-only mode, aggressive noise processing, and always-on TTS.

## Development direction

- Build a balanced local-first prototype.
- Keep the engine stack split across capture, transcription, translation, and UI layers.
- Keep the first working path simple enough to benchmark and debug.

## Important context Codex must remember

- Preserve both the Indonesian transcript and the English translation.
- Only translate finalized accepted speech segments by default.
- Keep TTS disabled until the core text flow is stable.
- Keep the root folder structure unchanged.
- Read the master documentation before making project edits.
- Keep transcript session persistence explicit so save and cache behavior stay easy to audit.
- Keep live capture in a background worker so the UI stays responsive.
- Keep replay protected from active microphone capture.

## Things that must not be changed without approval

- The approved root folder layout.
- The local-first default.
- The cascaded ASR then translation pipeline.
- The default ASR model choice.
- The cache versus saved-data separation.
- The requirement to keep documentation in English.

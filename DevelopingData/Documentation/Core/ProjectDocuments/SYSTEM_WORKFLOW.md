# System Workflow

## 1. Application launch flow

1. Start the desktop launcher.
   - First-run users should double-click `TranslateIT.bat`, then choose setup, CUDA validation, runtime validation, and app launch from the menu.
2. Load `EngineData/LauncherApp/app_config.py`.
3. Resolve cache and saved-data paths.
4. Resolve runtime ASR model paths from `EngineData/TranscriptEngine/ModelData`.
5. Resolve runtime translation model paths from `EngineData/TranslateEngine/ModelData`.
6. Create the background live pipeline worker, but do not start capture yet.
7. Read available microphones.
8. Show the ready state.
9. Wait for the user to select a device or start calibration.
10. Write launcher events to `UserData/LogData/launcher_latest.log`.
11. Block real ASR modes unless CUDA Core validation passes or the user explicitly enables CPU Degraded Mode.

## 2. Microphone input flow

1. Capture the selected input device.
2. Monitor the input level meter.
3. Warn if the device looks wrong, clipped, silent, virtual, stereo-mix-like, webcam-like, or disconnected.
4. Resample to 16 kHz mono when needed.
5. Convert to mono, apply soft normalization, and pass through the noise gate.
6. Feed the validated stream into the rolling buffer.
7. Run capture, calibration, and segment assembly in the background worker so the UI never blocks.
8. When `sounddevice` is missing, report the dependency issue clearly instead of pretending capture is active.

## 3. Audio calibration flow

1. User selects a microphone.
2. App records about 3 seconds of silence.
3. App estimates the noise floor.
4. App asks the user to speak one normal Indonesian sentence.
5. App measures RMS, peak, clipping risk, and speech-to-noise gap.
6. App uses the shared headset-oriented noise configuration during capture and quality checks.
7. Save only the non-sensitive calibration values.
8. Write the latest diagnostic report to `UserData/LogData/microphone_diagnostic_latest.json`.

## 4. Translation workflow

1. Audio frames enter the noise gate and VAD layer.
2. A segment is built only after speech is confirmed and enough silence closes the segment.
3. Faster-Whisper Large V3 Turbo transcribes the accepted segment.
4. The transcript quality filter rejects weak or hallucinated output.
5. The translation engine converts the finalized Indonesian transcript into English.
6. The translation engine first tries the primary local model and falls back to the backup local model when required.
7. The UI receives the completed segment and displays the result from the worker thread.
8. When the ASR or translation dependencies are missing, the engine returns explicit missing-dependency or pending-local-model results.
9. Runtime model files must come from `EngineData`, not `DevelopingData`.
10. Capture mode controls decide whether ASR and translation are diagnostic, mock, mixed, or fully real.

## 5. Transcript workflow

1. Create a segment record.
2. Store the original Indonesian text.
3. Store the English translation.
4. Add timestamps, latency, confidence, and quality status.
5. Attach replay paths if the audio exists in cache.
6. Show the accepted transcript card in the UI.
7. Keep the session JSON ready for save or export when the user approves it.
8. Write benchmark summaries to `UserData/LogData` after accepted segment updates.

## 6. Input handling

- Use small frames for responsive monitoring.
- Keep microphone capture running while inference happens elsewhere.
- Never run ASR on raw unvalidated audio chunks.
- Reject silence, clipping, or strong stationary noise before ASR.

## 7. Output handling

- Show text before any optional TTS playback.
- Keep original and translated output separate.
- Keep replay actions from feeding back into capture.
- Treat translated audio as optional and future-only for the first stable text release.
- Replay original WAV audio through the launcher replay controller only after live capture is paused or protected.
- Block replay while the microphone worker is active so source audio cannot re-enter the live path.

## 8. Cache handling

- Cache temporary audio segments.
- Cache temporary translated audio only if TTS ever becomes active.
- Cache current session material needed for replay or diagnostics.
- Allow cache clearing without affecting saved sessions.

## 9. Saved data handling

- Save only user-approved sessions.
- Preserve exported files and saved replay audio only when the user chooses to save them.
- Never delete saved data automatically.
- Keep saved data separate from temporary cache material.
- Copy existing replay WAV files from cache into `SavedData/SavedTranscript` only during an approved save action.

## 9.1 Runtime log handling

- Keep runtime logs under `UserData/LogData`.
- Write validation, launcher, microphone diagnostic, benchmark, and recoverable error reports.
- Show user-facing failures in the launcher and keep technical details in log files.

## 10. Error handling flow

1. Detect missing microphone or invalid device selection.
2. Detect silence, clipping, or low-confidence speech.
3. Reject unusable segments instead of showing junk transcript output.
4. Fall back from Large V3 Turbo to Medium only when the documented fallback conditions are met.
5. Fall back from the primary local translation model to the backup local translation model when needed.
6. Surface configuration or dependency issues without freezing the UI.
7. Treat CUDA Core failure as a real ASR blocker, not a minor warning.
8. Label CPU fallback as CPU Degraded Mode when explicitly enabled.

## 11. Future workflow expansion notes

- Add manual speak mode later if TTS becomes available.
- Add auto speak mode later only if echo protection is reliable.
- Add developer-only raw audio debug mode later.
- Add optional cloud mode only after explicit approval.

## 12. Detailed live workflow notes

The following notes absorb the former detailed workflow document so the project keeps one workflow source of truth.

### 12.1 Normal startup

1. Reset session state for the new live run.
2. Clear active runtime buffers and old turn state.
3. Reset ASR context and translation context.
4. Activate live-input cache guards so stale sample data cannot leak in.
5. Check CUDA readiness.
6. Confirm the ASR model is loaded and ready on CUDA `float16`.
7. Confirm the translation model is loaded.
8. Initialize TTS only if it is needed by the current settings.
9. Open the selected microphone stream.
10. Wait for real callback frames from the audio device.
11. Show `Ready to Listen` only after the stream is actually live.

### 12.2 Live capture and validation

- Read frames from the selected microphone.
- Keep the capture loop non-blocking.
- Convert audio to the expected format for the downstream pipeline.
- Track frame timing and buffer growth.
- Detect silence, clipped speech, or low-energy audio.
- Reject invalid frames before they reach ASR.
- Never reuse sample WAV input, replay simulation data, or stale cached audio as live microphone input.

### 12.3 Audio validation before ASR

- Validate signal energy, peak level, silence ratio, speech-to-noise ratio, duration, minimum voiced-frame coverage, and duplicate-audio protection.
- Reject weak, silent, or noisy audio early rather than allowing it to become transcript text.
- Keep the validation layer responsible for preventing cached audio from being mistaken for live input.

### 12.4 ASR flow

- Accepted audio is passed to Faster-Whisper Large V3 Turbo on CUDA with `float16`.
- The ASR output should represent the actual captured speech, not a prompt or old context.
- CPU fallback is only for explicit CPU Degraded Mode.
- Previous transcript context should not poison the next live session.

### 12.5 Transcript quality filtering

- Reject hallucinated outro-like phrases, low-confidence fragments, silence-based false positives, and generic phrases that do not match the audio.
- Use both audio evidence and text evidence.
- Do not rely only on a phrase blacklist.
- Keep names and real short phrases valid unless they clearly look like noise.

### 12.6 Stable streaming turn behavior

- Keep one active speaking turn.
- Accumulate the full turn audio in memory.
- Detect stable phrase boundaries inside the turn.
- Process stable chunks before the user finishes speaking.
- Append chunk results to the same card.
- Run final correction only after the turn ends.
- Keep stable chunk audio intermediate and full-turn audio final.

### 12.7 Short and long utterances

- Short speech should finalize as soon as the endpoint is confidently detected.
- Long speech should preserve the beginning, middle, and end of the sentence.
- For long speech, emit stable phrase chunks when safe, then run final correction on the complete turn.

### 12.8 TTS policy

- Stable chunk TTS is off by default.
- Final TTS is allowed after final correction if enabled.
- Speaking unstable text out loud should be avoided.

### 12.9 Manual QA focus

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

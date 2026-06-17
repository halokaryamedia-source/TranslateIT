# TranslateIT Testing Ready Notes

Status for the next manual testing round.

## Ready For Manual Testing

- Desktop launcher UI flow.
- Warmup to main app transition.
- Chat text input guard and duplicate-submit guard.
- 2,000 character manual input limit.
- Local text attachment ingestion for .txt, .md, .json, and .csv.
- Drag and drop text attachment flow in the composer.
- Local chat session creation and chat list rendering.
- Settings navigation: General, Audio, Translate, Developer.
- Save Settings and Save Default UI flow.
- Audio microphone status check guard.
- Voice start/stop feedback guard.
- Stop Capture prepares the latest target voice segment before the rolling buffer is cleared.
- Translate language source/target dropdown controls.
- Translate language swap control.
- Manual text translation now attempts the project-local realtime worker bridge first.
- Worker smoke evidence is now included in readiness summary logic.
- Runtime evidence flow is documented in `RUNTIME_EVIDENCE_FLOW.md`.
- Developer diagnostic button guard.
- Developer diagnostic log display and local-path redaction.

## Still Not Claimed Ready

- Build/test validation has not been run.
- Full real translation model inference still needs end-to-end validation on the target PC.
- Voice pipeline still needs worker execution validation with real captured audio.
- File attachment supports text ingestion only; PDF/DOCX/binary parsing is not connected yet.
- Full installer/package release validation has not been run.

## Remaining Gap Estimate

- Language picker: 0% remaining.
- Text attachment ingest and drag-drop: about 15% remaining.
- Real translation model validation: about 25-30% remaining.
- Voice ASR > Translate > TTS validation: about 30-35% remaining.
- Build/test/package validation: not run yet.

## Manual Testing Rule

If a backend feature is not connected, the app must show an honest limitation message instead of showing a fake success state.

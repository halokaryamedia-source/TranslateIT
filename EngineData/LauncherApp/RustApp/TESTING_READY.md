# TranslateIT Testing Ready Notes

Status for the next manual testing round.

## Ready For Manual Testing

- Desktop launcher UI flow.
- Warmup to main app transition.
- Chat text input guard and duplicate-submit guard.
- 2,000 character manual input limit.
- Local text attachment ingestion for .txt, .md, .json, and .csv.
- Local chat session creation and chat list rendering.
- Settings navigation: General, Audio, Translate, Developer.
- Save Settings and Save Default UI flow.
- Audio microphone status check guard.
- Voice start/stop feedback guard.
- Translate language source/target dropdown controls.
- Translate language swap control.
- Manual text translation now attempts the project-local realtime worker bridge first.
- Developer diagnostic button guard.
- Developer diagnostic log display and local-path redaction.

## Still Not Claimed Ready

- Build/test validation has not been run.
- Full real translation model inference still needs end-to-end validation on the target PC.
- Voice ASR > Translate > TTS pipeline still needs end-to-end validation.
- File attachment supports text ingestion only; PDF/DOCX/binary parsing is not connected yet.
- Full installer/package release validation has not been run.

## Manual Testing Rule

If a backend feature is not connected, the app must show an honest limitation message instead of showing a fake success state.

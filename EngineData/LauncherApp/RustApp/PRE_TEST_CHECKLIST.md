# TranslateIT Pre-Test Checklist

Use this checklist before manual testing the desktop launcher.

## Quick Test Order

1. Launch desktop app.
2. Wait for warmup to finish.
3. Test chat text input.
4. Test Settings > General.
5. Test Settings > Audio.
6. Test Settings > Translate.
7. Test Settings > Developer.
8. Reopen app once to confirm settings and local chat state are still stable.

## Must Check First

- Open the desktop app from the Tauri launcher, not from a browser.
- Confirm the warmup screen finishes and enters the main chat UI.
- Confirm Enter sends text once only.
- Confirm the send button and composer are disabled while text translation is processing.
- Confirm long text above 2,000 characters is blocked in the UI.
- Confirm New Chat creates a local unsaved session.
- Confirm Recent, Unsaved, Saved, and Local Data navigation opens without layout breakage.
- Confirm Settings opens on General and Back returns to chat.
- Confirm Save Settings and Save Default do not expose local paths.
- Confirm Audio > Microphone check disables while running and updates only the microphone label.
- Confirm Audio > Mic Test start/stop feedback remains visible.
- Confirm Translate > Source/Target buttons cycle the language pair without duplicating source and target.
- Confirm Translate > Swap reverses ID > EN and EN > ID correctly.
- Confirm Developer > Run Checking disables the button while running and then restores it.
- Confirm Developer logs do not expose local paths.

## Known Gaps Before Full Production

- Real translation worker/model execution still needs end-to-end validation.
- Voice pipeline needs ASR > translation > TTS validation.
- File attachment backend is not connected yet.
- Source/target language controls are cycle buttons for now, not a full dropdown list.
- Build/package validation has not been run from this checklist.

## Remaining Before Manual Testing

- UI checklist prep: 1% remaining.
- Manual testing readiness: 2% remaining.
- Build/test validation: not run yet.
- Production readiness: still depends on real worker, voice pipeline, and package validation.

## Pass Criteria For This Testing Round

- UI opens cleanly.
- Chat input is stable.
- Settings pages render without broken layout.
- Runtime status and diagnostic panels do not show unsafe or stale-looking data.
- Any backend limitation is shown honestly as not connected, not as a fake success.

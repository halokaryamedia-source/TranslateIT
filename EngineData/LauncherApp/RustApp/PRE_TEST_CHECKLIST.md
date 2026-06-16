# TranslateIT Pre-Test Checklist

Use this checklist before manual testing the desktop launcher.

## Quick Test Order

1. Launch desktop app.
2. Wait for warmup to finish.
3. Test chat text input.
4. Test local text attachment with .txt, .md, .json, or .csv.
5. Test drag and drop text attachment into the composer.
6. Test Settings > General.
7. Test Settings > Audio.
8. Test Settings > Translate.
9. Test Settings > Developer.
10. Review `RUNTIME_EVIDENCE_FLOW.md` before collecting runtime evidence.
11. Run worker smoke evidence command on the target PC.
12. Reopen app once to confirm settings and local chat state are still stable.

## Must Check First

- Open the desktop app from the Tauri launcher, not from a browser.
- Confirm the warmup screen finishes and enters the main chat UI.
- Confirm Enter sends text once only.
- Confirm the send button and composer are disabled while text translation is processing.
- Confirm long text above 2,000 characters is blocked in the UI.
- Confirm local text attachment opens from the plus button and fills the composer.
- Confirm drag and drop attachment highlights the composer and fills the input safely.
- Confirm unsupported or oversized attachments show a clear limitation message.
- Confirm New Chat creates a local unsaved session.
- Confirm Recent, Unsaved, Saved, and Local Data navigation opens without layout breakage.
- Confirm Settings opens on General and Back returns to chat.
- Confirm Save Settings and Save Default do not expose local paths.
- Confirm Audio > Microphone check disables while running and updates only the microphone label.
- Confirm Audio > Mic Test start/stop feedback remains visible.
- Confirm Stop Capture prepares the latest target voice segment when enough speech exists.
- Confirm Translate > Source/Target opens a language dropdown and selection does not duplicate source and target.
- Confirm Translate > Swap reverses ID > EN and EN > ID correctly.
- Confirm Developer > Run Checking disables the button while running and then restores it.
- Confirm Developer logs do not expose local paths.
- Confirm worker smoke evidence is created before marking runtime ready.

## Worker Smoke Evidence Commands

Run these only on the target PC after worker setup is complete:

```powershell
npm run smoke:worker
npm run smoke:worker:quality
npm run status:readiness
```

Optional audio path test after a real capture created `UserData/CacheData/audio_segments/latest_live_target_segment.wav`:

```powershell
npm run smoke:worker:audio
```

## Known Gaps Before Full Production

- Real translation worker/model execution still needs end-to-end validation: about 25-30% remaining.
- Voice pipeline needs ASR > translation > TTS validation with real captured audio: about 30-35% remaining.
- File attachment supports local text-file ingestion, but binary/PDF/DOCX parsing is not connected yet: about 15% remaining.
- Source/target language dropdown is connected for supported local language pair options: 0% remaining.
- Build/package validation has not been run from this checklist.

## Remaining Before Manual Testing

- UI checklist prep: 0% remaining.
- Manual testing readiness: 0% remaining for checklist flow.
- Build/test validation: not run yet.
- Production readiness: still depends on real worker, voice pipeline, and package validation.

## Pass Criteria For This Testing Round

- UI opens cleanly.
- Chat input is stable.
- Local text attachment ingestion works safely.
- Drag and drop text attachment behaves safely.
- Translate language dropdown works without duplicate source/target states.
- Settings pages render without broken layout.
- Runtime status and diagnostic panels do not show unsafe or stale-looking data.
- Worker smoke evidence is present before readiness is marked complete.
- Any backend limitation is shown honestly as not connected, not as a fake success.

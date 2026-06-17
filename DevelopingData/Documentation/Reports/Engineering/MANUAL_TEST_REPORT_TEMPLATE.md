# TranslateIT Manual Test Report Template

Use this after opening the desktop app for manual testing.

## Test Session

- Tester:
- Date:
- Branch: Dev-Rust
- App path: EngineData/LauncherApp/RustApp
- Build/Test command used:
- Result: Pass / Partial / Fail

## Smoke Test Results

| Area | Expected Result | Status | Notes |
| --- | --- | --- | --- |
| Launch | App opens as desktop app, not browser | Not tested |  |
| Warmup | Warmup finishes and main UI appears | Not tested |  |
| Chat input | Enter sends once, duplicate send is blocked | Not tested |  |
| Long input | Text above 2,000 characters is blocked | Not tested |  |
| New chat | Unsaved local session is created | Not tested |  |
| Sidebar | Recent, Unsaved, Saved, Local Data open cleanly | Not tested |  |
| General settings | Save Settings and Save Default show safe messages | Not tested |  |
| Audio settings | Microphone check disables while running | Not tested |  |
| Mic test | Start/stop feedback remains visible | Not tested |  |
| Translate settings | Source/Target cycle and Swap work | Not tested |  |
| Developer settings | Run Checking disables while running | Not tested |  |
| Logs | No local paths are exposed in visible logs | Not tested |  |

## Known Backend Limitations To Confirm

- Real model translation may still report worker not connected.
- Voice ASR > Translate > TTS may still need backend validation.
- File attachment should report not connected, not fake success.

## Final Notes

- Blocking issue:
- Visual issue:
- Runtime issue:
- Ready for next step: Yes / No

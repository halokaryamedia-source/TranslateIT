# TranslateIT Cleanup Progress Report

Date: 2026-06-14
Branch: `ChatGPT-ConvertEngine`
Owner validation position: owner will not run manual testing/validation until the application is internally ready.

## Cleanup completed in this pass

### 1. User-facing frontend simplified

The main TranslateIT frontend was cleaned up from a developer-heavy diagnostic console into a simpler user-facing shell.

Normal user path now focuses on:

- TranslateIT brand and workspace navigation.
- ID -> EN direction display.
- Input text field.
- Microphone/start button.
- Send/translate button.
- Stop button.
- Refresh button.
- Original and Translation output cards.
- Compact runtime status card.

Developer diagnostics are no longer displayed as primary buttons. They are moved into a collapsed `Developer diagnostics` details panel.

### 2. Start flow cleaned

The Start button now calls `start_capture` directly instead of being blocked first by the capture-loop diagnostic contract.

Reason: the previous frontend flow checked `analyze_capture_loop_contract` first, but the planned buffer status starts empty by design. That could prevent testers/developers from reaching the backend lifecycle gate even when `start_capture` is the correct source of truth for lifecycle readiness.

### 3. Safe Tauri invoke wrapper added

A frontend `safeInvoke` wrapper was added for Tauri command calls.

This wrapper:

- Sets a busy state while commands run.
- Catches runtime command errors.
- Shows user-readable failure messages.
- Avoids uncaught frontend command failures.

### 4. Runtime status made easier to read

The main UI now renders:

- Lifecycle pill.
- Capture readiness pill.
- Runtime readiness pill.
- Next action.
- ASR / Translation / TTS runtime labels.
- Limited blocker list so the UI does not overwhelm the user.

### 5. CSS cleaned for a ChatGPT-like simple shell

The UI stylesheet was rebuilt around:

- Clean sidebar.
- Rounded cards.
- Compact status pills.
- Primary mic/send controls.
- Hidden developer diagnostics.
- Responsive single-column fallback for smaller widths.

### 6. Launcher improved

The root `TranslateIT.vbs` launcher now attempts to launch the release executable first. If no release executable exists yet, it logs a warning and falls back to `npm.cmd run dev`.

This is safer than always running dev mode, but final packaging still needs a proper release artifact and installer path.

### 7. Tauri CSP hardened

The Tauri security config no longer uses `csp: null`. It now defines an explicit CSP for self-hosted frontend scripts/styles/assets and Tauri IPC.

### 8. TypeScript target aligned

The frontend TypeScript target was moved to ES2021 so the frontend source and configured runtime APIs remain aligned.

## Current status after cleanup

The branch is cleaner and more professional visually, but it is still not ready for owner validation or production.

No owner testing is required yet.

## Remaining blockers

### Critical runtime blockers

- Real CPAL microphone stream open/close is still not implemented end-to-end.
- ASR execution is still not connected end-to-end.
- Translation execution is still not connected end-to-end.
- TTS/playback execution is still not connected end-to-end.
- Build/typecheck/Rust check results are not recorded yet.
- Packaging validation is not complete.

### Next internal development targets

1. Add a real CPAL stream owner/runtime module.
2. Connect real ASR stage.
3. Connect real translation stage.
4. Connect real TTS/playback stage.
5. Run internal build/typecheck checks only after the code path is internally ready.
6. Keep the PR draft until internal readiness gates pass.

## Conclusion

This cleanup pass improves presentation, flow safety, and frontend professionalism. It does not claim runtime completion. The project remains in internal cleanup/development state and should not be handed to the owner for testing yet.

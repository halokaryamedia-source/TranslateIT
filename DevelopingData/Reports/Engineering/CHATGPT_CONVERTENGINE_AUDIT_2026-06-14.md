# ChatGPT-ConvertEngine Audit Report

Date: 2026-06-14
Branch: `ChatGPT-ConvertEngine`
Application scope: TranslateIT speech-to-speech migration from Python runtime to Rust backend with Tauri frontend.

## Executive Assessment

Overall readiness score: **38 / 100**
Professional readiness: **Draft / pre-testing only**
Production readiness: **Not ready**

The branch is a useful Rust/Tauri migration foundation, but it is not yet a professional release candidate. It currently behaves more like a runtime contract shell and diagnostic harness than a finished speech-to-speech desktop application.

## Evidence-Based Findings

### 1. Validation status is still pending

The branch documentation explicitly states that no build, tests, CI, packaging validation, real microphone capture, ASR, translation, or TTS/playback execution was run during the optimization pass. The manual validation checklist also keeps build, startup, command registration, runtime, UI, smoke test, packaging, and approval status as `PENDING`.

Risk: high. A branch that has not passed build/typecheck/runtime validation cannot be considered stable or professional.

Required next action:

- Run `npm install` from `EngineData/LauncherApp/RustApp`.
- Run `npm run typecheck`.
- Run `npm run check:rust`.
- Run `npm run build:frontend`.
- Run `npm run build`.
- Record PASS/FAIL results in `MANUAL_VALIDATION_CHECKLIST.md`.

### 2. Runtime is not yet real speech-to-speech

`start_capture()` records a runtime session and returns a message that real microphone stream creation is still deferred. `translate_text()` blocks with `TranslationAdapterPending`. The capture gate and stream build modules explicitly state that they do not open a microphone stream.

Risk: critical. The app cannot yet be marketed as a working speech-to-speech translator.

Required next action:

- Implement real CPAL stream ownership and lifecycle.
- Implement ASR execution path.
- Implement translation execution path.
- Implement TTS/playback execution path.
- Keep truthful readiness reporting until each stage works end-to-end.

### 3. Frontend is debug-heavy and not final-user ready

The current frontend includes many engineering/debug buttons in the primary action row, including Capture Check, Stream Owner, Frame Pipeline, Session Check, Save Plan, Realtime Handoff, Segment Flow, Execution Bridge, Diagnostics, and Save Settings.

Risk: medium-high. This is useful for engineering, but confusing for a user-facing app. The UI does not yet match a polished ChatGPT-like simple translation shell.

Required next action:

- Keep only Start, Stop, language selection, microphone status, output, and a compact diagnostics status in the normal user path.
- Move engineering diagnostics into a hidden developer panel.
- Add user-friendly state messages for blocked runtime stages.

### 4. Frontend Start flow has a likely blocking bug

The Start button checks `analyze_capture_loop_contract()` before calling `start_capture()`. However, `planned_buffer_status()` creates a new empty buffer, so `ready_for_vad` and `ready_for_calibration` are false by default. This can prevent the Start button from reaching the backend lifecycle gate even though `start_capture()` already has a proper start gate.

Risk: high for manual testing. Testers may be unable to test the intended Start lifecycle.

Required next action:

- Change the Start button to call `start_capture()` directly.
- Show capture-loop readiness as diagnostic information, not as a hard precondition for the Start gate.
- Add a frontend error wrapper around every Tauri invoke call.

### 5. Launcher path was not production-grade

The previous root launcher always ran `npm.cmd run dev`. That requires Node/Rust/Tauri dev environment on the target PC and is not professional for normal users.

Fix applied in this audit:

- `TranslateIT.vbs` now attempts to launch the Tauri release executable first: `EngineData\LauncherApp\RustApp\src-tauri\target\release\translateit_rustapp.exe`.
- If the release executable is missing, it logs a warning and falls back to `npm.cmd run dev`.

Remaining risk: medium. The proper final deliverable should use a packaged NSIS installer or a known release binary path, not source-tree dev execution.

### 6. Tauri security configuration was too permissive

The previous `tauri.conf.json` used `"csp": null`, which disables frontend Content Security Policy. That is not acceptable for a professional desktop app unless there is a very specific temporary debugging reason.

Fix applied in this audit:

- `tauri.conf.json` now uses an explicit CSP for self-hosted scripts/styles/assets and Tauri IPC.

Remaining risk: low-medium. The CSP must still be validated during `tauri dev` and `tauri build` because real asset/IPC behavior may require small adjustments.

### 7. Architecture is over-contracted and under-integrated

The branch has many useful readiness contracts, gates, diagnostics, and state reports. That is positive for minimizing false claims and runtime ambiguity. However, most core functions are still planners, dry runs, or blockers rather than real runtime execution.

Risk: medium-high. A codebase with many contracts but no verified end-to-end path can appear complete while the real product path remains missing.

Required next action:

- Reduce public frontend controls.
- Keep contracts internally.
- Build one verified vertical slice: microphone input -> ASR transcript -> translation text -> TTS/playback -> saved session.

## Professional Readiness Scorecard

| Area | Score | Status |
|---|---:|---|
| Rust/Tauri scaffold | 70/100 | Present and structurally useful |
| Runtime truthfulness | 80/100 | Good blocker reporting, avoids false production claims |
| Real speech-to-speech capability | 10/100 | Not implemented end-to-end |
| UI professionalism | 35/100 | Clean styling base, but too many debug controls |
| Launcher/packaging | 45/100 | Improved, but still not final packaged flow |
| Security posture | 55/100 | CSP improved, still needs validation |
| Error handling | 35/100 | Refresh has catch; most click handlers need safe error handling |
| Test/build evidence | 10/100 | Checklist exists, but validation is pending |
| Maintainability | 45/100 | Typed contracts are good; monolithic frontend is poor |

## Priority Fix Queue

### P0 — Required before calling it stable

1. Run and record build validation.
2. Fix frontend Start flow so it reaches `start_capture()` lifecycle gate.
3. Add safe error handling for all Tauri invoke calls.
4. Implement or explicitly hide all incomplete speech-to-speech controls.
5. Add real microphone stream open/close ownership.

### P1 — Required before professional user testing

1. Create final clean UI mode separate from developer diagnostics.
2. Add persistent runtime status banner.
3. Add microphone permission/device failure messages.
4. Add one-click packaged launch path.
5. Add manual smoke-test result document.

### P2 — Required before release candidate

1. ASR execution integrated and verified.
2. Translation execution integrated and verified.
3. TTS/playback integrated and verified.
4. End-to-end latency and failure recovery measured.
5. NSIS installer tested on a clean Windows machine.

## Conclusion

This branch is **not bad as a migration foundation**, but it is **not yet professional as a finished app**. The strongest part is truthful runtime gating and diagnostic contracts. The weakest parts are missing real speech-to-speech execution, no completed build/test evidence, debug-heavy frontend, and incomplete production packaging.

The branch should remain draft until the P0 items pass.

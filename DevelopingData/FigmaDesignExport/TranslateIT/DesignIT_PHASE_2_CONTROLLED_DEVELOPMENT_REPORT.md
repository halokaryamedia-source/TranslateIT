# Phase 2 — DesignIT Controlled Development Report

## 1. Executive Summary

Phase 2 is still in controlled development. The current focus has shifted from launcher usability to Figma output quality.

The active quality direction is:

```text
1 URL
-> 1 desktop frame
-> cleaned section order
-> reduced duplicate/noisy layers
-> visible quality score
-> editable Figma output
```

The launcher remains a supporting workflow. The main product blocker is now visual quality: frame/scale stability, section order, duplicate/noisy layer cleanup, and measurable desktop quality.

## 2. Active User Workflow

```text
1. User opens the target root folder.
2. User double-clicks DesignIT.exe.
3. DesignIT.exe checks or starts OmniParser.
4. DesignIT.exe checks or starts RenderBridge.
5. User keeps DesignIT.exe open.
6. User opens the Figma plugin.
7. User inputs a website URL.
8. Plugin sends the URL to the local DesignIT engine.
9. RenderBridge builds the desktop quality checked render payload.
10. Plugin displays desktop quality score.
11. Plugin imports editable layers into Figma.
12. User closes DesignIT.exe when finished.
13. DesignIT.exe stops the local engine ports automatically.
```

## 3. Active Source of Truth

```text
DesignIT.exe in target root
-> scripts/designit-start.ps1
-> scripts/start-omni-wsl.ps1
-> RenderBridge/server.mjs
-> plugin/ui-framework.html
-> RenderBridge /render
-> external visual parser
-> cloneModel
-> figmaRenderPlan
-> applyDesktopQualityPass
-> plugin/code-framework-production.js
-> one clean editable desktop frame by default
-> close DesignIT.exe to stop local services
```

## 4. Latest Quality Patch

| Area | Status | Notes |
|---|---|---|
| Desktop quality pass | Completed | Added `apply-desktop-quality-pass.mjs`. |
| Section ordering | Completed | Frames are sorted by source Y and restacked into one clean desktop flow. |
| Frame normalization | Completed | Desktop page width is normalized and page height follows stacked section height. |
| Noise cleanup | Completed | Removes off-frame layers, tiny decorative layers, small icon-like image noise, empty text, and duplicates. |
| Group cleanup | Completed | Empty groups are removed; group bounds are recomputed while preserving source auto-layout group bounds. |
| Quality scoring | Completed | Adds `desktopQuality` score, grade, removed layer count, and cleanup reasons. |
| Plugin quality visibility | Completed | Plugin status now displays desktop quality score before importing into Figma. |
| Quality gate | Completed | Added `test-desktop-quality-pass.mjs` and `npm run test:desktop-quality`. |
| Contract protection | Completed | Active contract gate now protects the desktop quality pass markers. |

## 5. Files Changed in Latest Quality Patch

| File | Change Type | Reason |
|---|---|---|
| `RenderBridge/src/apply-desktop-quality-pass.mjs` | Created | Desktop-only quality cleanup and scoring pass. |
| `RenderBridge/src/build-final-payload.mjs` | Updated | Applies the desktop quality pass before responsive intent/style/component summaries. |
| `RenderBridge/tests/test-desktop-quality-pass.mjs` | Created | Tests section ordering, duplicate removal, tiny-noise removal, off-frame removal, and score output. |
| `RenderBridge/tests/test-clean-contract.mjs` | Updated | Protects `applyDesktopQualityPass` and quality-pass markers. |
| `RenderBridge/package.json` | Updated | Adds `test:desktop-quality` and includes it in `npm test`. |
| `plugin/ui-framework.html` | Updated | Shows desktop quality score and cleanup reasons before sending payload to Figma. |
| `DesignIT_PHASE_2_CONTROLLED_DEVELOPMENT_REPORT.md` | Updated | Documents the quality-first development shift. |

## 6. Existing Launcher Status

| Area | Status | Notes |
|---|---|---|
| Single root launcher | Completed | `build-designit-launcher.ps1` creates `DesignIT.exe` in the target root. |
| No Desktop shortcut | Completed | `setup-designit-shortcut.ps1` no longer creates Desktop shortcuts and removes old DesignIT shortcuts if present. |
| One visible launcher | Completed | Extra visible Start/Stop shortcut launchers were removed from the active scripts folder. |
| Close-to-stop behavior | Completed | Closing `DesignIT.exe` runs `designit-stop.ps1` and stops local engine ports. |
| Background service orchestration | Completed | `designit-start.ps1` starts/checks OmniParser and RenderBridge in the background and writes logs. |

## 7. What This Patch Does Not Solve Yet

- It does not fully solve Figma layout fidelity.
- It does not fully solve visual-to-DOM matching.
- It does not fully solve image placement fidelity.
- It does not make the Figma plugin directly start system processes by itself.
- It does not remove the need for local dependencies such as Node, WSL, Miniforge, and OmniParser.
- It does not delete stale duplicate renderer files.

## 8. Next Required User Test

Pull the latest branch into the existing `Version 0.1` root only. Then run:

```text
D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DesignIT.exe
```

While `DesignIT.exe` is open, import:

```text
https://www.mivubi.com/
```

The plugin should show:

```text
Desktop Quality: <score>/100 (<grade>)
Cleaned layers: <count>
Cleanup: <reason counts>
```

Then Figma should import one desktop frame only.

## 9. Phase Status

**PARTIAL PASS — DESKTOP QUALITY PASS ADDED, USER RETEST REQUIRED**

The project is not finished. The next test should confirm whether the result improved from “cluttered visual dump” into a cleaner one-frame desktop mockup.

## 10. SYNC HANDOFF FOR NEXT PROMPT

```text
SYNC HANDOFF FOR NEXT PROMPT

Current Phase:
Phase 2 — DesignIT Controlled Development

Phase Status:
PARTIAL PASS — DESKTOP QUALITY PASS ADDED, USER RETEST REQUIRED

Latest Commit Scope:
- Added RenderBridge/src/apply-desktop-quality-pass.mjs.
- Applied applyDesktopQualityPass in RenderBridge/src/build-final-payload.mjs.
- Added desktop quality diagnostics into payload diagnostics/nativeUsefulness.
- Added RenderBridge/tests/test-desktop-quality-pass.mjs.
- Added npm run test:desktop-quality and included it in npm test.
- Updated test-clean-contract.mjs to protect desktop quality pass markers.
- Updated plugin UI to show Desktop Quality score and cleanup reasons before import.
- Kept launcher behavior unchanged: one root DesignIT.exe, no Desktop shortcuts, close-to-stop.

Current Active Source of Truth:
- Product/plugin name: DesignIT
- Technical workspace: DevelopingData/FigmaDesignExport/TranslateIT
- User-facing launcher: Version 0.1/DesignIT.exe
- Launcher source: scripts/DesignIT-Launcher.cs
- Launcher build: scripts/build-designit-launcher.ps1
- Launcher setup: scripts/setup-designit-shortcut.ps1
- Launcher core start: scripts/designit-start.ps1
- Launcher core stop: scripts/designit-stop.ps1
- Plugin manifest: plugin/manifest.json
- Plugin UI: plugin/ui-framework.html
- Plugin renderer: plugin/code-framework-production.js
- RenderBridge server: RenderBridge/server.mjs
- Final payload: RenderBridge/src/build-final-payload.mjs
- Desktop quality pass: RenderBridge/src/apply-desktop-quality-pass.mjs
- External visual engine script: scripts/start-omni-wsl.ps1

Next Required User Test:
- Pull latest branch into existing Version 0.1 root only.
- Ensure Version 0.1/DesignIT.exe exists; run scripts/setup-designit-shortcut.ps1 if it does not.
- Run Version 0.1/DesignIT.exe and keep it open.
- Open Figma plugin and import https://www.mivubi.com/.
- Capture plugin status showing Desktop Quality score.
- Capture resulting Figma canvas and layer tree.

Forbidden Next Scope:
- No new worktree.
- No clone.
- No new root folder creation.
- No broad refactor.
- No full renderer rewrite.
- No extractor rewrite before reviewing new quality score and output screenshot.
- No unrelated RustApp/runtime changes.
```

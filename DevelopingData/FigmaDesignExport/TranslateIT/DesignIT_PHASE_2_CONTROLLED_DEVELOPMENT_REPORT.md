# Phase 2 — DesignIT Controlled Development Report

## 1. Executive Summary

Phase 2 is still in controlled development. The latest product decision is to use a single root launcher executable:

```text
Version 0.1/DesignIT.exe
```

The intended workflow is:

```text
Double-click DesignIT.exe
-> keep DesignIT.exe open
-> open Figma plugin
-> paste website URL
-> click Import
-> close DesignIT.exe when finished
-> local services stop automatically
```

The user should not need to manually type terminal commands during normal use, and no Desktop shortcut should be created.

The Figma plugin alone cannot start Node, WSL, Python, or OmniParser processes by itself. Therefore the practical local-PC solution is one visible launcher executable in the target root that starts and stops the required local services.

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
9. Plugin imports editable layers into Figma.
10. User closes DesignIT.exe when finished.
11. DesignIT.exe stops the local engine ports automatically.
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
-> plugin/code-framework-production.js
-> one clean editable desktop frame by default
-> close DesignIT.exe to stop local services
```

## 4. Latest Launcher Patch

| Area | Status | Notes |
|---|---|---|
| Single root launcher | Completed | `build-designit-launcher.ps1` now creates `DesignIT.exe` in the target root. |
| No Desktop shortcut | Completed | `setup-designit-shortcut.ps1` no longer creates Desktop shortcuts and removes old DesignIT shortcuts if present. |
| One visible launcher | Completed | Removed extra visible Start/Stop shortcut launchers from the active scripts folder. |
| Close-to-stop behavior | Completed | Closing `DesignIT.exe` runs `designit-stop.ps1` and stops local engine ports. |
| Background service orchestration | Completed | `designit-start.ps1` starts/checks OmniParser and RenderBridge in the background and writes logs. |
| Plugin offline message | Completed | The plugin no longer shows raw `Failed to fetch`; it now tells the user to start DesignIT local engine. |
| Health metadata | Completed | `/health` now exposes the single-root-exe launcher workflow. |
| Launcher documentation | Completed | Updated `scripts/DESIGNIT_LOCAL_LAUNCHER.md`. |

## 5. Files Changed in Latest Launcher Patch

| File | Change Type | Reason |
|---|---|---|
| `scripts/DesignIT-Launcher.cs` | Updated | Resolves scripts from the target root and stops local services when the launcher closes. |
| `scripts/build-designit-launcher.ps1` | Updated | Builds `DesignIT.exe` into the target root. |
| `scripts/setup-designit-shortcut.ps1` | Updated | Builds the root `DesignIT.exe`, removes old Desktop shortcuts, and does not create new shortcuts. |
| `scripts/designit-start.ps1` | Updated | Runs services hidden/background with log files. |
| `scripts/DesignIT-Start.cmd` | Deleted | Removed extra visible launcher. |
| `scripts/DesignIT-Start.vbs` | Deleted | Removed extra silent launcher. |
| `scripts/DesignIT-Stop.cmd` | Deleted | Removed separate stop launcher; closing `DesignIT.exe` now stops services. |
| `scripts/DESIGNIT_LOCAL_LAUNCHER.md` | Updated | Documents the root executable and close-to-stop behavior. |
| `RenderBridge/src/health-status.mjs` | Updated | Exposes single root executable launcher metadata in `/health`. |
| `.gitignore` | Updated | Ignores generated root `DesignIT.exe` and DesignIT runtime folders. |
| `plugin/ui-framework.html` | Updated | Keeps user-friendly local engine guidance. |
| `DesignIT_PHASE_2_CONTROLLED_DEVELOPMENT_REPORT.md` | Updated | Documents the single root executable workflow. |

## 6. What This Patch Does Not Solve Yet

- It does not create a cloud backend.
- It does not make the Figma plugin directly start system processes by itself.
- It does not fully solve Figma layout fidelity.
- It does not fully solve visual-to-DOM matching.
- It does not remove the need for local dependencies such as Node, WSL, Miniforge, and OmniParser.
- It does not delete stale duplicate renderer files.

## 7. Next Required User Test

Pull the latest branch into the existing `Version 0.1` root only. Then run the setup script once to generate:

```text
D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DesignIT.exe
```

After that, use only this launcher:

```text
DesignIT.exe
```

Do not use Desktop shortcuts. Old Desktop shortcuts are removed by the setup script if they exist.

## 8. Phase Status

**PARTIAL PASS — SINGLE ROOT EXE LAUNCHER ADDED, USER RETEST REQUIRED**

The project is not finished. The next test should confirm whether `DesignIT.exe` starts the local engine, keeps it alive while open, and stops it automatically when closed.

## 9. SYNC HANDOFF FOR NEXT PROMPT

```text
SYNC HANDOFF FOR NEXT PROMPT

Current Phase:
Phase 2 — DesignIT Controlled Development

Phase Status:
PARTIAL PASS — SINGLE ROOT EXE LAUNCHER ADDED, USER RETEST REQUIRED

Latest Commit Scope:
- Build generated launcher into target root as Version 0.1/DesignIT.exe.
- Do not create Desktop shortcuts.
- Remove old Desktop shortcuts during setup if present.
- Remove extra Start/Stop visible launchers from scripts folder.
- Keep one user-facing launcher only: DesignIT.exe.
- Closing DesignIT.exe runs designit-stop.ps1 and stops local services on ports 8844 and 7860.
- designit-start.ps1 starts services in hidden/background mode and writes logs.
- Updated /health launcher metadata to single-root-exe mode.
- Updated launcher documentation and report.

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
- External visual engine script: scripts/start-omni-wsl.ps1

Next Required User Test:
- Pull latest branch into existing Version 0.1 root only.
- Run scripts/setup-designit-shortcut.ps1 once.
- Confirm Desktop DesignIT shortcuts are removed.
- Confirm Version 0.1/DesignIT.exe exists.
- Run Version 0.1/DesignIT.exe.
- Confirm local engine starts and stays alive while launcher is open.
- Close DesignIT.exe and confirm services stop.
- Open Figma plugin and import https://www.mivubi.com/ while DesignIT.exe is open.

Forbidden Next Scope:
- No new worktree.
- No clone.
- No new root folder creation.
- No broad refactor.
- No full renderer rewrite.
- No extractor rewrite before reviewing new output.
- No unrelated RustApp/runtime changes.
```

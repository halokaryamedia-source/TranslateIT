# Phase 2 — DesignIT Controlled Development Report

## 1. Executive Summary

Phase 2 is still in controlled development. The latest product decision is to support an on-demand local engine launcher, because the intended user workflow is:

```text
Double-click DesignIT Start
-> open Figma plugin
-> paste website URL
-> click Import
```

The user should not need to manually type terminal commands during normal use.

The Figma plugin alone cannot start Node, WSL, Python, or OmniParser processes by itself. Therefore the practical local-PC solution is a one-click launcher icon/program that starts the required local services, while the Figma plugin stays focused on URL input and Figma rendering.

## 2. Active User Workflow

```text
1. User double-clicks DesignIT Start.
2. DesignIT Start checks or starts OmniParser.
3. DesignIT Start checks or starts RenderBridge.
4. User opens the Figma plugin.
5. User inputs a website URL.
6. Plugin sends the URL to the local DesignIT engine.
7. Plugin imports editable layers into Figma.
```

## 3. Active Source of Truth

```text
DesignIT Start launcher
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
```

## 4. Latest Launcher Patch

| Area | Status | Notes |
|---|---|---|
| One-click launcher | Completed | Added `DesignIT-Start.cmd` and `DesignIT-Start.vbs`. |
| Background service orchestration | Completed | Added `designit-start.ps1` to start/check OmniParser and RenderBridge. |
| Stop command | Completed | Added `DesignIT-Stop.cmd` and `designit-stop.ps1`. |
| Desktop shortcut helper | Completed | Added `setup-designit-shortcut.ps1`. |
| Plugin offline message | Completed | The plugin no longer shows raw `Failed to fetch`; it now tells the user to start DesignIT local engine. |
| Health metadata | Completed | `/health` now exposes the local launcher workflow and script names. |
| Launcher documentation | Completed | Added `scripts/DESIGNIT_LOCAL_LAUNCHER.md`. |

## 5. Files Changed in Latest Launcher Patch

| File | Change Type | Reason |
|---|---|---|
| `scripts/designit-start.ps1` | Created | Starts/checks OmniParser and RenderBridge from one local launcher flow. |
| `scripts/DesignIT-Start.cmd` | Created | Visible one-click launcher. |
| `scripts/DesignIT-Start.vbs` | Created | Silent launcher suitable for shortcut usage. |
| `scripts/designit-stop.ps1` | Created | Stops local engine ports 8844 and 7860. |
| `scripts/DesignIT-Stop.cmd` | Created | One-click stop command. |
| `scripts/setup-designit-shortcut.ps1` | Created | Creates Desktop shortcuts for DesignIT Start and Stop. |
| `scripts/DESIGNIT_LOCAL_LAUNCHER.md` | Created | Documents the local launcher workflow. |
| `RenderBridge/src/health-status.mjs` | Updated | Exposes local launcher metadata in `/health`. |
| `plugin/ui-framework.html` | Updated | Replaces raw `Failed to fetch` with user-friendly local engine guidance. |
| `DesignIT_PHASE_2_CONTROLLED_DEVELOPMENT_REPORT.md` | Updated | Documents the one-click local launcher decision and implementation. |

## 6. What This Patch Does Not Solve Yet

- It does not create a cloud backend.
- It does not make the Figma plugin directly start system processes by itself.
- It does not fully solve Figma layout fidelity.
- It does not fully solve visual-to-DOM matching.
- It does not remove the need for local dependencies such as Node, WSL, Miniforge, and OmniParser.
- It does not delete stale duplicate renderer files.

## 7. Next Required User Test

Pull the latest branch into the existing `Version 0.1` root only. Then run the one-click launcher from:

```text
DevelopingData/FigmaDesignExport/TranslateIT/scripts/DesignIT-Start.cmd
```

Optional one-time shortcut setup:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DevelopingData\FigmaDesignExport\TranslateIT\scripts"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-designit-shortcut.ps1
```

After the launcher reports ready, open the Figma plugin and import the website URL.

## 8. Phase Status

**PARTIAL PASS — ONE-CLICK LOCAL LAUNCHER ADDED, USER RETEST REQUIRED**

The project is not finished. The next test should confirm whether the launcher removes the need for manual terminal commands during normal use.

## 9. SYNC HANDOFF FOR NEXT PROMPT

```text
SYNC HANDOFF FOR NEXT PROMPT

Current Phase:
Phase 2 — DesignIT Controlled Development

Phase Status:
PARTIAL PASS — ONE-CLICK LOCAL LAUNCHER ADDED, USER RETEST REQUIRED

Latest Commit Scope:
- Added DesignIT one-click local launcher scripts under DevelopingData/FigmaDesignExport/TranslateIT/scripts.
- Added visible launcher: DesignIT-Start.cmd.
- Added silent launcher: DesignIT-Start.vbs.
- Added service starter: designit-start.ps1.
- Added stop command: DesignIT-Stop.cmd and designit-stop.ps1.
- Added Desktop shortcut helper: setup-designit-shortcut.ps1.
- Added local launcher documentation: DESIGNIT_LOCAL_LAUNCHER.md.
- Updated plugin UI to replace raw Failed to fetch with clear guidance to start DesignIT local engine.
- Updated RenderBridge /health to expose local launcher script names and workflow.

Current Active Source of Truth:
- Product/plugin name: DesignIT
- Technical workspace: DevelopingData/FigmaDesignExport/TranslateIT
- One-click launcher: scripts/DesignIT-Start.cmd
- Silent launcher: scripts/DesignIT-Start.vbs
- Launcher core: scripts/designit-start.ps1
- Plugin manifest: plugin/manifest.json
- Plugin UI: plugin/ui-framework.html
- Plugin renderer: plugin/code-framework-production.js
- RenderBridge server: RenderBridge/server.mjs
- External visual engine script: scripts/start-omni-wsl.ps1

Next Required User Test:
- Pull latest branch into existing Version 0.1 root only.
- Run scripts/DesignIT-Start.cmd.
- Confirm whether it starts/checks OmniParser and RenderBridge without manual terminal typing.
- Open Figma plugin and import https://www.mivubi.com/.
- Provide screenshot of launcher readiness and Figma import result.

Forbidden Next Scope:
- No new worktree.
- No clone.
- No root folder creation.
- No broad refactor.
- No full renderer rewrite.
- No extractor rewrite before reviewing new output.
- No deletion of project files.
- No unrelated RustApp/runtime changes.
```

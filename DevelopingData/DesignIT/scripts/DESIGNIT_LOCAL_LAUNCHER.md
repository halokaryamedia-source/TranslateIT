# DesignIT Local Launcher

## Purpose

The normal user workflow should be simple:

```text
1. Open the target root folder.
2. Double-click DesignIT.exe.
3. Wait until the local engine is ready.
4. Keep DesignIT.exe open while using Figma.
5. Open the Figma plugin.
6. Paste a website URL.
7. Click Import Website to Figma.
8. Close DesignIT.exe when finished; local services stop automatically.
```

Users should not need to manually type PowerShell commands for normal use. No Desktop shortcut is created.

## Files

| File | Purpose |
|---|---|
| `DesignIT-Launcher.cs` | Native Windows launcher source. |
| `build-designit-launcher.ps1` | Builds `DesignIT.exe` into the target root. |
| `DesignIT.exe` | Generated local launcher executable in the target root. This file is built locally and is not committed as a binary. |
| `designit-start.ps1` | Starts the required local engine services in the background and writes logs. |
| `designit-stop.ps1` | Stops local services on ports 8844 and 7860. Used automatically when `DesignIT.exe` closes. |
| `setup-designit-shortcut.ps1` | Builds `DesignIT.exe` in the target root and removes old Desktop shortcuts if they exist. It no longer creates shortcuts. |

## Services Started

The launcher checks and starts:

```text
External visual engine: http://127.0.0.1:7860/health
RenderBridge:           http://127.0.0.1:8844/health
```

RenderBridge is started with:

```text
OMNIPARSER_ENDPOINT=http://127.0.0.1:7860/parse
```

Service logs are written under:

```text
DevelopingData/FigmaDesignExport/_runtime/designit-local-engine/logs
```

## Notes

- The launcher does not clone the repository.
- The launcher does not create a new root worktree.
- The launcher does not create Desktop shortcuts.
- Only one user-facing launcher should exist: `DesignIT.exe` in the target root.
- Runtime folders used by OmniParser are created inside the existing `FigmaDesignExport` workspace by the existing `start-omni-wsl.ps1` script.
- The launcher is an on-demand local engine start flow, not a permanent Windows startup service.
- Closing `DesignIT.exe` runs the stop command and shuts down the local engine ports.
- If the external visual engine is not ready, RenderBridge can still start, but imports will not be production-ready until OmniParser is healthy.
- `DesignIT.exe` is generated locally because binaries should not be committed into the repository during controlled development.

## One-Time Build

From PowerShell, run:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DevelopingData\FigmaDesignExport\TranslateIT\scripts"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-designit-shortcut.ps1
```

This creates:

```text
D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DesignIT.exe
```

Then use the Figma plugin normally while `DesignIT.exe` is open.

# DesignIT Local Launcher

## Purpose

The normal user workflow should be simple:

```text
1. Double-click DesignIT.exe or the DesignIT Start desktop shortcut.
2. Wait until the local engine is ready.
3. Open the Figma plugin.
4. Paste a website URL.
5. Click Import Website to Figma.
```

Users should not need to manually type PowerShell commands for normal use.

## Files

| File | Purpose |
|---|---|
| `DesignIT-Launcher.cs` | Native Windows launcher source. |
| `build-designit-launcher.ps1` | Builds `DesignIT.exe` from the C# source. |
| `DesignIT.exe` | Generated local launcher executable. This file is built locally and is not committed as a binary. |
| `DesignIT-Start.cmd` | Visible launcher fallback with progress output. Useful for debugging. |
| `DesignIT-Start.vbs` | Silent launcher fallback. |
| `designit-start.ps1` | Starts the required local engine services in the background and writes logs. |
| `DesignIT-Stop.cmd` | Stops the local engine ports. |
| `designit-stop.ps1` | Stops local services on ports 8844 and 7860. |
| `setup-designit-shortcut.ps1` | Builds the native launcher when needed and creates Desktop shortcuts for `DesignIT Start` and `DesignIT Stop`. |

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
- Runtime folders used by OmniParser are created inside the existing `FigmaDesignExport` workspace by the existing `start-omni-wsl.ps1` script.
- The launcher is an on-demand local engine start flow, not a permanent Windows startup service.
- If the external visual engine is not ready, RenderBridge can still start, but imports will not be production-ready until OmniParser is healthy.
- `DesignIT.exe` is generated locally because binaries should not be committed into the repository during controlled development.

## One-Time Shortcut Setup

From PowerShell, run:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DevelopingData\FigmaDesignExport\TranslateIT\scripts"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-designit-shortcut.ps1
```

After that, use the Desktop shortcut:

```text
DesignIT Start
```

Or run the generated executable directly:

```text
DevelopingData/FigmaDesignExport/TranslateIT/scripts/DesignIT.exe
```

Then use the Figma plugin normally.

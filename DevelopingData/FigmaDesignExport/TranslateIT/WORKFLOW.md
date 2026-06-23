# TranslateIT Clean Local Workflow

This workspace keeps all TranslateIT working files under:

```txt
DevelopingData/FigmaDesignExport
```

No external engine clone, runtime output, or report output should be stored outside that folder during normal development.

## Folder policy

```txt
DevelopingData/FigmaDesignExport/
  _external/      local third-party engine clones, not committed
  _runtime/       local runtime scratch files, not committed
  _reports/       local report exports, not committed
  TranslateIT/
    plugin/       Figma plugin manifest and code
    RenderBridge/ active local bridge server
    scripts/      only supported local workflow scripts
```

## Supported commands

From the repository root:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1"
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\reset-local-workspace.ps1" -RemoveScattered
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\start-dev.ps1"
```

## Figma usage

Use only this manifest:

```txt
DevelopingData\FigmaDesignExport\TranslateIT\plugin\manifest.json
```

Use URL input only. Do not manually import generated payload JSON files.

## Removed workflow

The manual payload import workflow has been removed. Old production/readiness PowerShell runners in `RenderBridge` root have been removed. The active workflow is URL-first and external-vision-first.

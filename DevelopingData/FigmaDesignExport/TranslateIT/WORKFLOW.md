# TranslateIT Local Workflow

TranslateIT uses one local workspace root:

```txt
DevelopingData/FigmaDesignExport
```

All engine clones, runtime scratch files, reports, plugin files, and bridge files must stay inside that workspace.

## Folder policy

```txt
DevelopingData/FigmaDesignExport/
  _external/      local external engine clone, ignored by Git
  _runtime/       local runtime scratch files, ignored by Git
  _reports/       local report exports, ignored by Git
  TranslateIT/
    plugin/       active Figma plugin
    RenderBridge/ active local bridge server
    scripts/      supported workflow scripts
```

## Supported commands

Run from the repository root:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1"
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\reset-local-workspace.ps1" -RemoveScattered -CleanGenerated
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\audit-clean-workspace.ps1"
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\start-dev.ps1"
```

## Figma usage

Use only this manifest:

```txt
DevelopingData\FigmaDesignExport\TranslateIT\plugin\manifest.json
```

Use URL input only. Generated payload JSON files are internal reports and must not be manually imported into Figma.

## Cleanliness requirement

Before development or Figma testing, the audit command must pass:

```powershell
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\audit-clean-workspace.ps1"
```

A failed audit means the workspace is not clean enough for testing.

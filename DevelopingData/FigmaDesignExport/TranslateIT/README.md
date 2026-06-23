# TranslateIT Figma Design Export

TranslateIT is a URL-to-Figma reconstruction workflow. The active direction is external-vision-first website reconstruction with editable Figma output.

## Workspace root

All local working files must stay under:

```txt
DevelopingData/FigmaDesignExport
```

Local external engines, runtime scratch files, and reports are placed in ignored folders:

```txt
_external/
_runtime/
_reports/
```

## Active workflow

```txt
Figma URL input
-> RenderBridge/server.mjs
-> Playwright screenshot capture
-> external visual parser endpoint
-> visual-first layout model
-> Figma plugin renderer
```

## Supported commands

From the repository root:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1"
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\reset-local-workspace.ps1" -RemoveScattered -CleanGenerated
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\audit-clean-workspace.ps1"
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\start-dev.ps1"
```

## Figma plugin

Use this manifest only:

```txt
DevelopingData\FigmaDesignExport\TranslateIT\plugin\manifest.json
```

Use URL input only. Generated payload JSON files are reports and are not part of the manual import workflow.

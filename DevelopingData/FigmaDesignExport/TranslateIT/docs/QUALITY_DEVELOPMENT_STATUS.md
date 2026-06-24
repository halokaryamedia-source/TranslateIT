# DesignIT Quality Development Status

## Current Focus

DesignIT is in a quality-first phase. Launcher usability is now supporting infrastructure; the primary blocker is output quality and workspace cleanliness.

Target:

```text
Website URL
-> local DesignIT engine
-> screenshot-backed visual reconstruction
-> one clean desktop Figma frame
-> editable text/layer overlay
```

## Current User Workflow

```text
1. Open Version 0.1/DesignIT.exe.
2. Keep the launcher open.
3. Open the Figma plugin.
4. Paste URL.
5. Import.
6. Close DesignIT.exe when finished; local services stop automatically.
```

## Active Runtime Files

```text
Version 0.1/DesignIT.exe
DevelopingData/FigmaDesignExport/TranslateIT/plugin/manifest.json
DevelopingData/FigmaDesignExport/TranslateIT/plugin/ui-framework.html
DevelopingData/FigmaDesignExport/TranslateIT/plugin/code-framework-production.js
DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/server.mjs
DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/src/build-final-payload.mjs
DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/src/apply-desktop-quality-pass.mjs
DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/src/apply-visual-backplate-pass.mjs
DevelopingData/FigmaDesignExport/TranslateIT/scripts/designit-start.ps1
DevelopingData/FigmaDesignExport/TranslateIT/scripts/designit-stop.ps1
DevelopingData/FigmaDesignExport/TranslateIT/scripts/start-omni-wsl.ps1
```

## Current Quality Work

Completed:

- one root launcher flow
- no Desktop shortcut creation
- close-to-stop local services
- desktop-only render default
- responsive render disabled by default
- desktop quality pass
- section order cleanup
- duplicate/off-frame/tiny-noise cleanup
- screenshot visual backplate pass
- plugin renderer support for locked visual reference backplate
- quality score surfaced in plugin UI

Still not solved:

- professional editable hierarchy comparable to hand-made Figma
- perfect DOM-to-visual matching
- perfect image placement fidelity without the backplate
- detailed component reconstruction

## Clean Workspace Policy

Visible workspace should stay simple:

```text
DevelopingData/FigmaDesignExport/TranslateIT/
  docs/
  plugin/
  RenderBridge/
  scripts/
```

Runtime/generated data should move out of the visible development workspace and stay under:

```text
UserData/CacheData/DesignIT/
UserData/LogData/DesignIT/
```

Old generated or legacy folders/files should be removed locally:

```text
DevelopingData/FigmaDesignExport/_external/
DevelopingData/FigmaDesignExport/_runtime/
DevelopingData/FigmaDesignExport/_reports/
BuildPackage/
Samples/
Tools/
Start-TranslateIT-OneTerminal.ps1
figma-*.json
WORKFLOW.md
root README.md
```

Runtime/generated data should not be treated as source code.

# TranslateIT RenderBridge

Local clean RenderBridge for the TranslateIT Figma plugin.

Public version:

```txt
Version 0.1 - Alpha
```

Active engine:

```txt
translateit-core
alpha-clean-1
```

## Goal

TranslateIT converts a website URL into a clean, editable Figma UI structure. The output should be usable as a UI Library style reconstruction, not a raw DOM dump and not a flattened screenshot.

## Active Workflow

```txt
Website URL
-> RenderBridge/server.mjs
-> capture-site.mjs
-> extract-layout.mjs
-> build-design-model.mjs
-> visual-audit.mjs
-> plugin/code.js
-> editable Figma UI Library structure + separate screenshot reference
```

## Active Files

```txt
RenderBridge/server.mjs
RenderBridge/src/shared-contract.mjs
RenderBridge/src/capture-site.mjs
RenderBridge/src/extract-layout.mjs
RenderBridge/src/build-design-model.mjs
RenderBridge/src/visual-audit.mjs
RenderBridge/test-translateit.ps1
plugin/manifest.json
plugin/code.js
plugin/ui.html
```

## One Engine Rule

Only this engine is active:

```txt
translateit-core / alpha-clean-1
```

The plugin rejects any payload that does not match this contract.

## One Command Preflight

From this folder, run:

```powershell
.\test-translateit.ps1 https://www.mivubi.com/
```

`mivubi.com` is only a sample/regression target. It is not hardcoded into the engine.

The command:

```txt
installs dependencies if needed
installs Playwright Chromium
runs clean contract audit
starts only the clean RenderBridge
runs visual audit
saves reports/translateit-clean-latest.json
prints whether Figma testing is allowed
```

## Manual Start

```cmd
Start-Render-Bridge.cmd
```

This calls:

```txt
npm start
```

`npm start` calls:

```txt
node server.mjs
```

## Health Check

```txt
http://127.0.0.1:8844/health
```

Expected:

```txt
engine: translateit-core
engineBuild: alpha-clean-1
legacyActive: false
```

## Render Endpoint

```txt
http://127.0.0.1:8844/render?url=https://example.com/
```

Returns the clean contract:

```txt
source
designModel.sections
designModel.elements
designModel.assets
```

## Audit Endpoint

```txt
http://127.0.0.1:8844/audit?url=https://example.com/
```

Returns visual audit metrics:

```txt
visualReadiness
layoutScore
overlapScore
imageScore
textScore
sectionScore
layerCleanlinessScore
editabilityScore
```

## Quality Target

Do not ask for manual Figma testing unless visual audit is meaningful and the output is expected to be clean enough to review.

The target is not pixel-perfect screenshot copying. The target is professional editable reconstruction: readable sections, clean layer names, no major overlap, proportional images, and a UI Library structure that designers can edit.

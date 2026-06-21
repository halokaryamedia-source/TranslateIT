# TranslateIT Figma Design Export

Status: active clean-engine development.

Public plugin version must remain:

```txt
Version 0.1 - Alpha
```

## Product Goal

TranslateIT is a website-to-Figma reconstruction plugin. The goal is not just to create frames in Figma, but to create a clean, editable, professional UI structure that designers can continue editing.

The output should behave like a practical UI Library structure:

```txt
Page
Section
Header
Navigation
Hero
Content
Card
Image
Button
Footer
Asset
```

The editable output must not be a raw DOM dump and must not rely on screenshot overlay. Screenshot source is allowed only as a separate reference frame.

## Active Clean Engine

Only one active engine is allowed:

```txt
translateit-core
alpha-clean-1
```

Only one plugin renderer is active:

```txt
plugin/code.js
```

The default manifest points to:

```txt
plugin/manifest.json -> main: code.js
```

## Clean Contract

RenderBridge returns one contract:

```txt
publicVersion: Version 0.1 - Alpha
engine: translateit-core
engineBuild: alpha-clean-1
source: present
designModel.sections: present
designModel.elements: present
designModel.assets: present
```

The plugin rejects payloads outside this contract.

## Folder Structure

```txt
DevelopingData/FigmaDesignExport/TranslateIT/
├─ CLEAN_ENGINE_PLAN.md
├─ README.md
├─ RenderBridge/
│  ├─ package.json
│  ├─ server.mjs
│  ├─ test-translateit.ps1
│  ├─ src/
│  │  ├─ shared-contract.mjs
│  │  ├─ capture-site.mjs
│  │  ├─ extract-layout.mjs
│  │  ├─ build-design-model.mjs
│  │  └─ visual-audit.mjs
│  ├─ tests/
│  │  ├─ test-clean-contract.mjs
│  │  └─ test-sample-sites.mjs
│  └─ reports/
└─ plugin/
   ├─ manifest.json
   ├─ code.js
   └─ ui.html
```

## One Command Preflight

Run from `RenderBridge`:

```powershell
.\test-translateit.ps1 https://www.mivubi.com/
```

`mivubi.com` is only a sample/regression target. The engine must not contain site-specific hardcoded logic.

The command runs:

```txt
dependency check
Playwright browser install
clean contract audit
clean RenderBridge start
visual audit
report generation
```

Report:

```txt
RenderBridge/reports/translateit-clean-latest.json
```

## Visual Quality Gate

A result should not be treated as ready only because the payload exists. The audit must evaluate:

```txt
visualReadiness
layoutScore
overlapScore
imageScore
textScore
sectionScore
layerCleanlinessScore
duplicateTextScore
editabilityScore
```

Manual Figma testing should happen only when the clean report is meaningful and the generated structure is expected to be reviewable.

## Rules

```txt
No active multiple engines.
No active alternate plugin renderer.
No hardcoded sample website logic.
No raw DOM dump as final output.
No screenshot overlay as editable output.
No report pass that ignores visual quality.
```

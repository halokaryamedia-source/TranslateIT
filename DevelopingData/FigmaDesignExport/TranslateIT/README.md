# TranslateIT Figma Design Export

Status: active clean-engine development.

Public plugin version must remain:

```txt
Version 0.1 - Alpha
```

## Product Goal

TranslateIT is a website-to-Figma reconstruction plugin. The goal is a layout-preserving editable clone of the source website, not a clean redesign template and not a screenshot-only import.

The correct product direction is:

```txt
Screenshot-first, HTML-assisted, editable reconstruction.
```

The screenshot is the visual truth. DOM/CSS/assets provide editability, text, asset metadata, section meaning, and UI Library organization.

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

The active manifest points to:

```txt
plugin/manifest.json -> main: code.js
plugin/manifest.json -> ui: ui.html
```

## Active Contract

RenderBridge returns one active contract:

```txt
publicVersion: Version 0.1 - Alpha
engine: translateit-core
engineBuild: alpha-clean-1
contract: cloneModel
cloneModel.mode: layout-preserving-editable-clone
visualModel: screenshot-first-html-assisted-v2
visualComparison: visual-comparison-v2
legacyActive: false
```

The plugin renders from `cloneModel` only. `designModel` can exist internally as an intermediate representation, but it is not the renderer contract.

## Current Reconstruction Pipeline

```txt
URL
-> Playwright browser render
-> full-page screenshot capture
-> DOM/CSS/assets capture
-> buildVisualModel
-> extractLayout
-> buildDesignModel
-> reconstructTextLines
-> guardHeroOcclusion
-> matchDomToVisual
-> buildCloneModel
-> renderClonePreview
-> compareSourceAndClonePreview V2
-> visualAudit
-> plugin/code.js renderer
-> editable Figma clone + locked screenshot reference
```

Active capability markers:

```txt
paintOrder: dom-paint-order-preserved
sectionSurface: source-derived
imageFit: source-object-fit-preserved
textRender: source-text-rendering-preserved
heroOcclusionGuard: true
textLineReconstruction: true
visualDiffOverlay: true
```

## Automated Self Audit

The repository includes a GitHub Actions workflow:

```txt
.github/workflows/translateit-renderbridge-self-audit.yml
```

The workflow simulates the RenderBridge pipeline before manual Figma testing:

```txt
install dependencies
install Playwright Chromium
run module import gate
run clean contract gate
run V2 marker gate
start RenderBridge
capture source website
render clone preview
compare source vs clone
write visual diff overlay
run Figma renderer dry run with a mock API
run regression suite
upload report artifacts
```

The workflow is configured to keep collecting artifacts even when a visual gate fails. A red CI result can still contain useful preview and diff overlay artifacts for debugging.

Manual Figma testing should only happen after the automated self audit produces a reviewable preview and diff overlay. The manual test is final validation, not the main debugging process.

## Folder Structure

```txt
DevelopingData/FigmaDesignExport/TranslateIT/
├─ CLEAN_ENGINE_PLAN.md
├─ ENGINE_FLOW_CHART.md
├─ CODIA_STYLE_REFERENCE.md
├─ README.md
├─ RenderBridge/
│  ├─ package.json
│  ├─ server.mjs
│  ├─ test-translateit.ps1
│  ├─ run-full-regression-and-open.ps1
│  ├─ open-latest-reports.ps1
│  ├─ src/
│  │  ├─ shared-contract.mjs
│  │  ├─ health-status.mjs
│  │  ├─ route-handlers.mjs
│  │  ├─ capture-site.mjs
│  │  ├─ extract-layout.mjs
│  │  ├─ build-visual-model.mjs
│  │  ├─ build-design-model.mjs
│  │  ├─ reconstruct-text-lines.mjs
│  │  ├─ guard-hero-occlusion.mjs
│  │  ├─ match-dom-visual.mjs
│  │  ├─ build-clone-model.mjs
│  │  ├─ render-clone-preview.mjs
│  │  ├─ compare-visual-screenshots.mjs
│  │  ├─ run-clone-audit.mjs
│  │  └─ visual-audit.mjs
│  ├─ tests/
│  │  ├─ test-module-imports.mjs
│  │  ├─ test-clean-contract.mjs
│  │  ├─ test-v2-markers.mjs
│  │  ├─ test-figma-renderer-dry-run.mjs
│  │  ├─ test-sample-sites.mjs
│  │  ├─ test-regression-suite.mjs
│  │  └─ regression-sites.json
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

`test-translateit.ps1` routes to the full workflow:

```txt
npm dependency check
Playwright Chromium install
RenderBridge health check
module import gate
clean contract gate
V2 marker gate
sample audit
Figma renderer dry run
regression suite
open latest reports
copy Mivubi JSON report to clipboard
```

`mivubi.com` is only a sample/regression target. The engine must not contain site-specific hardcoded logic.

## Report Files

The workflow writes per-site reports to avoid confusion from overwritten latest files:

```txt
RenderBridge/reports/translateit-regression-site-mivubi-sample.json
RenderBridge/reports/translateit-regression-site-mivubi-sample.html
RenderBridge/reports/translateit-regression-site-mivubi-sample.png
RenderBridge/reports/translateit-regression-site-mivubi-sample-diff.html
RenderBridge/reports/translateit-regression-site-mivubi-sample-diff.png
RenderBridge/reports/translateit-regression-latest.json
```

`translateit-clean-latest.json` can still exist as a low-level latest audit file, but the main review target is the per-site regression report.

## Visual Quality Gate

A result must not be treated as ready only because the payload exists. The audit must evaluate:

```txt
visualReadiness
layoutScore
overlapScore
imageScore
textScore
sectionScore
layerCleanlinessScore
cloneFidelityScore
visualMatchScore
visualSimilarityScore
duplicateTextScore
editabilityScore
```

Visual Comparison V2 also evaluates:

```txt
topViewportSimilarityScore
fullPageSimilarityScore
sectionBandSimilarityScore
worstBandScore
imageRegionSimilarityScore
colorSimilarityScore
layoutShiftRiskScore
fabricatedLayoutRisk
```

Manual Figma testing should happen only when the per-site preview and diff overlay are visually reviewable.

## Rules

```txt
No active multiple engines.
No active alternate plugin renderer.
No hardcoded sample website logic.
No clean redesign/template as default output.
No raw DOM dump as final output.
No screenshot overlay as editable output.
No report pass that ignores visual quality.
Renderer must render cloneModel only.
Screenshot is visual truth; DOM is editability support.
```

# TranslateIT Development Batch Status

Branch: `translateit-clean-engine`

Public version must remain:

```txt
Version 0.1 - Alpha
```

Current engine markers:

```txt
engine: translateit-core
engineBuild: alpha-clean-1
contract: cloneModel
cloneMode: layout-preserving-editable-clone
legacyActive: false
```

## Current Product Direction

TranslateIT is moving toward a Codia-style reconstruction workflow:

```txt
Screenshot-first, HTML-assisted, editable reconstruction.
```

The default output is not a redesign template. The output must preserve source website layout first, then organize it into editable Figma/UI Library structure.

## Current Pipeline

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
```

## Implemented Workstreams

### 1. cloneModel Contract

Implemented active renderer contract:

```txt
cloneModel.mode = layout-preserving-editable-clone
```

The plugin renderer reads from `cloneModel` only. `designModel` is treated as internal/intermediate data.

### 2. Visual Model V2

Added visual model diagnostics:

```txt
coverageRatio
visibleArea
coveredArea
importantBlocks
confidenceReason
sectionBand
averageConfidence
```

### 3. DOM Paint Order Preservation

Added paint-order preservation:

```txt
paintOrder: dom-paint-order-preserved
```

This prevents the old bug where all text was forced above images.

### 4. Hero Occlusion Guard

Added `guard-hero-occlusion.mjs`.

Purpose:

```txt
remove text fragments that should be hidden/occluded by hero images
remove severe headline collision fragments
```

Diagnostics:

```txt
removedHeroOccludedText
removedHeadlineCollisionText
heroOcclusionGuard: true
```

### 5. Line-aware Headline Reconstruction

Added `reconstruct-text-lines.mjs`.

Purpose:

```txt
merge nearby compatible headline fragments into cleaner line layers
```

Marker:

```txt
line-aware-headline-reconstruction
```

### 6. Source-derived Section Surface

Section background is now derived from source surfaces/containers when available.

Marker:

```txt
sectionSurface: source-derived
```

### 7. Image Fit Metadata

Captured and preserved image display metadata:

```txt
objectFit
objectPosition
naturalWidth
naturalHeight
renderedRatio
naturalRatio
aspectDrift
```

Markers:

```txt
imageFit: source-object-fit-preserved
imageFitLayerCount
```

### 8. Text Render Metadata

Captured and preserved safe text rendering metadata:

```txt
letterSpacing
textTransform
whiteSpace
wordBreak
overflowWrap
opacity
overflow
```

Marker:

```txt
textRender: source-text-rendering-preserved
```

Preview HTML uses these values more directly. Figma renderer currently applies safe opacity and basic text styling, while avoiding risky unsupported CSS-like settings.

### 9. Visual Comparison V2

Added visual comparison V2 metrics:

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

Readiness gate is stricter now and should fail if the preview is visibly wrong.

### 10. Visual Diff Overlay

Generated diagnostic overlay files:

```txt
translateit-visual-diff-latest.png
translateit-visual-diff-latest.html
translateit-regression-site-mivubi-sample-diff.png
translateit-regression-site-mivubi-sample-diff.html
```

Overlay format:

```txt
left: source screenshot
right: clone preview + red diff overlay
```

### 11. Stabilization Pass

Added:

```txt
tests/test-module-imports.mjs
open-latest-reports.ps1
run-full-regression-and-open.ps1
```

Updated:

```txt
package.json
test-translateit.ps1
README.md
health-status.mjs
test-clean-contract.mjs
```

## Current Recommended Test Command

Run from repository root or any location using this one command:

```powershell
$ErrorActionPreference='Stop'; $R='D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1'; cd $R; git fetch origin; git checkout translateit-clean-engine; git pull --ff-only origin translateit-clean-engine; $B=Join-Path $R 'DevelopingData\FigmaDesignExport\TranslateIT\RenderBridge'; cd $B; powershell -ExecutionPolicy Bypass -File .\run-full-regression-and-open.ps1 -TargetUrl 'https://www.mivubi.com/'
```

The command opens and copies the Mivubi per-site JSON report, not the generic `translateit-clean-latest.json`.

## Primary Review Files

Use these for visual review:

```txt
reports/translateit-regression-site-mivubi-sample.json
reports/translateit-regression-site-mivubi-sample.html
reports/translateit-regression-site-mivubi-sample.png
reports/translateit-regression-site-mivubi-sample-diff.html
reports/translateit-regression-site-mivubi-sample-diff.png
reports/translateit-regression-latest.json
```

## Do Not Use As Primary Review

```txt
reports/translateit-clean-latest.json
```

That file can still be useful internally, but it can be overwritten by the latest single audit run. The per-site regression report is the review source of truth.

## Still Needs Visual Verification

The current code has not been visually approved yet. The next test must check:

```txt
1. Is the hero area closer to the original source?
2. Are text fragments no longer visible on top of images incorrectly?
3. Are section backgrounds closer to source surfaces?
4. Are image crops closer to browser rendering?
5. Does the diff overlay show fewer large red regions?
6. Does the audit fail honestly if the preview is still far from the source?
```

## Rules Going Forward

```txt
No hardcoded mivubi.com logic.
No template hero/card/footer renderer.
No report pass if the visual preview is clearly wrong.
No screenshot-only editable output.
No renderer based on designModel/renderPlan.
cloneModel is the active rendering contract.
Screenshot is visual truth; DOM is editability support.
```

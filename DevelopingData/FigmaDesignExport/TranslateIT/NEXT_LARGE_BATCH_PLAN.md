# TranslateIT Next Large Batch Execution Plan

Public version:

```txt
Version 0.1 - Alpha
```

Active engine:

```txt
translateit-core / alpha-clean-1
```

Current product direction:

```txt
Screenshot-first, HTML-assisted, editable Figma clone.
```

Main references:

```txt
1. Codia-style HTML-to-Figma Design
2. Codia-style Screenshot-to-Figma
```

## Batch Name

```txt
Batch Alpha-2 — Visual Fidelity Stabilization & Professional Pipeline Structure
```

## Batch Objective

This batch must move TranslateIT from a working architecture foundation into a more structured, reliable, and measurable visual-clone pipeline.

The main goal is:

```txt
Make the engine easier to maintain, easier to test, and more accurate before Figma import.
```

This batch should not add random new features. It should strengthen the core pipeline:

```txt
URL
-> capture
-> visual model
-> DOM-to-visual matching
-> cloneModel
-> clone preview
-> source-vs-clone comparison
-> Figma renderer
```

## Non-Negotiable Rule

The output must not be accepted if it looks like a new layout, generic template, or redesign.

```txt
Visual fidelity first.
Editable structure second.
UI Library organization third.
```

## Current State Before This Batch

Already available:

```txt
cloneModel contract
visualModel foundation
DOM-to-visual matching foundation
clone preview HTML/PNG foundation
source-vs-clone comparison foundation
visualAudit with readiness gate
Figma renderer using cloneModel source geometry
professional docs and roadmap
```

Known remaining problems:

```txt
server.mjs is too monolithic
cloneModel builder still lives inside server.mjs
visual segmentation is still basic
source-vs-clone comparison is still sampling-based
preview renderer and Figma renderer can drift
image crop/object-fit is still weak
text wrapping can differ from browser/Figma
UI Library grouping can be improved
multi-site regression is not complete
```

## Scope Summary

This batch has seven major workstreams:

```txt
1. Core Pipeline Refactor
2. Visual Model V2
3. DOM-to-Visual Matching V2
4. Clone Preview & Comparison V2
5. Figma Renderer Parity
6. Regression Suite & Reports
7. Documentation and Developer Workflow Cleanup
```

## Workstream 1 — Core Pipeline Refactor

### Objective

Make the engine structure clean and maintainable.

### Problem

`server.mjs` currently contains too much logic:

```txt
server routes
clone model builder
payload builder
render/audit handling
health metadata
```

This makes future development risky because every improvement requires editing a large file.

### Required Changes

Create dedicated modules:

```txt
RenderBridge/src/build-payload.mjs
RenderBridge/src/build-clone-model.mjs
RenderBridge/src/route-handlers.mjs
RenderBridge/src/health-status.mjs
```

Move logic:

```txt
buildPayload() -> build-payload.mjs
buildCloneModel() -> build-clone-model.mjs
/health response -> health-status.mjs
/render and /audit handlers -> route-handlers.mjs
```

`server.mjs` should become thin:

```txt
create server
route request
listen on port
```

### Acceptance Criteria

```txt
server.mjs no longer contains clone model building logic
buildCloneModel is imported from its own module
buildPayload is imported from its own module
health markers remain unchanged
npm test passes
/render and /audit behavior unchanged
```

### Rollback Condition

Rollback this workstream if:

```txt
/render breaks
/audit breaks
health contract changes unexpectedly
cloneModel output shape changes without intent
```

## Workstream 2 — Visual Model V2

### Objective

Improve the screenshot-first layer so it can represent what the user actually sees.

### Current Limitation

The current visual model is still mostly derived from visible DOM data. It is useful as a foundation, but it is not yet strong enough to fully behave like Screenshot-to-Figma.

### Required Changes

Enhance `build-visual-model.mjs` with:

```txt
visual block normalization
section band detection improvement
large background surface detection
image region prioritization
button/container region confidence scoring
shape/background color confidence
visual block cleanup and merging
visual block coverage diagnostics
```

Add fields to visual blocks:

```txt
source: dom-derived | screenshot-derived | inferred-background
confidenceReason
coverageArea
isLargeSurface
isTextCandidate
isImageCandidate
isContainerCandidate
```

### Output Contract

`visualModel` should include:

```json
{
  "mode": "screenshot-first-html-assisted-visual-model",
  "visualBlocks": [],
  "coverage": {
    "visibleArea": 0,
    "coveredArea": 0,
    "coverageRatio": 0
  },
  "diagnostics": {}
}
```

### Acceptance Criteria

```txt
visualModel reports coverageRatio
major images become image-region blocks
major background surfaces become shape/background blocks
text-region count remains stable or improves
visual block count is not noisy/excessive
sample preflight prints visual coverage metrics
```

## Workstream 3 — DOM-to-Visual Matching V2

### Objective

Make final editable layers more reliable by matching DOM metadata to visual truth more accurately.

### Current Limitation

The current matching uses raw ID, overlap, expected type, and text similarity. This is correct as a foundation but needs stronger scoring and diagnostics.

### Required Changes

Improve `match-dom-visual.mjs` with:

```txt
weighted scoring config
separate match strategy per type: text/image/button/shape
section proximity score
size similarity score
style similarity score
image asset similarity score
confidenceReason
matchRejectReason
```

Layer metadata should include:

```txt
visualMatch.score
visualMatch.strategy
visualMatch.reason
confidence
sourceReason
originalRect
visualRect
rectDecision
```

### Matching Rules

```txt
Text:
  visual rect wins for position when text match + overlap are strong.
  DOM text wins for content.
  CSS wins for editable style hint.

Image:
  visual rect wins for position/crop.
  DOM asset wins for source image when available.
  screenshot crop fallback is allowed when DOM asset cannot reproduce crop.

Shape/background:
  visual surface wins for bounds/color.
  DOM style is used only as hint.

Button:
  visual rect wins for button surface.
  DOM text wins for label.
```

### Acceptance Criteria

```txt
visualMatchRate improves or stays stable
visualMatchConfidence improves or stays stable
unmatched high-importance layers are reported
each clone layer has confidence and sourceReason
readyForFigmaTest fails if key visual layers are unmatched
```

## Workstream 4 — Clone Preview & Comparison V2

### Objective

Make the pre-Figma audit more meaningful and closer to real visual fidelity.

### Current Limitation

The current comparison uses sampled canvas difference between source screenshot and clone preview. This is useful but not enough for high-confidence similarity.

### Required Changes

Improve `compare-visual-screenshots.mjs` with:

```txt
compare top viewport separately
compare full-page scaled version
compare section bands: header, hero, content, footer
compare image-heavy regions separately
compare dominant color distribution
compare layout ink/coverage distribution
generate diff summary metrics
```

Add metrics:

```txt
topViewportSimilarityScore
fullPageSimilarityScore
sectionBandSimilarityScore
imageRegionSimilarityScore
colorSimilarityScore
inkCoverageScore
layoutShiftRisk
fabricatedLayoutRisk
```

Preview report should include:

```txt
source screenshot dimensions
clone preview dimensions
preview HTML path
preview PNG path
comparison metrics
risk level
failure reasons
```

### Acceptance Criteria

```txt
/audit writes preview HTML and PNG
/audit includes source-vs-clone comparison metrics
readyForFigmaTest cannot pass if comparison risk is high
terminal preflight displays comparison score and paths
```

## Workstream 5 — Figma Renderer Parity

### Objective

Keep Figma output aligned with clone preview output.

### Problem

If HTML preview and Figma renderer interpret `cloneModel` differently, preview audit can pass while Figma output still looks wrong.

### Required Changes

Update `plugin/code.js` to match preview renderer behavior:

```txt
same layer ordering logic
same scale strategy
same text size rules
same image fill/crop assumptions
same background/shape rendering rules
same button rendering rules
```

Add renderer metadata in import status:

```txt
Renderer: layout-preserving editable clone
Preview parity: clone-preview-compatible
CloneMode: layout-preserving-editable-clone
VisualTruth: screenshot-first-html-assisted
```

### Acceptance Criteria

```txt
plugin still rejects missing cloneModel
plugin does not contain generic hero/card/footer renderers
plugin renders section frames from cloneModel.sections
plugin renders all cloneModel.layers by rect
plugin status includes visualTruth
plugin code remains Figma JS-compatible without optional chaining/nullish coalescing
```

## Workstream 6 — Regression Suite & Reports

### Objective

Move testing away from single-site manual checks.

### Required Changes

Create regression config:

```txt
RenderBridge/tests/regression-sites.json
```

Suggested categories:

```txt
mivubi sample
portfolio site
company profile
landing page
blog/article
image-heavy page
card/grid page
dark theme page
simple product/ecommerce page
```

Create script:

```txt
RenderBridge/tests/test-regression-suite.mjs
```

Report per site:

```txt
targetUrl
readyForFigmaTest
visualSimilarityScore
visualMatchScore
sourceCoverageScore
fabricatedLayoutRisk
clonePreview paths
failures
warnings
```

Write aggregate report:

```txt
RenderBridge/reports/translateit-regression-latest.json
```

### Acceptance Criteria

```txt
regression script can run multiple sites
site failures do not hide other site results
aggregate report includes pass/fail summary
no hardcoded website-specific logic is allowed
```

## Workstream 7 — Documentation & Developer Workflow Cleanup

### Objective

Make the project easier to run and audit.

### Required Changes

Update docs:

```txt
README.md
DEVELOPMENT_PLAN.md
VISUAL_FIRST_EDITABLE_CLONE_SPEC.md
```

Add or update commands:

```txt
npm test
npm run test:sample
npm run test:regression
npm run audit -- <url>
```

Add one-command Windows script if needed:

```txt
RenderBridge/test-translateit.ps1
RenderBridge/test-regression.ps1
```

### Acceptance Criteria

```txt
developer can run one command to test a URL
developer can run one command to test regression set
report paths are printed clearly
Figma testing is only recommended when readyForFigmaTest is true
```

## Execution Order

This batch should be executed in this exact order:

```txt
1. Refactor server.mjs into modules.
2. Confirm behavior unchanged with current tests.
3. Improve visualModel V2 coverage and diagnostics.
4. Improve DOM-to-visual matching V2.
5. Improve clone preview and source-vs-clone comparison V2.
6. Align Figma renderer with clone preview behavior.
7. Add regression suite.
8. Update docs and scripts.
9. Run sample preflight.
10. Run Figma manual smoke test only if preflight passes.
```

## Batch Quality Gates

This batch is not complete until these pass:

```txt
contract gate passes
sample preflight runs
health reports all active systems
/audit creates preview HTML
/audit creates preview PNG
/audit includes source-vs-clone comparison
no template renderer returns
readyForFigmaTest only true when visual comparison is acceptable
plugin remains cloneModel-only
```

Health endpoint should include:

```json
{
  "contract": "cloneModel",
  "cloneMode": "layout-preserving-editable-clone",
  "visualModel": "screenshot-first-html-assisted-visual-model",
  "visualMatching": "dom-to-visual-foundation",
  "clonePreview": "html-png-preview-foundation",
  "visualComparison": "source-vs-clone-preview-sampling",
  "legacyActive": false
}
```

## Manual Figma Smoke Test Checklist

Only run this after automated audit is acceptable.

Check:

```txt
main frame is visually close to target website
screenshot reference is separate
header position matches source
hero position matches source
main image placement matches source
text hierarchy roughly matches source
footer is not invented or moved
text layers are editable
images are selectable/replaceable
section grouping is understandable
no generic template layout appears
```

## Large Batch Definition of Done

This batch is done only when:

```txt
server is modular
visualModel has coverage diagnostics
DOM-to-visual matching has better strategy metadata
clone preview and source comparison are in the audit route
sample preflight prints all important metrics
Figma renderer remains clone-only
regression suite exists
no old renderPlan/template path exists
```

## Expected Outcome

After this batch, TranslateIT should be much more structured and ready for deeper fidelity tuning.

The system should be able to answer this question before Figma import:

```txt
Does the generated editable clone visually resemble the source website enough to be worth testing in Figma?
```

If the answer is no, the audit must fail and explain why.

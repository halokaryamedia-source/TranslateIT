# TranslateIT Professional Development Plan

Public version:

```txt
Version 0.1 - Alpha
```

Active engine:

```txt
translateit-core / alpha-clean-1
```

Primary product direction:

```txt
Visual-first editable website clone for Figma.
```

Reference direction:

```txt
1. HTML-to-Figma Design
2. Screenshot-to-Figma
```

Core principle:

```txt
Screenshot-first, HTML-assisted, editable clone.
```

## 1. Product Goal

TranslateIT must convert a website URL into an editable Figma design that visually follows the original website as closely as possible.

The result must not become a new design, a generic template, or a raw DOM dump.

The expected result is:

```txt
website visual source
-> visual-first cloneModel
-> editable Figma layers
-> UI Library friendly structure
```

## 2. Non-Negotiable Acceptance Rule

The output must not be accepted if the UI is visually different from the target website.

Hard fail examples:

```txt
layout looks redesigned
hero/header/footer differs strongly from source
image position or crop differs strongly from source
section order changes
source visual hierarchy changes
output looks like a generic template
screenshot is used as the main final output
```

Structure can be system-managed and may differ from the raw DOM, but the visual result must follow the original website.

## 3. Development Strategy

TranslateIT development must be split into controlled milestones.

Each milestone must have:

```txt
clear objective
implementation scope
quality gate
manual test requirement
rollback condition
```

No milestone should be considered done only because the code runs. It is done only when the output is visually closer to the target website and passes the relevant gate.

## 4. Current Architecture Direction

The active architecture should be:

```txt
URL
-> Browser render
-> Screenshot capture
-> HTML/CSS/asset capture
-> Visual segmentation
-> DOM-to-visual matching
-> cleanSourceModel
-> cloneModel
-> clone fidelity audit
-> Figma renderer
-> editable clone output
```

The old direction must not return:

```txt
URL
-> text/image extraction
-> template hero/card/footer
-> hallucinated redesign
```

## 5. System Components

### 5.1 RenderBridge

Responsibility:

```txt
open the website
capture screenshot
capture DOM/CSS/assets
build visual and source models
build cloneModel
run fidelity audit
serve payload to plugin
```

RenderBridge must not create a template layout as the final output.

### 5.2 Capture Engine

Responsibility:

```txt
browser rendering
full-page screenshot
viewport size
page size
visible DOM elements
computed styles
image/SVG assets
z-index and stacking hints
parent-child hints
text direct/inner distinction
```

### 5.3 Visual Segmentation Engine

Responsibility:

```txt
detect visual blocks from screenshot
identify text regions
identify image regions
identify shape/background regions
identify containers/cards
identify buttons/icons
identify section boundaries
```

This is required because DOM alone cannot fully represent what the user sees.

### 5.4 DOM-to-Visual Matcher

Responsibility:

```txt
match DOM elements to visual blocks
use screenshot rect for visual position
use DOM text/CSS/assets for editability
resolve duplicate parent text
resolve pseudo-element/background issues
resolve object-fit image crop issues
```

### 5.5 Clone Model Builder

Responsibility:

```txt
create cloneModel as the main contract
preserve source geometry
preserve visual hierarchy
organize layers by UI sections
provide editable text/image/shape layers
include confidence and sourceReason when possible
```

### 5.6 Figma Plugin Renderer

Responsibility:

```txt
validate cloneModel
render section frames
render cloneModel.layers by source rect
scale coordinates proportionally
keep text editable
keep image layers selectable/replaceable
keep shapes editable
append screenshot reference separately
```

The Figma renderer must not decide layout or invent templates.

### 5.7 Fidelity Audit

Responsibility:

```txt
compare clone output readiness against source visual truth
fail if output is template-like or visually different
report actionable issues
block Figma testing when output is already wrong
```

## 6. Main Data Contracts

### 6.1 rawSourceModel

Browser capture data.

```txt
source URL
final URL
viewport
page dimensions
screenshot
raw DOM elements
computed styles
raw assets
parent-child relation
stacking hints
```

### 6.2 visualModel

Visual screenshot understanding.

```txt
visual blocks
text regions
image regions
background regions
container/card regions
button/icon regions
section boundaries
color samples
confidence scores
```

### 6.3 cleanSourceModel

Cleaned DOM + visual matching data.

```txt
hidden/noise removed
duplicates removed
parent aggregate text removed
visual blocks matched with DOM
styles normalized
assets mapped to visual blocks
```

### 6.4 cloneModel

Main payload contract for the plugin.

```json
{
  "mode": "layout-preserving-editable-clone",
  "visualTruth": "screenshot-first-html-assisted",
  "page": {},
  "sections": [],
  "layers": [],
  "assets": [],
  "tokens": {},
  "uiLibrary": {},
  "diagnostics": {}
}
```

The plugin must render from `cloneModel` only.

## 7. Milestone Roadmap

## Milestone 0 — Architecture Lock

Objective:

```txt
Freeze product direction and prevent wrong engine flow.
```

Scope:

```txt
ENGINE_FLOW_CHART.md
CODIA_STYLE_REFERENCE.md
VISUAL_FIRST_EDITABLE_CLONE_SPEC.md
DEVELOPMENT_PLAN.md
```

Quality gate:

```txt
No active document should describe template rebuild as the default output.
Default mode must be Editable Clone.
```

Status:

```txt
In progress / documentation locked.
```

## Milestone 1 — Contract Alignment

Objective:

```txt
Ensure the system uses cloneModel as the primary output contract.
```

Scope:

```txt
shared-contract.mjs
server.mjs
plugin/code.js
plugin/ui.html
tests/test-clean-contract.mjs
tests/test-sample-sites.mjs
```

Required behavior:

```txt
payload requires cloneModel
cloneModel.mode must be layout-preserving-editable-clone
renderPlan/template payloads must be rejected
health endpoint returns contract: cloneModel
plugin status reports layout-preserving editable clone
```

Quality gate:

```txt
npm test passes
contract test fails if template renderer returns
contract test fails if cloneModel is missing
```

Rollback condition:

```txt
If plugin still renders generic hero/card/footer templates, revert and block release.
```

## Milestone 2 — Geometry-Preserving Renderer

Objective:

```txt
Render source geometry into Figma without inventing layout.
```

Scope:

```txt
plugin/code.js
cloneModel renderer
section grouping
source coordinate scaling
image and text rendering
```

Required behavior:

```txt
section frames use source section bounds
layers use source rects
images retain source position and size
text retains source hierarchy and approximate size
screenshot reference is separate
```

Quality gate:

```txt
Output visually follows website source order and placement.
No template layout logic exists in plugin.
```

Manual review:

```txt
Compare main clone frame with screenshot reference in Figma.
Check header, hero, content, footer positions.
```

## Milestone 3 — Screenshot Visual Segmentation

Objective:

```txt
Use screenshot as visual truth, not only DOM geometry.
```

Scope:

```txt
visual segmentation module
visual block extraction
color surface detection
image region detection
text region detection
container/card detection
section boundary detection
```

Implementation direction:

```txt
start with geometric + color-block detection
add screenshot block segmentation
map large visible regions
identify likely text/image/shape blocks
```

Quality gate:

```txt
visualModel is generated for every capture
visual blocks cover major visible regions
sourceCoverageScore is reported
```

Rollback condition:

```txt
If segmentation creates noisy or random blocks, keep it diagnostic-only until stable.
```

## Milestone 4 — DOM-to-Visual Matching

Objective:

```txt
Combine HTML-to-Figma and Screenshot-to-Figma properly.
```

Scope:

```txt
DOM element matching
text similarity matching
rect overlap matching
asset matching
style matching
sourceReason/confidence metadata
```

Matching rules:

```txt
visual rect wins for position
DOM text wins for content
DOM CSS wins for editable style hint
screenshot crop wins for hard-to-map visual assets
```

Quality gate:

```txt
Most visible text/image layers have matched DOM or visual fallback.
No large visible region is ignored without a reason.
```

## Milestone 5 — Clone Fidelity Preview

Objective:

```txt
Catch bad output before manual Figma testing.
```

Scope:

```txt
render cloneModel to local HTML preview
capture preview screenshot
compare source screenshot vs clone preview
write visual diff report
```

Required metrics:

```txt
visualSimilarityScore
geometryPreservationScore
sectionOrderScore
imagePlacementScore
textPlacementScore
colorSimilarityScore
sourceCoverageScore
fabricatedLayoutRisk
```

Quality gate:

```txt
readyForFigmaTest only true when preview similarity passes.
```

Rollback condition:

```txt
If preview renderer differs from Figma renderer too much, use it as diagnostic only until aligned.
```

## Milestone 6 — UI Library Structuring

Objective:

```txt
Make the output manageable and designer-friendly without breaking visual fidelity.
```

Scope:

```txt
section grouping
role-based layer names
component-like grouping hints
text/image/background separation
layer cleanup
```

Expected layer structure:

```txt
01 Layout-Preserving Editable Clone
  Section / Header
  Section / Hero
  Section / Content
  Section / Footer
02 Screenshot Reference / Pure Source
```

Quality gate:

```txt
Layer names are clean.
Sections are understandable.
Text and images are editable.
No raw DOM dump in layer tree.
```

## Milestone 7 — Fidelity Tuning

Objective:

```txt
Improve visual closeness until target sites are acceptable.
```

Focus areas:

```txt
text wrapping
font fallback
line height
image crop/object-fit
background shape detection
SVG/icon handling
CSS transform handling
fixed/sticky header handling
responsive layout consistency
```

Quality gate:

```txt
Regression samples visually match source much better than previous build.
No accepted output may look like a redesign.
```

## Milestone 8 — Multi-Site Regression Suite

Objective:

```txt
Avoid hardcoding one sample website.
```

Required test categories:

```txt
portfolio site
company profile
landing page
blog/article page
image-heavy page
card/grid page
dark theme page
simple ecommerce/product page
mobile-responsive page
```

Regression output:

```txt
capture report
cloneModel report
preview diff report
Figma smoke status
known limitation notes
```

Quality gate:

```txt
No single-site hardcoded logic.
At least five site categories pass acceptable visual fidelity.
```

## Milestone 9 — Release Gate

Objective:

```txt
Prepare a stable Alpha release candidate.
```

Release must include:

```txt
single active engine
single active plugin renderer
single active bridge server
clear install/test command
fidelity report
known limitations
rollback plan
```

Release blocker examples:

```txt
template output returns
cloneModel missing
visual similarity gate absent
plugin uses screenshot as main output only
major target site visually fails
```

## 8. Quality Gates

Every development batch must pass:

```txt
contract gate
syntax gate
health gate
cloneModel gate
visual audit gate
sample site gate
manual Figma smoke gate when ready
```

Minimum report fields:

```txt
publicVersion
engine
engineBuild
contract
cloneMode
readyForFigmaTest
visualReadiness
visualSimilarityScore
geometryPreservationScore
sourceCoverageScore
fabricatedLayoutRisk
cloneModel diagnostics
failures
warnings
```

## 9. Testing Workflow

### Automated preflight

```txt
npm test
/health
/audit?url=sample
/render?url=sample
```

### Manual Figma smoke test

Only run manual test when:

```txt
readyForFigmaTest: true
contract: cloneModel
cloneMode: layout-preserving-editable-clone
fabricatedLayoutRisk: low
```

Manual check items:

```txt
Does it visually match the source screenshot?
Are header/hero/content/footer in correct positions?
Are images in correct crop/placement?
Is text editable?
Are images selectable?
Are sections grouped cleanly?
Is screenshot only reference?
```

## 10. Development Rules

Developers must follow these rules:

```txt
Do not reintroduce renderPlan template output.
Do not render generic hero/card/footer layouts in plugin.
Do not hardcode Mivubi or any sample site.
Do not call a visually different result successful.
Do not ask for Figma testing when preflight already shows a failure.
Do not prioritize clean structure over visual fidelity.
```

Allowed:

```txt
Use UI Library grouping for structure.
Use fallback layers when DOM data is incomplete.
Use cropped visual fallback for icons/pseudo-elements.
Use closest font fallback if exact font is unavailable.
Use screenshot comparison to guide fidelity tuning.
```

## 11. Roles and Responsibilities

### Engine

```txt
understand website visual truth
build cloneModel
run fidelity checks
protect against template hallucination
```

### Plugin

```txt
render cloneModel exactly
keep layers editable
organize by section
avoid layout decisions
```

### Test Suite

```txt
detect wrong contract
detect template regression
detect visual risk
detect missing cloneModel
detect legacy path
```

### Documentation

```txt
explain current direction
explain limitations
explain test commands
explain acceptance criteria
```

## 12. Known Technical Risks

```txt
text wrapping differences between browser and Figma
font availability mismatch
CSS transforms and animations
pseudo-elements not present in DOM
background images not mapped as assets
SVG and icon conversion
object-fit image crop
sticky/fixed elements
lazy-loaded images
canvas/WebGL content
cross-origin image restrictions
```

Each risk must have fallback behavior and test coverage.

## 13. Definition of Done

A milestone is done only when:

```txt
implementation matches this plan
contract is updated
tests are updated
preflight passes
output is visually closer to source
known limitations are documented
no template/hallucination regression exists
```

TranslateIT Alpha is acceptable only when:

```txt
visual output follows target website closely
text is editable
images are editable or replaceable
shapes/backgrounds are editable where possible
layer hierarchy is UI Library friendly
screenshot is reference only
clone fidelity audit passes
multiple site categories pass regression
single active engine remains clean
```

# TranslateIT Clean Engine Plan

Public version must remain:

```txt
Version 0.1 - Alpha
```

## Product Goal

TranslateIT should be a Figma plugin that accepts a website URL and generates a clean, editable, professional Figma reconstruction.

The output must be useful as a UI library / editable design structure, not just a technical DOM dump.

## Core User Requirement

```txt
Input: website URL
Output: clean editable Figma layout that visually makes sense, follows the source website, and is easy to edit.
```

The plugin must not produce a frame that technically imports but visually looks broken.

## No Hardcoded Website Rule

The engine must not be hardcoded for one website.

```txt
mivubi.com is only a sample/regression target.
It is not the product target.
It must not receive special-case layout logic.
```

Allowed:

```txt
Use mivubi.com as a recurring visual test case.
Use screenshots from mivubi.com to evaluate whether the general engine is improving.
Use mivubi.com to validate header/hero/content/footer handling.
```

Not allowed:

```txt
Hardcode Mivubi text.
Hardcode Mivubi image sizes.
Hardcode Mivubi section names.
Hardcode Mivubi colors as mandatory defaults.
Hardcode Mivubi footer layout.
Build logic that only works for mivubi.com.
```

## One Engine Rule

Only one active engine is allowed.

```txt
Engine: translateit-core
Engine build: alpha-clean-1
```

No active V4/V5/V5.3 engine naming should remain in the clean implementation.

Legacy-named files may exist in old branch history, but the clean branch must not rely on active legacy entrypoints.

## One Plugin Renderer Rule

Only one plugin renderer is allowed.

```txt
plugin/manifest.json
plugin/code.js
plugin/ui.html
```

No active alternate renderer files should be required for normal usage.

## Architecture

```txt
TranslateIT/
├─ plugin/
│  ├─ manifest.json
│  ├─ code.js
│  └─ ui.html
│
└─ RenderBridge/
   ├─ package.json
   ├─ server.mjs
   ├─ src/
   │  ├─ capture-site.mjs
   │  ├─ extract-layout.mjs
   │  ├─ build-design-model.mjs
   │  ├─ visual-audit.mjs
   │  └─ shared-contract.mjs
   ├─ tests/
   │  ├─ test-sample-sites.mjs
   │  └─ test-plugin-contract.mjs
   └─ reports/
```

## Single Contract

The bridge should return one clean contract:

```json
{
  "ok": true,
  "publicVersion": "Version 0.1 - Alpha",
  "engine": "translateit-core",
  "engineBuild": "alpha-clean-1",
  "source": {
    "url": "",
    "viewport": {},
    "screenshot": {}
  },
  "designModel": {
    "page": {},
    "sections": [],
    "elements": [],
    "assets": []
  }
}
```

The plugin must reject anything outside this contract.

## Design Model Philosophy

The engine must not simply draw every DOM element.

It must understand the page into clean editable UI structure:

```txt
page
section
container
text
image
button
card
navigation
footer link group
```

The output should be clean and editable, even if it is not pixel-perfect.

## Extraction Strategy

### 1. Capture

Capture:

```txt
full-page screenshot
viewport
page height
visible DOM rectangles
computed styles
text content
image assets
z-index/order hints
```

### 2. Understand

Classify elements into:

```txt
header
nav
hero
hero title
hero body
cta
main image
content section
card
gallery item
footer
noise/decorative
```

### 3. Clean

Remove or merge:

```txt
duplicate text
nested duplicate parent/child text
very small noise text
hidden/irrelevant elements
background boxes that do not define layout
uncontrolled overlays
```

### 4. Reconstruct

Build a Figma-friendly structure:

```txt
section frames
clean text layers
clipped image frames
buttons
cards
footer groups
layout tokens
spacing tokens
component-like layer names
```

## Visual Acceptance Criteria

A sample website passes only if:

```txt
header is readable
hero is readable
main image placement is logical
content/cards are structured
footer is readable
no major text overlap
no image blocks key text
layer names are clean
output is editable
screenshot source reference is separate
```

Visual report should include:

```txt
visualReadiness
layoutScore
overlapScore
imageScore
textScore
sectionScore
layerCleanlinessScore
```

Hard fail if:

```txt
major text overlap
image covers primary title/body
hero title not readable
footer unreadable
too many duplicate text layers
output looks like raw DOM dump
```

## Sample / Regression Targets

Mivubi is a sample target only:

```txt
https://www.mivubi.com/
```

Future sample targets should cover different layout types:

```txt
portfolio site
landing page
blog/article
agency/company site
e-commerce category/product page
dashboard-like page if publicly accessible
```

The engine should improve generally across these samples, not by special-casing each one.

## Development Stages

### Stage 0 — Freeze Old Patch Chain

Stop patching the old V5 experimental chain for visual quality.

### Stage 1 — Clean Branch

Create a clean implementation branch with one active engine and one plugin renderer.

### Stage 2 — Core Capture

Implement capture and save raw source data reports.

### Stage 3 — Design Model Builder

Convert raw source data into clean `designModel`.

### Stage 4 — Figma Renderer

Render only from `designModel`.

### Stage 5 — Visual Audit

Measure overlap, structure quality, image bounds, and layer cleanliness.

### Stage 6 — Sample Acceptance

Use sample sites including mivubi.com to evaluate general quality.

## Definition of Done

TranslateIT alpha-clean is usable when:

```txt
one active engine
one active plugin renderer
no active legacy dependency
URL import works
Figma output is clean and editable
visual report passes
sample outputs are visually acceptable
export package works
user does not need to debug basic flow
```

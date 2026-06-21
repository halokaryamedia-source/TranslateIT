# TranslateIT Codia-Style Reference

Public version:

```txt
Version 0.1 - Alpha
```

Active engine:

```txt
translateit-core / alpha-clean-1
```

## Why This Reference Matters

Codia-style reconstruction is a better reference for TranslateIT than a DOM-only website importer.

The desired direction is:

```txt
visual source -> editable design reconstruction
```

Not:

```txt
DOM data -> guessed template redesign
```

TranslateIT must treat the website screenshot as the visual truth. DOM data is supporting metadata, not the only source of truth.

## Product Standard

TranslateIT must produce a Figma output that is visually as close as possible to the target website.

Structure may be cleaned and reorganized into a UI Library hierarchy, but the visual result must not drift from the source.

```txt
Visual similarity: highest priority
Editable structure: second priority
Clean UI Library grouping: third priority
```

## Correct Philosophy

```txt
Screenshot-first, DOM-assisted, editable reconstruction.
```

This means:

```txt
1. Capture the actual rendered website screenshot.
2. Capture DOM geometry and styles as metadata.
3. Use screenshot as visual truth.
4. Use DOM as editable layer hints.
5. Build cloneModel from both sources.
6. Render editable Figma layers that visually match the screenshot.
```

## What TranslateIT Should Learn From Codia-Style Tools

### 1. Visual Structure Understanding

The engine must understand visible layout:

```txt
sections
grids
alignment
spacing
hierarchy
composition
containers
cards
buttons
text blocks
image regions
icons
background shapes
```

### 2. Editable Layer Reconstruction

The output must not be a flat image.

The output should reconstruct:

```txt
editable text layers
editable shape layers
editable image layers
editable button/container groups
clean section frames
named UI Library layer groups
```

### 3. Pixel-Fidelity First

The output must preserve:

```txt
source positions
source sizes
source spacing
source image crop
source colors
source typography scale
source section order
source visual rhythm
```

### 4. DOM Is Not Enough

DOM data can be incomplete, misleading, nested incorrectly, or visually different from the real render.

Examples:

```txt
parent innerText duplicates child text
CSS transforms shift visual position
pseudo-elements are missing from DOM extraction
backgrounds may not appear as DOM nodes
icons may be CSS or SVG masks
image crop may depend on object-fit
responsive layout may differ from DOM order
```

Therefore, DOM must be treated as metadata only.

## Required Engine Architecture

```txt
Website URL
-> Browser render
-> Full-page screenshot capture
-> DOM/style/asset capture
-> Visual segmentation model
-> DOM-to-visual matching
-> cloneModel builder
-> clone fidelity audit
-> Figma renderer
-> editable Figma clone
```

## Visual Segmentation Model

TranslateIT should create visual regions from screenshot + DOM:

```txt
visualBlocks[]
  id
  type: text | image | shape | icon | container | section
  rect
  color
  confidence
  matchedDomElementId
  assetId
```

This is different from raw DOM elements. A visual block represents what the user sees.

## DOM-to-Visual Matching

Each editable layer should be built from the best available source:

```txt
Text layer:
  visual rect from screenshot/DOM rect
  text content from DOM or OCR fallback
  font/style from computed CSS

Image layer:
  visual rect from screenshot
  image asset from DOM/captured image
  crop from visual rect/object-fit

Shape/background layer:
  visual rect from screenshot/DOM background
  color from screenshot sampling/computed CSS

Icon layer:
  SVG/vector when available
  image/vector fallback when not available
```

## cloneModel Requirement

`cloneModel` must represent the visual output, not a redesign plan.

```json
{
  "mode": "layout-preserving-editable-clone",
  "visualTruth": "screenshot-first-dom-assisted",
  "sections": [],
  "layers": [],
  "assets": [],
  "fidelity": {}
}
```

## Renderer Requirement

The Figma renderer must render from `cloneModel.layers` only.

The renderer must not:

```txt
create generic hero sections
create generic card grids
create generic footer columns
invent positions
invent spacing
invent layout
```

The renderer must:

```txt
scale source rects proportionally
preserve section order
preserve layer positions
preserve source image placement
preserve source text hierarchy
preserve visual composition
```

## Audit Requirement

The audit must reject output that looks clean but does not match the source.

Required checks:

```txt
visualSimilarityScore
geometryPreservationScore
sectionOrderScore
imagePlacementScore
textPlacementScore
colorSimilarityScore
sourceCoverageScore
editableLayerScore
rawNoiseScore
fabricatedLayoutRisk
```

Hard fail if:

```txt
fabricatedLayoutRisk is high
visualSimilarityScore is low
hero position differs strongly from screenshot
image positions differ strongly from screenshot
footer position differs strongly from screenshot
section order is changed
output looks like a template redesign
```

## Correct TranslateIT Output

```txt
01 Layout-Preserving Editable Clone
  Section / Header
  Section / Hero
  Section / Content
  Section / Footer
02 Screenshot Reference / Pure Source
```

The first frame must visually match the website.
The second frame exists only for comparison.

## Default Mode

Default mode must be:

```txt
Editable Clone
```

Optional future mode:

```txt
Clean Rebuild / Redesign
```

The optional rebuild mode must never replace the default clone mode.

## Definition of Done

TranslateIT is acceptable only when:

```txt
visual output closely matches the source website
text is editable
images are editable or replaceable
shapes/backgrounds are editable
layer tree is clean enough for UI Library editing
screenshot is not the main output
no template redesign is used as clone output
clone fidelity audit passes
```

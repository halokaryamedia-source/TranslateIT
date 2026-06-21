# TranslateIT Engine Flow Chart

Public version:

```txt
Version 0.1 - Alpha
```

Active engine:

```txt
translateit-core / alpha-clean-1
```

## Product Objective

TranslateIT must generate a **layout-preserving editable clone** of a website inside Figma.

The visual result must follow the target website as closely as possible. Structure can be cleaned and organized into a UI Library hierarchy, but the UI must not become a different design.

```txt
Correct:
Website source -> screenshot-first editable Figma clone that visually follows the source layout.

Wrong:
Website source -> extracted content -> new template/hallucinated layout.
```

The output must be:

```txt
visually close to the source website
editable in Figma
cleanly grouped like a UI Library
free from raw DOM noise
not a screenshot-only output
not a hallucinated redesign
```

## Core Principle

```txt
Screenshot-first, DOM-assisted.
Clone first, clean second.
```

This means the rendered screenshot is the visual truth. DOM data supports editability, text content, asset extraction, and style hints. Cleanup is allowed only to remove noise, duplicates, hidden elements, and unusable parent layers. Cleanup must not replace the source layout with a fabricated layout.

## High-Level Engine Flow

```mermaid
flowchart TD
  A[User enters website URL] --> B[RenderBridge opens website in browser]
  B --> C[Capture visual truth]
  C --> C1[Full-page screenshot]
  C --> C2[Viewport and page size]
  C --> C3[Visible DOM elements]
  C --> C4[Computed styles]
  C --> C5[Images and assets]
  C --> C6[Parent-child and stacking hints]
  C --> C7[Visual segmentation from screenshot]

  C1 --> D[Build Raw Source Model]
  C2 --> D
  C3 --> D
  C4 --> D
  C5 --> D
  C6 --> D
  C7 --> D

  D --> E[Clean Source Model]
  E --> E1[Remove hidden/noise elements]
  E --> E2[Remove parent aggregate text]
  E --> E3[Remove duplicate child text]
  E --> E4[Preserve real geometry]
  E --> E5[Preserve colors, spacing, image placement]
  E --> E6[Match DOM elements to visual blocks]

  E --> F[Build Clone Model]
  F --> F1[Section frames from source bounds]
  F --> F2[Layer rects from source geometry]
  F --> F3[Editable text layers]
  F --> F4[Clipped image layers]
  F --> F5[Shape/background layers]
  F --> F6[UI Library grouping metadata]

  F --> G[Clone Fidelity Audit]
  G --> G1[Structure quality]
  G --> G2[Geometry preservation]
  G --> G3[Similarity readiness]
  G --> G4[Overlap/noise check]
  G --> G5[No fabricated layout check]

  G --> H{Ready for Figma?}
  H -- No --> I[Fail report with actionable reasons]
  H -- Yes --> J[Plugin receives cloneModel]

  J --> K[Figma Renderer]
  K --> K1[Render source-preserving editable clone]
  K --> K2[Group layers into UI Library structure]
  K --> K3[Attach screenshot reference separately]

  K --> L[Final Figma Output]
```

## Codia-Style Reference Principle

Codia-style tools are useful as a product reference because the important workflow is:

```txt
static visual input -> visual structure understanding -> editable design layers
```

TranslateIT must apply the same philosophy to websites:

```txt
rendered website screenshot -> visual understanding -> editable Figma clone
```

DOM extraction alone is not enough. If DOM and screenshot disagree, the screenshot wins for visual placement.

## Correct Data Pipeline

The clean engine must follow this pipeline:

```txt
URL
-> captureSite()
-> screenshot + DOM/style/assets
-> visual segmentation
-> rawSourceModel
-> cleanSourceModel
-> cloneModel
-> cloneFidelityAudit
-> plugin renderer
-> Figma editable clone
```

It must not follow this pipeline:

```txt
URL
-> extract content
-> choose generic hero/card/footer template
-> render new page layout
```

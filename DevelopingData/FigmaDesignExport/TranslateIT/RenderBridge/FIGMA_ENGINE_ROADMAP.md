# TranslateIT Figma Engine Roadmap

## Goal

Make Figma output usable, editable, and reviewable before manual Figma testing.

## Added engines

### Yoga Layout Adapter

Dependency: `yoga-layout`

Module:

```txt
src/figma-auto-layout-engine.mjs
```

Purpose:

```txt
Infer row/column/absolute section layout before Figma rendering.
```

### Sharp Image Adapter

Dependency: `sharp`

Module:

```txt
src/image-asset-processing-engine.mjs
```

Purpose:

```txt
Prepare image asset resize/crop/size checks before Figma import.
```

### Pixelmatch Visual Compare Adapter

Dependencies: `pixelmatch`, `pngjs`

Module:

```txt
src/visual-compare-engine.mjs
```

Purpose:

```txt
Compare source screenshot and generated preview image with a measurable score.
```

### Font Metric Adapter

Dependency: `opentype.js`

Module:

```txt
src/font-metric-engine.mjs
```

Purpose:

```txt
Prepare future text sizing and font metric correction.
```

## New gate

```txt
tests/test-figma-support-engines.mjs
```

It checks:

```txt
figmaRenderPlan
figmaAutoLayoutPlan
imageAssetProcessingPlan
visualComparePlan
fontMetricPlan
```

## Audit flow

```txt
imports
external-engine-readiness
framework-contract
blueprint-framework-output
figma-support-engines
engine-pipeline-readiness
engine-preview-page
```

## Next implementation phases

```txt
Phase 1: all engine plans pass without manual Figma test
Phase 2: renderer reads figmaRenderPlan only
Phase 3: apply safe Figma Auto Layout to inferred groups
Phase 4: generate preview image and run pixelmatch score
Phase 5: improve font metrics with local font config
```

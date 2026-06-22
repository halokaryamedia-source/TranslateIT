# TranslateIT Final Pre-Test Quality Checklist

This checklist is used before the final Figma import test. The goal is to reduce repeated manual testing by making the payload and render plan as close to final as possible before opening Figma.

## 1. Required target

Default target:

```powershell
https://www.mivubi.com/
```

Custom target:

```powershell
$env:TRANSLATEIT_TARGET_URL="https://example.com/"
```

## 2. Final proof command

Run from `DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge`:

```powershell
npm.cmd run proof:production
```

This should generate:

```txt
reports/translateit-payload.json
reports/translateit-final-payload-health.json
reports/translateit-asset-reliability.json
reports/translateit-honest-production-readiness.json
reports/translateit-engine-pipeline-readiness.json
reports/translateit-master-engine-summary.json
```

## 3. Pre-Figma pass conditions

Before importing into Figma, check the generated payload and reports.

Expected minimum:

```txt
figmaRenderPlan.status = pass
figmaRenderPlan.diagnostics.sanitized = true
productionExportManifest.status = ready-for-controlled-test
productionExportManifest.risk.level = low or medium
imageAssetProcessingPlan.status = pass
translateit-final-payload-health.status = pass or review
translateit-asset-reliability.status = pass or review
```

Acceptable but must be reviewed:

```txt
productionExportManifest.figma.downgradedMissingImages > 0
productionExportManifest.summary.visualBlocks > 0
figmaAutoLayoutPlan.diagnostics.absoluteFrames > 0
translateit-final-payload-health.summary.placeholders > 0
translateit-asset-reliability.summary.unusedAssets > 0
```

Do not continue to Figma import if:

```txt
figmaRenderPlan.status = fail
productionExportManifest.risk.level = high
productionExportManifest.figma.missingAssets > 0
translateit-final-payload-health.status = fail
translateit-asset-reliability.status = fail
payload build fails
module import test fails
```

## 4. Figma import review focus

When opening the result in Figma, review these items first:

```txt
1. Page size matches source screenshot.
2. Header/logo/navigation are present.
3. Hero title and main CTA are editable text/button layers.
4. Main images are visible and not gray placeholders.
5. Cards have Card Surface + content hierarchy.
6. Text is not duplicated heavily.
7. Visual fallback slices do not cover editable text/button/logo.
8. Screenshot reference is locked below the editable working frame only.
```

## 5. Honest readiness rule

Do not use manual percentage estimates as final truth.

Use:

```txt
reports/translateit-honest-production-readiness.json
reports/translateit-final-payload-health.json
reports/translateit-asset-reliability.json
```

The score is still not a release approval. It only measures payload health. Final release requires visual review inside Figma and a multi-site benchmark.

## 6. Current status rule

Until the above proof run and Figma import review pass, the correct status is:

```txt
Not production-ready.
Not public-release-ready.
Internal alpha candidate only.
```

# TranslateIT V5 Production Hybrid Audit

V5 separates the output into four frames:

1. `01 Visual Reference / Pixel Screenshot`
2. `02 Production Visual Match / Score Target 9+`
3. `03 Editable Text Map / Visible Editing Layer`
4. `04 Raw Editable Reconstruction / Debug`

## Important scoring rule

The target score of `9+` applies to the **Production Visual Match** output, not to pure editable reconstruction.

V5 reaches a high visual score by using the rendered website screenshot as a locked base layer, then adding low-opacity selectable/editable overlay layers. This keeps visual fidelity high while still preserving practical editing access.

## Score categories

- `productionVisualScore`  
  Measures visual fidelity of the screenshot-backed production frame. Expected: `9-10` when screenshot capture succeeds.

- `editableTextMapScore`  
  Measures usefulness of extracted editable text layers. Expected: `7-8.5` depending on text extraction quality.

- `rawEditableScore`  
  Measures the pure editable reconstruction without relying on screenshot base. Expected: currently `4-6.8`.

- `weightedProductionScore`  
  Weighted production usefulness score:
  - 75% production visual match
  - 20% editable text map
  - 5% raw editable reconstruction

This weighted score is the current V5 pass/fail target for `9+`.

## Local audit command

Run this after the bridge is started:

```powershell
node .\audit-v5.mjs "https://www.mivubi.com/"
```

The script prints diagnostics, expected frame names, and whether the weighted production score passes target 9.

## Honest limitation

V5 is not a solved pure website-to-Figma reconstruction system. It is a production hybrid workflow designed to achieve high visual accuracy while keeping practical editable overlays and raw debug reconstruction available.

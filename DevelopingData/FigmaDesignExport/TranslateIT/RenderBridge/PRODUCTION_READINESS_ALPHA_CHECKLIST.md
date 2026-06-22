# TranslateIT Production Readiness Alpha Checklist

## Release Target

TranslateIT Version 0.1 Alpha can be treated as a **Production-Ready Alpha Candidate** only for this workflow:

```txt
Visual-Backed Editable Clone
```

This does **not** mean pure native website-to-Figma reconstruction is complete.

## Required Command

Run this command before any production alpha review:

```powershell
$R='D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1'
cd $R
git fetch origin
git checkout translateit-clean-engine
git pull --ff-only origin translateit-clean-engine
powershell -ExecutionPolicy Bypass -File "$R\DevelopingData\FigmaDesignExport\TranslateIT\RenderBridge\run-production-readiness-audit.ps1"
```

## Required Output Files

The ZIP must include:

- `reports/translateit-production-readiness.json`
- `reports/translateit-self-audit-review.html`
- `reports/translateit-self-audit-readiness.json`
- `reports/translateit-professional-gate-report.json`
- `reports/translateit-professional-layer-tree.json`
- `reports/translateit-source-size-frame-parity.json`
- `reports/translateit-figma-sim-main-latest.png`
- `reports/translateit-figma-sim-main-diff-latest.png`

## Required Verdict

Production alpha review is allowed only when:

```txt
translateit-production-readiness.json
alphaCandidate = true
```

Best possible verdict:

```txt
Production-Ready Alpha Candidate
```

Acceptable but not final:

```txt
Alpha Reviewable
```

Blocked:

```txt
Not Ready
```

## Required Gates

All required exit codes should be 0:

- health
- imports
- contract
- v2-markers
- mivubi-sample
- figma-dry-run
- figma-sim-preview
- source-size-parity
- regression
- review-dashboard
- professional-gate-report
- professional-layer-tree
- production-readiness

## Product Truth

The alpha output is intentionally visual-backed:

```txt
01 Visual-Backed Editable Clone
├─ Visual Backing / Source Screenshot
└─ Editable Reconstruction / Low Opacity
   ├─ professional sections
   ├─ grouped editable layers
   └─ semantic layer names
```

The source screenshot is the visual truth. Editable reconstruction is useful and organized, but pure native editability remains a later milestone.

## Manual Figma Review Rules

Manual Figma review is allowed only after:

- readiness says manual Figma is allowed;
- production readiness has no blockers;
- source-size parity passes;
- professional layer tree passes;
- visual risk is low;
- layer naming score is high enough;
- image load quality is acceptable.

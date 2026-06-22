# TranslateIT Final Professional Audit

Use this only when the project is ready for a final local pre-Figma check.

## Primary Command

```powershell
$R='D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1'
cd $R
git fetch origin
git checkout translateit-clean-engine
git pull --ff-only origin translateit-clean-engine
powershell -ExecutionPolicy Bypass -File "$R\DevelopingData\FigmaDesignExport\TranslateIT\RenderBridge\run-final-professional-audit-pack.ps1"
```

## What This Runs

The final wrapper runs the normal local self-audit pack and then adds the professional gate report.

Important gates:

- `health`
- `imports`
- `contract`
- `v2-markers`
- `mivubi-sample`
- `figma-dry-run`
- `figma-sim-preview`
- `source-size-parity`
- `regression`
- `review-dashboard`
- `professional-gate-report`

## Main Files in the ZIP

- `reports/translateit-self-audit-review.html`
- `reports/translateit-self-audit-readiness.json`
- `reports/translateit-professional-gate-report.json`
- `reports/translateit-source-size-frame-parity.json`
- `reports/translateit-figma-sim-main-latest.png`
- `reports/translateit-figma-sim-main-diff-latest.png`
- `reports/translateit-figma-sim-preview-latest.png`

## Manual Figma Rule

Do not open Figma for manual testing unless:

```txt
reports/translateit-self-audit-readiness.json
manualFigmaAllowed = true
```

or the review dashboard clearly says:

```txt
Manual Figma Allowed
```

## Product Truth for Version 0.1 - Alpha

TranslateIT Alpha is currently a:

```txt
Visual-Backed Editable Clone
```

That means:

- visual fidelity comes from a locked source screenshot backing layer;
- editable reconstruction layers are still generated;
- editable layers are grouped in a low-opacity overlay;
- native editable reconstruction is still an improvement phase, not the default promise.

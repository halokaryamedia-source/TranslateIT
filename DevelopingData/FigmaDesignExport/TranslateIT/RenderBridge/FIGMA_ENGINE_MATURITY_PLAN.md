# Figma Engine Maturity Plan

## Honest rule

Do not run manual Figma testing until maturity gate says it is allowed.

```txt
manualFigmaTestAllowed = true
```

## Current goal

Prepare the Figma engine professionally before testing visual output manually.

## Maturity stages

### P0 Parser Ready

Requirement:

```txt
External visual parser ready
Visual intent has useful regions
```

### P1 Layout Intent Ready

Requirement:

```txt
Header, hero, content, footer intent can be classified
Layout blockers are zero
```

### P2 Figma Render Plan Ready

Requirement:

```txt
figmaRenderPlan exists
render frames are not empty
editable text/image layers are enough
missing assets are zero
```

### P3 Support Engines Ready

Requirement:

```txt
Auto layout plan ready
Image asset plan ready
Visual compare plan ready
Font metric plan ready or safely non-blocking
```

### P4 Renderer Contract Ready

Requirement:

```txt
Plugin renderer reads figmaRenderPlan
No screenshot inside working frame
Screenshot only locked as reference below
Radius, opacity, fills, text size are sanitized
```

### P5 Manual Figma Test Allowed

Requirement:

```txt
P0 to P4 pass
translateit-figma-engine-maturity.json says manualFigmaTestAllowed=true
```

## Reports to trust

```txt
reports/translateit-figma-engine-maturity.json
reports/translateit-figma-support-engines.json
reports/translateit-engine-pipeline-readiness.json
```

## Definition of Done before Figma test

```txt
imports=0
framework-contract=0
blueprint-framework-output=0
figma-support-engines=0
figma-engine-maturity=0
engine-pipeline-readiness=0
```

## Not ready means

If any of these fail, continue engine work. Do not manually test Figma yet.

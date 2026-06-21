# TranslateIT Version 0.1 - Alpha — Figma Validation Protocol for 9+ Target

## Purpose

This protocol is required before claiming professional-ready, 8+, or 9+ quality.

Local audits, semantic previews, and layout simulation are useful, but they are not enough. The actual imported Figma canvas must be reviewed visually.

## Current pre-Figma ceiling

```txt
Maximum honest pre-Figma score: around 7.8 / 10
```

Reason:

```txt
The final quality depends on the imported Figma canvas, not only payload structure.
```

## Required Figma validation steps

### 1. Import validation

- Import one website payload into Figma.
- Confirm plugin completes without error.
- Confirm the output creates these frames:
  - 01 Screenshot Preview / Pure Reference
  - 02 Rebuild Plan / AI Interpretation
  - 03 UI Components / Structured Library
  - 04 Editable Result / Clean Structured Draft
  - 05 Audit / Design Clone Notes

### 2. Screenshot reference validation

- Screenshot frame must be pure image only.
- No overlay markers.
- No debug boxes.
- No cropped top section.
- No stretched distortion.

### 3. Rebuild plan validation

- Section blueprint cards must be readable.
- templateIntent must be clear.
- suggestedLayout must be useful.
- density and overflow risk must be understandable.
- priorityText must match important source content.

### 4. UI Library validation

Score this page from 1–10:

- token groups are easy to scan
- color tokens look clean
- typography tokens are readable
- spacing/radius tokens are useful
- component blueprints feel professional
- cards/navigation/media components are not messy
- zoomed-out layout still looks organized

### 5. Editable draft validation

Score this page from 1–10:

- hero section feels intentional
- typography hierarchy is clear
- spacing rhythm is clean
- cards look reusable
- content sections do not overlap
- long content is safely truncated
- media placeholders/images feel balanced
- result does not feel like raw DOM output

### 6. Multi-site validation

Repeat validation on at least 3 different websites:

```txt
1. MIVUBI or primary target website
2. A visual/product/content-heavy website
3. A simple corporate/landing website
```

## Score unlock rules

```txt
7.8 max:
Allowed only from pre-Figma audits.

8.0+:
Allowed after one successful Figma import with no major layout break.

8.5+:
Allowed after UI Library and Editable Draft both score 8+ visually.

9.0+:
Allowed only after 3 websites pass visual review and repeated fixes are applied.
```

## Fail conditions

Do not claim 8+ or 9+ if:

- Figma import has not been reviewed
- editable draft overlaps
- UI Library is messy when zoomed out
- text is unreadable or cramped
- screenshot reference is not pure
- only one website was tested
- fixes were not applied after review

## Validation record template

```txt
Website:
Date:
Plugin version: Version 0.1 - Alpha

Import success: yes/no
Screenshot reference score: /10
Rebuild plan score: /10
UI Library score: /10
Editable draft score: /10
Audit usefulness score: /10

Major issues:
- 

Fixes required:
- 

Final visual score:
```

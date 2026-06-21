# TranslateIT V11.1 Post-Import Figma Checklist

Use this checklist after importing a website into Figma.

This checklist is required because payload audit alone is not enough. The final quality must be checked visually in the Figma canvas.

## Required frame order

The import must create these frames in order:

1. `01 Screenshot Preview / Pure Reference`
2. `02 Rebuild Plan / AI Interpretation`
3. `03 UI Components / Structured Library`
4. `04 Editable Result / Clean Structured Draft`
5. `05 Audit / Design Clone Notes`

## 01 Screenshot Preview

Pass if:

- Contains one screenshot reference only.
- No editable overlay layers.
- No random rectangles/text layers on top.
- Screenshot looks visually complete.

Fail if:

- It contains extracted layers mixed with screenshot.
- Screenshot is cropped incorrectly.
- Screenshot is missing major page areas.

## 02 Rebuild Plan

Pass if:

- Section cards are readable.
- Intent names are useful.
- Responsive notes are visible.
- Section count roughly matches the real page.

Fail if:

- Rebuild plan is empty.
- Section cards are repetitive and meaningless.
- Intent labels are clearly wrong.

## 03 UI Components / Structured Library

Pass if:

- Library is visually clean and grid-based.
- Groups are clearly separated.
- Color Tokens are readable.
- Typography Tokens are readable.
- Spacing Tokens are visible.
- Button variants exist.
- Navigation components exist.
- Card components exist.
- Media/Section components are not chaotic.

Fail if:

- Components are tiny fragments from the website.
- Items overlap.
- Cards are unreadable.
- Grid spacing is inconsistent.
- Library looks like raw DOM extraction.

## 04 Editable Result / Clean Structured Draft

Pass if:

- Sections are clean vertical blocks.
- Text is editable and readable.
- Images/media are separated clearly.
- The draft can be used as a starting point for design work.

Fail if:

- Text overlaps.
- Media blocks overlap.
- Sections are too compressed.
- Layout looks random.
- Result is less useful than rebuilding manually.

## 05 Audit / Design Clone Notes

Pass if:

- Diagnostics are visible.
- Known limitations are visible.
- It does not claim professional-ready without visual validation.

Fail if:

- Audit is overly positive.
- Missing tokens/components are hidden.
- There is no honest limitation note.

## Scoring guide

Use this manual score after visual review:

- `0–4`: not usable
- `5–6`: early usable prototype
- `7`: usable prototype
- `8`: good internal tool
- `9`: professional-ready design clone
- `10`: near-production quality

## Current honest target

For V11.1, the realistic target is:

```txt
7/10 usable prototype
```

Do not claim 9/10 until:

- UI Library is clean in Figma.
- Editable Result is readable.
- Rebuild Plan is meaningful.
- Multiple websites pass the same checklist.

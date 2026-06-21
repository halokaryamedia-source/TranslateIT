# TranslateIT V10 Rebuild Plan Workflow

This plan extends V9 Clean Useful Output using a Same.new-like reconstruction flow.

## Core workflow

Instead of immediately dumping extracted browser layers into Figma, the system should follow this order:

1. Capture target visual reference.
2. Extract DOM and visual signals.
3. Interpret the page into a rebuild plan.
4. Generate a clean component library.
5. Generate a clean editable result from the plan.
6. Audit usefulness and structure.

## Required frame order

1. `01 Screenshot Preview / Pure Reference`
   - One screenshot rectangle only.
   - No overlay.
   - No editable child layers.

2. `02 Rebuild Plan / AI Interpretation`
   - Page summary.
   - Section list.
   - Component intent.
   - Detected tokens.
   - Rebuild confidence notes.

3. `03 UI Components / Clean Editable Library`
   - Color token components.
   - Typography components.
   - Navigation components.
   - Button/CTA components.
   - Media components.
   - Section components.

4. `04 Editable Result / Clean Structured Draft`
   - Clean rebuilt sections.
   - Editable text.
   - Editable images.
   - No raw coordinate dump.

5. `05 Audit / Score and Usefulness Notes`
   - Visual reference score.
   - Layout understanding score.
   - Editable usefulness score.
   - Library readiness score.
   - Known limitations.

## Why this is better

The previous approach tried to recreate the website directly from browser coordinates. That produced chaotic output.

V10 should behave more like a professional AI reconstruction system:

- understand first,
- plan second,
- rebuild third,
- audit last.

## Failure rules

The output fails if:

- The screenshot preview contains extra layers.
- Component library contains tiny raw browser-position fragments.
- Editable result is visually chaotic.
- The rebuild plan is missing.
- The audit passes only because the screenshot looks good.

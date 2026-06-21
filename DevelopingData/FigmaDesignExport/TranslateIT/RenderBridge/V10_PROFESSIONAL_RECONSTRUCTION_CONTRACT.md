# TranslateIT Professional Reconstruction Contract

This contract defines the direction after reviewing references such as Same.new-style URL reconstruction workflows and Codia-style visual struct/editable reconstruction workflows.

## What we are adopting

The public concepts we can safely adopt are:

1. URL or screenshot input should become a structured editable result.
2. Visual fidelity alone is not enough.
3. The system must extract visual hierarchy, sections, layout intent, text, images, colors, and component candidates.
4. The output must be useful for design work, not just visually similar.
5. Every output should have a clear review/audit layer.

## What we are not claiming

We are not copying or claiming access to proprietary Same.new or Codia AI internal models, prompts, training data, algorithms, or private APIs.

## TranslateIT V9/V10 output contract

The output must stay in this order:

1. `01 Screenshot Preview / Pure Reference`
   - One screenshot rectangle only.
   - No editable overlay.
   - No child layers other than the screenshot reference.

2. `02 UI Components / Clean Editable Library`
   - Clean generated Figma components.
   - Color tokens.
   - Typography tokens.
   - Navigation items.
   - Button/CTA components.
   - Media components.
   - Section components.

3. `03 Editable Result / Clean Structured Draft`
   - Clean editable draft.
   - Vertical section blocks.
   - Editable text and image placeholders.
   - No raw browser-coordinate dump.

4. `04 Audit / Score and Usefulness Notes`
   - Diagnostics.
   - Known limitations.
   - Useful-output score.

## Strict failure rules

The output fails if:

- The screenshot preview contains overlay layers.
- The component library is mostly raw website coordinates.
- The editable result is unreadable or chaotic.
- The final score is high only because of screenshot similarity.
- The lowest score category is below the target threshold.

## Professional audit categories

`audit-v10-professional.mjs` checks:

- visual reference availability
- layout understanding
- editable layer coverage
- design system coverage
- workflow/output contract compliance

The final score is the lowest category score, not an average.

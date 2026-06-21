# TranslateIT V11 Design Clone Architecture

## Scope correction

TranslateIT stays focused on **Design Clone** only.

The goal is not to generate production code or full-stack apps. Code can be created separately later because every project may need a different framework, interaction model, backend, animation system, and deployment target.

## Main goal

```txt
Website / screenshot / visual reference
→ visual understanding
→ rebuild plan
→ clean Figma component library
→ clean editable design draft
→ audit
```

## What we learn from Same.new-style workflows

We only adopt the workflow idea:

1. The system receives a URL or visual reference.
2. The system studies the visual target.
3. The system creates an interpretation/rebuild plan.
4. The system creates a cleaner editable result.
5. The user can iterate further.

We do **not** copy Same.new proprietary internals, code generation system, models, prompts, private APIs, or deployment workflows.

## TranslateIT V11 output order

1. `01 Screenshot Preview / Pure Reference`
   - One screenshot rectangle only.
   - No overlay.
   - No editable child layers.

2. `02 Rebuild Plan / AI Interpretation`
   - Page summary.
   - Section list.
   - Component intent.
   - Layout interpretation.
   - Token summary.
   - Known uncertainties.

3. `03 UI Components / Clean Editable Library`
   - Color tokens.
   - Typography tokens.
   - Navigation components.
   - Button/CTA components.
   - Card/media components.
   - Section components.

4. `04 Editable Result / Clean Structured Draft`
   - Clean rebuilt design draft.
   - Editable text.
   - Editable images/placeholders.
   - Section-based vertical composition.
   - No raw browser-coordinate dump.

5. `05 Audit / Score and Usefulness Notes`
   - Screenshot purity check.
   - Component library usefulness.
   - Editable result usefulness.
   - Content coverage.
   - Known limitations.

## Design Clone pipeline

```txt
URL
→ Browser Render Capture
→ Screenshot
→ Visual/DOM Signal Extraction
→ Section Detection
→ Component Candidate Detection
→ Rebuild Plan
→ Figma Component Library
→ Editable Design Draft
→ Audit
```

## Rebuild Plan schema

```json
{
  "title": "Website title",
  "url": "https://example.com",
  "summary": "Short design summary",
  "sections": [
    {
      "name": "Header",
      "intent": "navigation",
      "layout": "horizontal nav",
      "components": ["logo", "nav item", "cta"],
      "confidence": 0.8
    },
    {
      "name": "Hero",
      "intent": "landing hero",
      "layout": "two column image/text",
      "components": ["headline", "body", "image", "cta"],
      "confidence": 0.75
    }
  ],
  "tokens": {
    "colors": [],
    "typography": [],
    "spacing": []
  },
  "assets": [],
  "uncertainties": []
}
```

## Failure rules

The output fails if:

- The screenshot preview contains extra layers.
- The component library contains tiny raw browser-position fragments.
- The editable result is unreadable or chaotic.
- The rebuild plan is missing.
- The audit passes only because the screenshot looks good.
- The design clone depends on generated website code to be useful.

## Next implementation steps

### V11.1 Rebuild Plan Frame

Add `02 Rebuild Plan / AI Interpretation` into the Figma output.

### V11.2 Better Component Library

Improve generated Figma components so they look like a practical design system, not extracted fragments.

### V11.3 Better Editable Draft

Build clean vertical sections based on the rebuild plan.

### V11.4 Strict Design Audit

Audit must measure design usefulness, not code readiness.

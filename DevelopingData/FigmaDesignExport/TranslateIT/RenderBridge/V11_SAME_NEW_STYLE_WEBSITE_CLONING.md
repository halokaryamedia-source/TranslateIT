# TranslateIT V11 Same.new-Style Website Cloning Architecture

## Why this exists

Same.new-style tools do not only clone a website visually. The useful workflow is closer to:

1. User gives a URL, screenshot, or prompt.
2. System reads the target visual and structure.
3. System interprets the page into sections and components.
4. System generates an editable design/library.
5. System generates runnable website code.
6. User can iterate with follow-up prompts.

TranslateIT currently focuses on the design/Figma side. V11 expands the direction into a dual-output workflow.

## V11 output modes

### A. Design Clone Mode

Target output:

1. `01 Screenshot Preview / Pure Reference`
2. `02 Rebuild Plan / AI Interpretation`
3. `03 UI Components / Clean Editable Library`
4. `04 Editable Result / Clean Structured Draft`
5. `05 Audit / Score and Usefulness Notes`

Purpose:

- Figma-friendly editable library.
- Clean design system components.
- Useful editable draft.
- No raw coordinate dump.

### B. Code Clone Mode

Target output:

1. `project.json`
2. `index.html`
3. `src/App.jsx` or `src/App.tsx`
4. `src/styles.css`
5. `src/components/*`
6. `assets/*`
7. `README.md`

Purpose:

- Runnable website clone scaffold.
- Clean sections and components.
- Extracted text and media.
- Reasonable CSS tokens.
- Developer-editable code.

## Shared pipeline

The same render payload should feed both design and code outputs.

```txt
URL
→ Browser Render Capture
→ Screenshot
→ Visual/DOM Layer Extraction
→ Section Detection
→ Component Detection
→ Rebuild Plan
→ Design Clone Output
→ Code Clone Output
→ Audit
```

## Rebuild Plan schema

```json
{
  "title": "Website title",
  "url": "https://example.com",
  "sections": [
    {
      "name": "Header",
      "intent": "navigation",
      "layout": "horizontal nav",
      "components": ["logo", "nav item", "cta"]
    },
    {
      "name": "Hero",
      "intent": "landing hero",
      "layout": "two column image/text",
      "components": ["headline", "body", "image", "cta"]
    }
  ],
  "tokens": {
    "colors": [],
    "typography": [],
    "spacing": []
  },
  "assets": [],
  "confidence": {
    "visual": 0,
    "structure": 0,
    "codeReadiness": 0
  }
}
```

## Code generation principles

The code output must avoid dumping browser coordinates. It should generate meaningful sections:

```txt
Header
Hero
FeatureGrid
CardGrid
Gallery
Footer
```

Generated code should prefer:

- semantic HTML
- reusable components
- CSS variables for tokens
- local assets folder
- responsive layout defaults
- readable class names

## Failure rules

The output fails if:

- It only screenshots the website.
- It only dumps absolute browser coordinates.
- It generates one giant HTML blob with no component structure.
- Design and code outputs disagree on section/component names.
- Code cannot be understood or edited by a developer.

## Implementation stages

### V11.1 Rebuild Plan Generator

Add a generated `rebuildPlan` field into RenderBridge payload.

### V11.2 Code Package Generator

Create a script that transforms payload + rebuildPlan into:

- HTML
- CSS
- components
- assets

### V11.3 Figma UI Integration

Add export options:

- Export Figma package
- Export Code Clone package
- Export Full Clone package

### V11.4 Prompt Iteration Layer

Allow user instructions such as:

- make it more modern
- simplify the hero
- convert to dashboard layout
- replace brand colors
- create mobile version

## Honest limitation

This architecture is inspired by the public idea of Same.new-style website cloning, but it does not copy Same.new proprietary internal systems, models, prompts, training data, or private APIs.

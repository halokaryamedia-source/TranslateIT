# Production Safe Renderer Variant

File:

```txt
plugin/code-framework-production.js
```

Purpose:

```txt
This renderer is a production-safe variant for final pre-test imports. It is designed to continue rendering when individual layers have issues, and to place responsive variants beside the desktop editable frame when `payload.responsiveRenderPlan` exists.
```

Main behavior:

```txt
- Layer-level safe rendering.
- Neutral shape fallback when an image or layer cannot render.
- Import summary stored in plugin data.
- Desktop editable frame rendered first.
- Responsive variants rendered to the right side when available.
- Export package includes import summary.
```

Current status:

```txt
This is not the default plugin entry yet. Use it as a controlled renderer candidate after the payload pretest reports are acceptable.
```

Switching note:

```txt
To use this renderer, point the Figma plugin manifest/main code reference to `code-framework-production.js`, or copy this file over the current framework renderer only for a controlled test pass.
```

Honest limitation:

```txt
This renderer improves import resilience, but it does not prove visual fidelity by itself. Final quality still requires Figma import review and visual comparison.
```

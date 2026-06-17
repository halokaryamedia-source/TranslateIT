# TranslateIT DesignPreview

Preview-only UI library and template area for TranslateIT desktop design review.

## Purpose

This folder is for HTML/CSS/SVG design review only. It is not the final Tauri launcher UI and should not be treated as app runtime validation.

## Locked visual direction

- Main Page: v28
- Audio Settings: v22
- Translate Settings: v14
- Developer Settings: v37
- Do not use Main Page v29.

## Files

```text
DesignPreview/
├─ index.html
├─ ui-tokens.css
├─ ui-components.css
├─ ui-templates.css
├─ icons.svg
└─ README.md
```

## Review workflow

1. Open `index.html` for visual review.
2. Review MainPage, Settings pages, account card, logo, and icon-only button alignment.
3. After approval, move the approved structure/style into the Tauri app files.
4. Do not sync this preview into the app automatically before approval.

## Rules

- No image assets for icons.
- Icons are provided through `icons.svg`.
- Keep the UI dark, clean, premium, and not overly colorful.
- Use indicator colors only where needed:
  - Green: ready/success
  - Blue: active/info
  - Amber: warning/wait/fallback
  - Red: disabled/off/error

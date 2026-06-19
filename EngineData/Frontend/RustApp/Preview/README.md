# TranslateIT DesignPreview

Preview-only UI library and template area for TranslateIT desktop design review.

## Purpose

This folder is for HTML/CSS/SVG design review only. It is separate from the final Tauri launcher UI and separate from runtime validation.

## Locked visual direction

- Main Page: v28.1 clean composition
- Audio Settings: v22
- Translate Settings: v14
- Developer Settings: v37
- Main Page v29 is not part of the current locked reference.

## Files

```text
Preview/
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
3. After approval, move the approved structure and style into the Tauri app files.
4. Preview approval happens before production integration.

## Main Page v28.1 updates

- The topbar now uses `ID > EN` plus a local status chip.
- The main hero area is cleaner and no longer shows the old recording notice block.
- Composer actions now place the send arrow before the microphone action.
- Status cards are preview-only and do not claim runtime validation.

## Rules

- Icons are provided through `icons.svg`.
- Keep the UI dark, clean, premium, and not overly colorful.
- Use indicator colors only where needed:
  - Green: ready/success
  - Blue: active/info
  - Amber: warning/wait/fallback
  - Red: disabled/off/error

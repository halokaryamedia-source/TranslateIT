# TranslateIT DesignPreview

Status: design-review source, not the final Tauri launcher.

This folder exists to prevent inconsistent UI previews. Every visual screen must be composed from the same tokens, components, and templates before it is copied into the real Tauri app.

## Files

- `index.html` — preview board for components and core templates.
- `ui-tokens.css` — single source of visual tokens: color, spacing, radius, sizing, typography.
- `ui-components.css` — reusable UI primitives: sidebar, nav item, cards, buttons, inputs, composer, settings shell, log panel.
- `ui-templates.css` — page-level templates and state modifiers: main page, recording state, result state, settings pages, warmup, empty state.
- `icons.svg` — local icon registry.

## Locked visual direction

The design must follow the uploaded dark reference style. Do not introduce a separate style direction.

Critical locked rules:

1. Main page recording state must reuse the same main shell.
   - Do not move sidebar.
   - Do not move composer.
   - Do not resize cards.
   - Only state indicator/content may change.

2. Settings sidebar must be identical across settings screens.
   - Use one settings sidebar template.
   - Do not create a new sidebar per tab.
   - Do not create alternate settings navigation classes.

3. Repeated UI must use shared components.
   - Cards use `.ti-card` variants.
   - Nav uses `.ti-nav-item`.
   - Buttons use `.ti-primary-button`, `.ti-secondary-button`, or `.ti-chip-button`.
   - Inputs use `.ti-select` or `.ti-composer`.
   - Settings pages use `.ti-app-shell--settings`, `.ti-settings-sidebar`, `.ti-settings-workspace`, `.ti-settings-scroll`, `.ti-settings-view`.

## Workflow

1. Build or update template in `DesignPreview` first.
2. Render the HTML preview.
3. Compare with reference.
4. User reviews the preview.
5. Only after approval, sync the same token/component/template structure into the Tauri launcher.

## Invalid evidence

Manual redraw images are not valid evidence.

Valid evidence must come from rendered HTML in this folder or from the actual Tauri app.

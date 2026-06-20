# TranslateIT DesignPreview

Status: design-review source only. This folder is not the final Tauri launcher and must not be treated as approved UI until the user approves the rendered preview.

Current working branch for this pass: `V1-Pull`.

Protected branch: `V1` must not be edited, merged into, or described as updated unless the user explicitly asks.

## Purpose

This folder exists to prevent inconsistent UI previews. Every visual screen must be composed from the same tokens, components, and templates before it is copied into the real Tauri app.

The preview board in `index.html` is intentionally generated from shared template data for repeated shells:

- one main sidebar structure;
- one settings sidebar structure;
- one main workspace shell;
- one settings workspace shell;
- state changes through modifier classes and content slots only.

## Files

- `index.html` — component library and template gallery rendered from reusable preview templates.
- `ui-tokens.css` — single source of visual tokens: color, spacing, radius, sizing, typography, desktop dimensions.
- `ui-components.css` — reusable UI primitives: sidebar, nav item, cards, buttons, selects, composer, settings shell, log panel, toast, meter, result card.
- `ui-templates.css` — page-level templates and state modifiers: main states, settings states, warmup, empty states, scaled preview frames.
- `icons.svg` — local icon registry. Text symbols may be used in the preview when the design decision is not icon-specific.

## Locked visual direction

The design follows the approved dark desktop direction: professional, clean, simple, low-noise, and neutral. Do not introduce a separate style direction for individual pages.

Critical locked rules:

1. Main page recording state must reuse the same main shell.
   - Do not move the sidebar.
   - Do not move the composer.
   - Do not resize the main hero/card area.
   - Only state indicator, copy, and state content may change.

2. Settings sidebar must be identical across settings screens.
   - Use one settings sidebar template.
   - Do not create a new sidebar per tab.
   - Do not create alternate settings navigation classes.
   - Only the active state may change per tab.

3. Repeated UI must use shared components.
   - Cards use `.ti-card` variants.
   - Navigation uses `.ti-nav-item`.
   - Buttons use `.ti-primary-button`, `.ti-secondary-button`, `.ti-ghost-button`, `.ti-danger-button`, or `.ti-chip-button`.
   - Inputs use `.ti-select` or `.ti-composer`.
   - Settings pages use `.ti-app-shell--settings`, `.ti-settings-sidebar`, `.ti-settings-workspace`, `.ti-settings-scroll`, `.ti-settings-view`.
   - Main states use `.ti-state-recording`, `.ti-state-result`, `.ti-state-empty`, or future state modifier classes.

4. Page templates must be reviewed in DesignPreview before syncing to Tauri.
   - Do not patch `EngineData/Frontend/RustApp` UI runtime directly from an unapproved preview.
   - Do not claim the UI is final or approved until the user explicitly approves.

## Template coverage in this pass

The preview board currently covers:

- component library primitives;
- MainPage / Default;
- MainPage / Recording;
- MainPage / Translation Result;
- MainPage / Empty Recent;
- Settings / General;
- Settings / Audio;
- Settings / Translate;
- Settings / Developer;
- Warmup / Loading;
- Template Rules / Sync Gate.

## Workflow

1. Build or update template in `DesignPreview` first.
2. Render `DesignPreview/index.html`.
3. Compare layout hierarchy, spacing, component consistency, and state behavior.
4. User reviews the rendered preview.
5. Only after approval, sync the same token/component/template structure into the Tauri launcher.

## Invalid evidence

Manual redraw images are not valid evidence.

Valid evidence must come from rendered HTML in this folder or from the actual Tauri app.

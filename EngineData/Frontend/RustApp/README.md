# TranslateIT Tauri Desktop Application

This directory is the current desktop application package on branch `New`.

## Ownership

```text
src/main.ts
-> desktop entrypoint and production style imports

src/app/simple-launcher/SimpleLauncherController.ts
-> current active desktop controller/product shell owner

src/app/bridge/
-> frontend-to-runtime facade/API boundaries

src/app/active-launcher/
-> reusable views/renderers/bindings used by the active shell where referenced

src-tauri/
-> Rust/Tauri commands, engine/runtime integration, settings/path/storage owners

scripts/
-> current source/build/contract validation utilities
```

The canonical application architecture remains the existing Rust/Tauri desktop shell plus Python helper runtime. Do not create a parallel launcher/engine merely because inherited source names remain.

## UI design boundary

Current UI truth comes from the production source actually imported or called by the desktop application. Visual work follows the root `AGENTS.md` workflow and the `desktop-ui-design-development` specialist when that semantic boundary is active.

The old standalone Figma/design-review workflow is retired on `New`. Do not recreate `Preview`, `DesignPreview`, Figma export/plugin payloads, old locked screenshot manifests, or a parallel mandatory UI workflow unless a new explicit product decision requires them.

Names such as `referenceLayout.css` or `lockedReferenceShellParts.ts` do **not** make a file historical by themselves. They remain production source while current runtime imports/callers and acceptance contracts use them.

## Generated/local output

Generated frontend/build output, Rust targets, local source-validation reports, and temporary development evidence are derived artifacts. They are ignored and must not become source authority.

Current developer/source-validation reports belong under:

```text
.tmp/validation/
```

not `UserData`.

## Current project state

Do not use this README as a backlog or current-task owner. Resume work through root `AGENTS.md`, `CONTEXT.md`, and `docs/knowledge/next-action.md`.

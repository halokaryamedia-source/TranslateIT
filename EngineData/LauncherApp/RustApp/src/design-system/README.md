# TranslateIT Design System

This folder is the source of truth for UI organization. Treat it like a Figma component library mapped into code.

## Goals

- Keep approved UI modular.
- Make each UI area editable without damaging other areas.
- Separate design tokens, layout modules, component modules, and page-specific overrides.
- Keep future Figma export/import possible through token JSON.

## Current Layer Order

```text
styles.css              -> global reset, base colors, shared primitives
settingsLayout.css      -> settings page layout rules
launcherGuard.css       -> guard and safety layout rules
professionalUi.css      -> shared professional polish
referenceLayout.css     -> global approved reference template
mainPageLayout.css      -> approved Main Page module only
```

## Edit Rules

### Global tokens

Use `translateit.tokens.json` when changing approved values such as color, radius, spacing, page width, and component size.

Do not hardcode new global values inside page modules unless the value belongs only to that page.

### Main Page

Edit `../mainPageLayout.css` only for:

- Sidebar Main Page state
- Hero section
- Feature cards
- Assistant card
- Main Page composer
- Main Page account card
- Main Page topbar status pill

Do not edit Settings page alignment from this file.

### Settings Page

Use the factory helpers in:

```text
../app/launcher/uiPageFactory.ts
```

Settings pages should stay component-driven through helpers such as:

- `settingsPage()`
- `settingsSection()`
- `settingsCard()`
- `settingsGrid()`
- `settingsField()`
- `selectButton()`
- `primaryButton()`
- `languageSelectField()`
- `monitoringPanel()`
- `diagnosticActions()`

### Figma Export Direction

The current token file is intentionally JSON-based so it can be mapped to:

- Figma Variables
- Token Studio-style token workflows
- future custom export scripts

For future export, use `translateit.tokens.json` as the canonical source, then generate the format required by the chosen Figma workflow.

## Do Not

- Do not add broad unscoped selectors for page-specific edits.
- Do not use `!important`.
- Do not edit Main Page spacing from Settings CSS.
- Do not edit Settings spacing from Main Page CSS.
- Do not add another lock/override CSS layer unless it has a clear module name and scope.

## Current Approved Module

```text
mainPageLayout.css -> approved by user for Main Page baseline
```

Main Page is now considered the reference baseline module, but it can still be edited safely by component section.

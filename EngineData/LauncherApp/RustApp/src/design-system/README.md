# TranslateIT Design System

This folder is the source of truth for UI organization. Treat it like a Figma component library mapped into code.

## Mandatory AI Workflow

Before editing any approved UI page, read:

```text
src/design-system/AI_UI_WORKFLOW.md
```

That document defines the mandatory rules for AI/Chat/Codex contributors, including:

- approved page ownership
- modular CSS scope
- preview requirement
- approval gate
- rollback rules
- Figma handoff workflow
- safe edit checklist

## Goals

- Keep approved UI modular.
- Make each UI area editable without damaging other areas.
- Separate design tokens, layout modules, component modules, and page-specific modules.
- Keep Figma export/import possible through token JSON and approved page registry.

## Current Layer Order

```text
styles.css                  -> global reset, base colors, shared primitives
launcherGuard.css           -> guard and safety layout rules
professionalUi.css          -> shared professional polish
referenceLayout.css         -> global approved reference template
mainPageLayout.css          -> approved Main Page module only
audioSettingsLayout.css     -> approved Audio Settings module only
translateSettingsLayout.css -> approved Translate Settings module only
developerSettingsLayout.css -> approved Developer Settings module only
```

## Design System Files

```text
translateit.tokens.json                         -> shared design tokens
components/approved-pages.components.json       -> approved page ownership registry
components/main-page.components.json            -> Main Page component registry
figma-export/translateit.approved-ui.figma-export.json -> all approved pages Figma export
figma-plugin/manifest.json                      -> local Figma importer plugin
AI_UI_WORKFLOW.md                               -> mandatory AI workflow/rules
```

## Edit Rules

### Global tokens

Use `translateit.tokens.json` when changing approved values such as color, radius, spacing, page width, and component size.

Do not hardcode new global values inside page modules unless the value belongs only to that page.

### Page modules

Edit only the owning module:

```text
Main Page          -> ../mainPageLayout.css
Audio Settings     -> ../audioSettingsLayout.css
Translate Settings -> ../translateSettingsLayout.css
Developer Settings -> ../developerSettingsLayout.css
```

### Settings Page Factory

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

Use the approved all-pages export:

```text
figma-export/translateit.approved-ui.figma-export.json
```

Load it using:

```text
figma-plugin/manifest.json
```

## Do Not

- Do not add broad unscoped selectors for page-specific edits.
- Do not use `!important`.
- Do not edit Main Page spacing from Settings modules.
- Do not edit Settings spacing from Main Page module.
- Do not add vague override files such as `fix.css`, `final.css`, `override.css`, or `temp.css`.
- Do not claim final without user approval.

## Current Approved Modules

```text
mainPageLayout.css          -> approved Main Page
audioSettingsLayout.css     -> approved Audio Settings
translateSettingsLayout.css -> approved Translate Settings
developerSettingsLayout.css -> approved Developer Settings
```

All approved modules remain editable, but only by their own scoped component sections.

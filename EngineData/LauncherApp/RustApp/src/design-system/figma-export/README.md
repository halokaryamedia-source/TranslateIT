# TranslateIT Figma Export

This folder contains the ready-to-import Figma export payload.

## Ready File

```text
src/design-system/figma-export/translateit.figma-export.json
```

This JSON is the transfer file for Figma. It contains:

- Design variables from `translateit.tokens.json`
- Main Page component registry mapping
- Figma frame coordinates for the approved Main Page baseline
- Safe edit rules so future edits stay scoped

## Recommended Workflow

1. Open Figma Desktop or Figma Web.
2. Open Plugins -> Development -> Import plugin from manifest.
3. Select:

```text
src/design-system/figma-plugin/manifest.json
```

4. Run `TranslateIT Design Importer`.
5. Paste the content of:

```text
src/design-system/figma-export/translateit.figma-export.json
```

6. Click `Import Design System`.

The plugin will create:

- `TranslateIT / Main Page / Approved Baseline`
- `TranslateIT / Component Registry`
- `TranslateIT / Tokens`

## Edit Safety

After editing in Figma, keep changes grouped by component:

- Sidebar
- Topbar
- Hero Section
- Feature Card / Text Input
- Feature Card / Voice Input
- Assistant Card
- Composer
- Account Card

When moving changes back to code:

- token changes go to `translateit.tokens.json`
- component mapping changes go to `components/main-page.components.json`
- final visual CSS changes go to `../mainPageLayout.css`

Do not edit unrelated modules when applying Main Page changes.

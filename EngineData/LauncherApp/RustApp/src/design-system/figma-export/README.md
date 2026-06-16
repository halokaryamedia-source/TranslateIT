# TranslateIT Figma Export

This folder contains ready-to-import Figma export payloads.

## Recommended Ready File

Use this file for the current approved UI set:

```text
src/design-system/figma-export/translateit.approved-ui.figma-export.json
```

It contains approved editable frames for:

- Main Page
- Audio Settings
- Translate Settings
- Developer Settings
- Design Tokens

Legacy single-page export is still available:

```text
src/design-system/figma-export/translateit.figma-export.json
```

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
src/design-system/figma-export/translateit.approved-ui.figma-export.json
```

6. Click `Import Design System`.

The plugin will create editable page frames for the approved UI baselines.

## Edit Safety

After editing in Figma, keep changes grouped by page/module:

- Main Page -> `src/mainPageLayout.css`
- Audio Settings -> `src/audioSettingsLayout.css`
- Translate Settings -> `src/translateSettingsLayout.css`
- Developer Settings -> `src/developerSettingsLayout.css`

When moving changes back to code:

- token changes go to `src/design-system/translateit.tokens.json`
- page/component ownership changes go to `src/design-system/components/approved-pages.components.json`
- page visual implementation goes to the matching page module

Do not edit unrelated modules when applying one page's visual changes.

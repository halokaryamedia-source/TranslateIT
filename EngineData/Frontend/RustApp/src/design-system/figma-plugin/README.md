# TranslateIT Figma Plugin

This is a local Figma development plugin scaffold for importing the TranslateIT design system export.

## What It Imports

The plugin reads:

```text
src/design-system/figma-export/translateit.figma-export.json
```

It creates editable Figma frames for:

- Approved Main Page baseline
- Component Registry
- Token reference sheet

## Load Plugin in Figma

1. Open Figma.
2. Go to Plugins -> Development -> Import plugin from manifest.
3. Select:

```text
src/design-system/figma-plugin/manifest.json
```

4. Run `TranslateIT Design Importer`.
5. Paste the JSON export payload.
6. Click `Import Design System`.

## Important

This plugin is intentionally local-first. It does not require network access and does not publish anything to Figma Community.

The generated Figma frames are editable, but code remains the source of truth until a design change is approved and ported back to:

```text
src/design-system/translateit.tokens.json
src/design-system/components/main-page.components.json
src/mainPageLayout.css
```

## Safe Editing Principle

Each component should remain independently editable:

- Composer edits must not change Sidebar.
- Sidebar edits must not change Settings.
- Main Page edits must not touch Settings modules.
- Token edits should be reviewed because they can affect multiple components.

# TranslateIT Figma Plugin Mechanism

This plugin is a Native Figma Builder. It is not an HTML importer.

## Why Not Import HTML Directly?

The existing DesignPreview HTML/CSS is useful as the technical UI preview, but importing HTML directly into Figma has several problems:

- HTML/CSS becomes a visual capture, not a clean design system.
- Browser-rendered screenshots are not easily editable as Figma components.
- CSS layout does not map perfectly to Figma auto layout.
- HTML import can create messy layer trees.

Therefore, this plugin uses a controlled Figma-native build workflow.

## Current Mechanism

```txt
DesignPreview HTML/CSS/SVG
        ↓
Token, icon, component, and page mapping data
        ↓
Figma plugin Native Builder
        ↓
Editable Figma pages, frames, text, colors, and vector icons
        ↓
Visual review and manual adjustment in Figma
        ↓
Approved changes are written back to repo files
        ↓
Render DesignPreview again
        ↓
Sync to Tauri only after approval
```

## What the Plugin Imports

The plugin does not ask you to import an HTML file.

Instead it uses:

1. Built-in default token and icon data embedded in `code.js`.
2. Optional pasted JSON in the plugin panel.

The optional JSON can override:

- color tokens;
- SVG icon symbol paths.

## What the Plugin Generates

The plugin generates namespaced Figma pages:

- `TranslateIT Export / 00 Cover / Export Notes`
- `TranslateIT Export / 01 Foundations`
- `TranslateIT Export / 02 Icon Registry`
- `TranslateIT Export / 03 Components`
- `TranslateIT Export / 04 Templates`
- `TranslateIT Export / 05 Screens`
- `TranslateIT Export / 98 Archive`
- `TranslateIT Export / 99 Export Report`

The generated objects are native Figma nodes:

- frames;
- rectangles;
- text nodes;
- vector icons created from SVG path data;
- local paint styles.

## Safe Mode

The plugin uses shared plugin metadata to tag generated nodes:

```txt
namespace: translateit.designExport
generated: true
version: 2026-06-native-builder-v3
```

Refresh does not delete manual nodes.

Refresh workflow:

1. `Prepare Refresh + Archive`
2. Review generated node count
3. `Confirm Refresh / Archive Generated Nodes`
4. Old generated top-level nodes move to `TranslateIT Export / 98 Archive`
5. New export is generated

## What Figma Edits Mean

Figma edits are not automatically applied back to the app.

Use Figma to decide visual changes, then update the repo source:

- Icon shape changes -> `EngineData/Frontend/RustApp/DesignPreview/icons.svg`
- Icon placement changes -> `DevelopingData/FigmaDesignExport/TranslateIT/figma-icon-map.json` and DesignPreview JS mapping
- Component style changes -> DesignPreview CSS framework files
- Screen layout changes -> DesignPreview templates and CSS

## Future Upgrade Path

After this stable native builder is validated, next upgrades can include:

1. True master components and instances.
2. Better manifest bundle generation from repo JSON files.
3. Reference PNG overlay layer.
4. Change request cards.
5. Round-trip export report for approved Figma changes.

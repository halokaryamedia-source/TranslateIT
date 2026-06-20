# Running the TranslateIT Figma Plugin

This plugin is a design-export helper. It is not part of the TranslateIT app runtime.

## Safety Model

The plugin is designed to be safe for existing Figma files.

Rules:

1. It never deletes all content on a page.
2. It creates pages under the namespace prefix `TranslateIT Export / ...`.
3. It tags generated nodes using Figma shared plugin data namespace `translateit.designExport`.
4. `Refresh Generated Nodes Only` removes only nodes that were tagged by this plugin.
5. Manual user-created nodes are not removed by refresh.
6. `Create New Safe Export` adds a new timestamped generated root frame instead of clearing manual work.
7. `Validate Safety First` runs basic checks and reports the number of generated nodes currently present.

## Current Capability

The plugin generates an editable Figma design system draft, not only flat placeholders.

It creates:

- local color paint styles using the TranslateIT dark token set;
- editable color token cards;
- editable SVG-based icon components;
- reusable component frames for navigation, buttons, selects, cards, composer, radio rows, meter, and diagnostic progress;
- shell/template frames;
- reference screen drafts for Main v28, Audio v22, Translate v14, and Developer v37.

## Manual Run

1. Open Figma Desktop.
2. Create or open a Figma design file.
3. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`.
4. Select:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/plugin/manifest.json
```

5. Run `TranslateIT Design Export`.
6. Click `Validate Safety First`.
7. Click `Create New Safe Export`.

Use `Refresh Generated Nodes Only` only when you want to replace prior plugin-generated nodes. It is still safe because it removes only tagged generated nodes.

## Expected Output

The plugin creates these namespaced pages:

- `TranslateIT Export / 00 Cover / Export Notes`
- `TranslateIT Export / 01 Foundations`
- `TranslateIT Export / 02 Icon Registry`
- `TranslateIT Export / 03 Components`
- `TranslateIT Export / 04 Templates`
- `TranslateIT Export / 05 Screens`

## Editing Rule

Figma edits are for review. Approved edits must be applied back to the repo:

- Icon shape -> `EngineData/Frontend/RustApp/DesignPreview/icons.svg`
- Icon placement -> `DevelopingData/FigmaDesignExport/TranslateIT/figma-icon-map.json` and DesignPreview JS mapping
- Component style -> `EngineData/Frontend/RustApp/DesignPreview/framework/*.css`
- Screen layout -> `EngineData/Frontend/RustApp/DesignPreview/framework/*.css` and preview templates

Do not sync to Tauri until DesignPreview is approved.

## Plugin Code Structure

`code.js` is organized around these internal sections:

- safety constants and metadata tagging;
- validation and page namespace helpers;
- token/style helpers;
- SVG icon helpers;
- component builders;
- foundations page builder;
- icon registry page builder;
- component library page builder;
- template and screen draft builders.

## Known Limitation

The plugin does not yet import the repo JSON files dynamically, because a local Figma development plugin cannot automatically read arbitrary repository files without a bundling step or UI file upload flow. For now the token/icon/component data is embedded in `code.js` and must be kept aligned with the JSON manifests.

A later improvement can add a manifest paste/import panel so the plugin can ingest the latest JSON from `DevelopingData/FigmaDesignExport/TranslateIT/*.json`.

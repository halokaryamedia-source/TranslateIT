# Running the TranslateIT Figma Plugin

This plugin is a design-export helper. It is not part of the TranslateIT app runtime.

## Safety Model

The plugin is designed to be safe for existing Figma files.

Rules:

1. It never deletes all content on a page.
2. It creates pages under the namespace prefix `TranslateIT Export / ...`.
3. It tags generated nodes using Figma shared plugin data namespace `translateit.designExport`.
4. Refresh is a two-step flow: `Prepare Refresh + Archive` then `Confirm Refresh / Archive Generated Nodes`.
5. Refresh archives tagged generated top-level nodes to `TranslateIT Export / 98 Archive` before generating a new export.
6. Manual user-created nodes are not removed or archived by refresh.
7. `Create New Safe Export` adds a new timestamped generated root frame instead of clearing manual work.
8. `Validate Safety First` runs basic checks and reports the number of generated nodes currently present.
9. Every export creates a report in `TranslateIT Export / 99 Export Report`.

## Current Capability

The plugin generates an editable Figma design system draft, not only flat placeholders.

It creates:

- local color paint styles using the TranslateIT dark token set;
- editable color token cards;
- editable SVG-based icon components;
- reusable component frames for navigation, buttons, selects, cards, composer, radio rows, meter, and diagnostic progress;
- shell/template frames;
- reference screen drafts for Main v28, Audio v22, Translate v14, and Developer v37;
- archive page for previous generated nodes;
- export report page with timestamp, mode, version, token count, icon count, manifest status, and generated node counts.

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
7. Optional: paste a manifest JSON bundle and click `Import Manifest Into Session`.
8. Click `Create New Safe Export`.

For refresh:

1. Click `Prepare Refresh + Archive`.
2. Review the generated-node count in the status panel.
3. Click `Confirm Refresh / Archive Generated Nodes`.

## Optional Manifest Import

The plugin UI accepts a small JSON bundle in the manifest textarea.

Supported forms:

```json
{
  "tokens": {
    "colors": {
      "canvas": "#030407",
      "surface2": "#11151C"
    }
  },
  "icons": {
    "svgSymbols": {
      "speaker": "<path d=\"...\"/>"
    }
  }
}
```

Or:

```json
{
  "colors": {
    "accent": "#D7DDE7"
  },
  "svgSymbols": {
    "expand": "<path d=\"...\"/>"
  }
}
```

Imported manifests affect the current plugin session and are also saved to Figma client storage as `translateit:lastManifest` for future implementation.

## Expected Output

The plugin creates these namespaced pages:

- `TranslateIT Export / 00 Cover / Export Notes`
- `TranslateIT Export / 01 Foundations`
- `TranslateIT Export / 02 Icon Registry`
- `TranslateIT Export / 03 Components`
- `TranslateIT Export / 04 Templates`
- `TranslateIT Export / 05 Screens`
- `TranslateIT Export / 98 Archive`
- `TranslateIT Export / 99 Export Report`

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
- archive helpers;
- manifest import helper;
- token/style helpers;
- SVG icon helpers;
- component builders;
- foundations page builder;
- icon registry page builder;
- component library page builder;
- template and screen draft builders;
- export report builder.

## Current Limitation

The plugin can paste/import a small manifest JSON bundle, but it still does not automatically read repository files from disk. A later bundling step can generate a single plugin data file from `DevelopingData/FigmaDesignExport/TranslateIT/*.json`.

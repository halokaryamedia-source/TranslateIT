# Running the TranslateIT Figma Plugin

This plugin is a design-export helper. It is not part of the TranslateIT app runtime.

## Manual Run

1. Open Figma Desktop.
2. Create or open a Figma design file.
3. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`.
4. Select:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/plugin/manifest.json
```

5. Run `TranslateIT Design Export`.
6. Click `Create Figma Library`.

## Expected Output

The plugin creates these pages:

- `00 Cover / Export Notes`
- `01 Foundations`
- `02 Icon Registry`
- `03 Components`
- `04 Templates`
- `05 Screens`

## Editing Rule

Figma edits are for review. Approved edits must be applied back to the repo:

- Icon shape -> `EngineData/Frontend/RustApp/DesignPreview/icons.svg`
- Icon placement -> `DevelopingData/FigmaDesignExport/TranslateIT/figma-icon-map.json` and DesignPreview JS mapping
- Component style -> `EngineData/Frontend/RustApp/DesignPreview/framework/*.css`
- Screen layout -> `EngineData/Frontend/RustApp/DesignPreview/framework/*.css` and preview templates

Do not sync to Tauri until DesignPreview is approved.

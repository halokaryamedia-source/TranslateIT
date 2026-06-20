# Hardening Pass 2 Report

Branch: `V1`
Scope: `DevelopingData/FigmaDesignExport/TranslateIT`

## Purpose

This pass hardens the plugin workflow before user-side Figma testing.

The goal is to reduce avoidable runtime and handoff failures in these areas:

- plugin input flow;
- one-page Figma output;
- reusable icon components;
- UI Build Package export;
- frontend codegen;
- backend binding preservation.

## Additional Issues Found

### 1. First-run test friction

The user would need to open a separate sample file and copy it manually before validating the plugin.

Fix:

- Added `Load Built-in Smoke Test Sample` button in the plugin UI.
- The built-in sample includes:
  - embedded CSS;
  - SVG symbols;
  - `data-icon` usage;
  - `data-action`;
  - `data-backend`;
  - `data-bind`;
  - `data-slot`.

### 2. Text style risk in generated frontend

The codegen tool previously mapped every Figma fill as a CSS background. That is wrong for text nodes, where fill should become text color.

Fix:

- Text nodes now map `style.fill` to CSS `color`.
- Non-text nodes still map `style.fill` to CSS `background`.

### 3. Unsafe selector construction for runtime updates

The generated runtime previously constructed query selectors using dynamic binding names.

Fix:

- `updateBinding` now scans `[data-bind]` nodes and compares `getAttribute('data-bind')`.
- `updateSlotText` now scans `[data-slot]` nodes and compares `getAttribute('data-slot')`.

This avoids selector syntax issues when binding names contain special characters.

### 4. Icon frontend handoff

Codegen now uses SVG assets exported from icon masters:

- `assets.icons[].componentName`
- `assets.icons[].name`
- `assets.icons[].svg`

If SVG is unavailable, it falls back to a readable label.

### 5. Package validation gap

There was no local validator to check the JSON before running codegen.

Fix:

Added:

```txt
BuildPackage/tools/validate-ui-build-package.mjs
```

This validator checks:

- schema name;
- source metadata;
- screen tree existence;
- design-only section leakage;
- action bindings;
- state/slot bindings;
- icon instance presence;
- icon SVG payloads;
- backendBindings format.

## Recommended Pre-Codegen Flow

After exporting JSON from Figma:

```powershell
cd "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DevelopingData\FigmaDesignExport\TranslateIT\BuildPackage"
node .\tools\validate-ui-build-package.mjs .\ui-build-package.json
node .\tools\build-ui-package-to-frontend.mjs .\ui-build-package.json .\GeneratedFrontend
```

## Remaining Known Limitations

These are not fixed because they require a broader implementation phase:

1. The plugin is not a browser engine and will not perfectly render all CSS.
2. CSS grid, complex selectors, pseudo-elements, media queries, and advanced positioning are still not supported.
3. External images are still placeholders unless a later asset import pipeline is added.
4. General UI components are exported as component candidates, but only icons currently have true master/instance behavior.
5. The generated frontend is a scaffold and still needs Tauri/backend adapter integration before becoming the live runtime UI.
6. Actual Figma Desktop runtime must still be tested on the user's machine.

## Current Status

Ready for smoke testing with either:

- built-in sample from plugin panel; or
- `Samples/single-html-ready-sample.html`.

Do not use large TranslateIT preview HTML until the built-in sample passes.

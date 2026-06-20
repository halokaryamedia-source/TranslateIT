# Final Audit Before Figma Plugin Test

Date: 2026-06-20
Branch: `V1`
Scope: `DevelopingData/FigmaDesignExport/TranslateIT`

## Audit Result

Status: ready for practical smoke testing, with known limitation that actual Figma Desktop runtime execution must still be validated manually.

## Files Audited

```txt
plugin/manifest.json
plugin/ui.html
plugin/code.js
plugin/README.md
plugin/MECHANISM.md
BuildPackage/ui-build-package.schema.json
BuildPackage/tools/build-ui-package-to-frontend.mjs
Samples/single-html-ready-sample.html
QA/PLUGIN_READY_CHECKLIST.md
```

## Checks Completed

### 1. Manifest

- `main` points to `code.js`.
- `ui` points to `ui.html`.
- `editorType` is `figma`.
- No special permissions are required.

### 2. UI Panel

- Separate CSS input has been removed.
- Plugin accepts one `Single HTML package` input.
- Panel includes:
  - validate;
  - generate one-page editable Figma;
  - prepare refresh/archive;
  - generate with archive;
  - export UI Build Package JSON;
  - copyable JSON output field.

### 3. Single Page Output

- Output page is fixed to:

```txt
TranslateIT Import / Workspace
```

- Each import creates one top-level generated run.
- Manual user layers are not moved or deleted.
- Refresh archives previous generated runs.

### 4. Modular Figma Structure

Each import run contains:

```txt
00 Component Preview
01 Imported UI
99 Import Report
```

### 5. Icon System

- SVG `<symbol id="...">` entries are extracted.
- Fallback icons are provided.
- Icon masters are created in `00 Component Preview`.
- UI usages with `data-icon` or `<svg><use href="#..."></use></svg>` become component instances.
- Binding attributes on icon instances are preserved.

### 6. CSS Variable Fix

The parser now preserves CSS custom properties such as:

```css
--bg: #030407;
```

This fixes `var(--token)` resolution.

### 7. Backend Binding Fix

Binding attributes are preserved for regular nodes and icon nodes:

```html
<span data-icon="send" data-action="translation.send" data-backend="translation_send"></span>
```

The exported package should include these bindings.

### 8. UI Package Export Fix

The package export now uses the actual imported UI root, not the full Figma run containing Component Preview and Report.

This prevents generated frontend from accidentally including design-only sections.

### 9. Icon Asset Export Fix

Icon master components are exported as SVG strings in the UI Build Package:

```json
{
  "name": "send",
  "componentName": "Icon/send",
  "svg": "<svg ...>...</svg>"
}
```

This allows codegen to use edited Figma icon masters instead of placeholder labels.

### 10. Codegen Fixes

The codegen tool now outputs:

```txt
GeneratedFrontend/
├─ index.html
├─ styles.css
├─ ui-runtime.js
├─ backend-adapter.js
├─ ui-bindings.json
└─ README.md
```

Runtime changes:

- `backend-adapter.js` is separated.
- No JSON import assertion is required.
- Slot update uses text update, not HTML injection.
- Icon SVG assets from the UI Build Package are used when available.

## Smoke Test Procedure

1. Pull latest `V1`.
2. Import plugin manifest in Figma Desktop.
3. Open:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/Samples/single-html-ready-sample.html
```

4. Copy the entire file content.
5. Paste it into `Single HTML package`.
6. Click `Validate Plugin`.
7. Click `Generate One-Page Editable Figma`.
8. Confirm the workspace page and modular sections appear.
9. Edit an icon master and confirm instances update.
10. Click `Export UI Build Package JSON`.
11. Save JSON to:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/BuildPackage/ui-build-package.json
```

12. Run codegen:

```powershell
cd "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DevelopingData\FigmaDesignExport\TranslateIT\BuildPackage"
node .\tools\build-ui-package-to-frontend.mjs .\ui-build-package.json .\GeneratedFrontend
```

## Pass Criteria

- No red plugin runtime error appears.
- Page `TranslateIT Import / Workspace` is created.
- One import run is created.
- `00 Component Preview`, `01 Imported UI`, and `99 Import Report` exist.
- Icon masters exist.
- UI icon usages are instances.
- `Export UI Build Package JSON` produces JSON.
- JSON contains `assets.icons[].svg`.
- JSON contains expected `backendBindings`.
- Codegen creates `GeneratedFrontend`.
- `GeneratedFrontend/ui-bindings.json` contains expected action and binding entries.

## Honest Limitation

This audit is static and repository-level. Actual plugin execution inside Figma Desktop cannot be confirmed from this environment.

Do not treat the plugin as production-approved until it passes the smoke test above on the user's machine.

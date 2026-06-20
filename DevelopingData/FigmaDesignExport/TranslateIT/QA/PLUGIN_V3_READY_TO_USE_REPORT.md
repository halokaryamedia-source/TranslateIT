# Figma Plugin v3 Ready-To-Use Report

Branch: `V1-Pull`
Scope: `DevelopingData/FigmaDesignExport/TranslateIT/plugin`

## Purpose

This pass improves the Figma plugin so it is safer to use for real UI handoff work before any later approval into `V1`.

The plugin is still a design-to-build helper, not a full browser renderer.

## Improvements Completed

### 1. Readiness scoring

The plugin now evaluates pasted HTML before or during import and classifies it as:

```txt
READY
USABLE_WITH_WARNINGS
NEEDS_CLEANUP
BLOCKED
```

The score considers:

- empty HTML;
- missing embedded CSS;
- missing `data-component`;
- missing `data-action`;
- missing `data-bind` / `data-slot`;
- missing icon symbols;
- unsupported CSS warnings.

### 2. Import blocker

The plugin now refuses to import clearly invalid input such as an empty HTML package.

This prevents users from accidentally generating a misleading blank Figma page.

### 3. Unsupported CSS warnings

The plugin now warns for risky or unsupported input such as:

- CSS grid;
- absolute/fixed/sticky positioning;
- media/container queries;
- pseudo-elements/pseudo-classes;
- keyframes/animation;
- transform;
- external `url()` assets;
- box-shadow;
- filter/backdrop-filter;
- complex selectors;
- unsupported CSS properties.

### 4. Stronger generated import report

Generated runs now include stronger metadata and a clearer `99 Import Report`, including:

- plugin version;
- CSS length;
- symbol count;
- archive count;
- readiness level;
- readiness score;
- element/component/action/binding/icon counts;
- warning summary.

### 5. UI Build Package quality metadata

Exported UI Build Package JSON now includes a `quality` object:

```json
{
  "quality": {
    "readinessLevel": "READY",
    "readinessScore": 100,
    "warnings": [],
    "analysis": {
      "elements": 0,
      "textNodes": 0,
      "components": 0,
      "actions": 0,
      "binds": 0,
      "slots": 0,
      "icons": 0,
      "missingIconRefs": []
    }
  }
}
```

This gives downstream validators/codegen a stable place to inspect export quality.

### 6. Improved CSS handling

The importer now handles more practical UI style details:

- border shorthand color extraction;
- additional named colors;
- `align-items` mapping;
- `justify-content` mapping;
- `min-width` / `min-height` fallback sizing;
- input placeholder/value fallback text;
- image placeholder with source label.

### 7. Smoke sample refreshed

The sample HTML now better represents the supported contract:

- flex layout;
- border shorthand;
- `align-items`;
- `justify-content`;
- `role="button"` on interactive spans/buttons;
- `data-action` + `data-backend` pairs;
- `data-bind` and `data-slot`.

### 8. UI package schema upgraded

The UI Build Package schema now includes v3 quality metadata and stricter integration contract fields.

File:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/BuildPackage/ui-build-package.schema.json
```

### 9. Pre-Figma HTML validator added

A local HTML contract validator now checks a single HTML package before opening Figma.

File:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/BuildPackage/tools/validate-single-html-package.mjs
```

Usage:

```powershell
node .\tools\validate-single-html-package.mjs ..\Samples\single-html-ready-sample.html
```

### 10. UI package validator strengthened

The package validator now checks v3 quality metadata, component candidates, action/backend bindings, state/slot bindings, icon payloads, and integration contract fields.

File:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/BuildPackage/tools/validate-ui-build-package.mjs
```

### 11. UI sync gate added

A stricter sync gate now decides whether an exported UI package is structurally safe enough to continue toward app runtime integration.

File:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/BuildPackage/tools/run-ui-sync-gate.mjs
```

Usage:

```powershell
node .\tools\run-ui-sync-gate.mjs .\ui-build-package.json
```

### 12. Codegen quality report added

Codegen now refuses `BLOCKED` packages and writes a generated quality report:

```txt
GeneratedFrontend/ui-package-report.md
```

The generated runtime metadata also includes package quality information.

### 13. Component contract documented

A formal component contract was added to guide future HTML/Figma/codegen work.

File:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/COMPONENT_CONTRACT.md
```

## Known Limitation

The plugin UI panel file was not changed in this pass because the repository connector blocked that specific HTML/inline-script update. The core plugin handler is already updated, so import/generate/export paths now use the v3 readiness guardrails.

The current panel can still be used:

1. Load or paste HTML.
2. Generate one-page editable Figma.
3. Review the status and `99 Import Report`.
4. Export UI Build Package JSON.

A later small patch can update the panel labels/readiness bar only. This is UI polish and does not block the core v3 plugin logic.

## Current Status

Ready for real smoke testing in Figma Desktop using:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/Samples/single-html-ready-sample.html
```

Do not use a large TranslateIT app preview as the first test. First confirm the smoke sample produces:

- one workspace page;
- one import run;
- `00 Component Preview`;
- `01 Imported UI`;
- `99 Import Report`;
- icon masters and instances;
- exported UI Build Package JSON with `quality` metadata;
- generated frontend with `ui-package-report.md`;
- passing UI sync gate.

## Recommended Next Step

When manual testing is allowed, run the plugin in Figma Desktop and record the smoke test result before merging `V1-Pull` back into `V1`.

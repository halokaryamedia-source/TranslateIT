# TranslateIT Figma Plugin Ready Checklist

Use this checklist before treating the plugin output as ready for app workflow.

## Pull Latest V1-Pull

```powershell
$Repo="D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1"
Set-Location $Repo
git fetch origin --prune
git switch V1-Pull
git pull --ff-only origin V1-Pull
```

## Import Plugin

In Figma Desktop:

```txt
Plugins -> Development -> Import plugin from manifest...
```

Select:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/plugin/manifest.json
```

## Smoke Test Input

Use either:

```txt
Load Built-in Smoke Test Sample
```

or open and copy all contents from:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/Samples/single-html-ready-sample.html
```

Paste into the plugin field:

```txt
Single HTML package
```

## Expected Plugin Flow

1. Click `Validate Plugin`.
2. Confirm the status reports one of these readiness levels:

```txt
READY
USABLE_WITH_WARNINGS
NEEDS_CLEANUP
BLOCKED
```

3. Continue only when the input is `READY` or `USABLE_WITH_WARNINGS`.
4. Click `Generate One-Page Editable Figma`.
5. Confirm a page exists:

```txt
TranslateIT Import / Workspace
```

6. Confirm the generated import run contains:

```txt
00 Component Preview
01 Imported UI
99 Import Report
```

7. Open `99 Import Report` and confirm readiness score, warning count, and imported CSS/icon summary are readable.
8. Confirm icon masters exist in `00 Component Preview`:

```txt
Icon/plus
Icon/mic
Icon/send
```

9. Confirm repeated UI icons are instances, not duplicated manual icon drawings.
10. Change an icon master color or stroke in `00 Component Preview`.
11. Confirm corresponding UI icon instances update.
12. Click `Export UI Build Package JSON`.
13. Confirm exported JSON contains:

```txt
schema
pluginVersion
source
quality
tokens
assets.icons
components
backendBindings
screens
integrationContract
```

14. Copy the generated JSON into:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/BuildPackage/ui-build-package.json
```

## Codegen Smoke Test

Run:

```powershell
cd "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DevelopingData\FigmaDesignExport\TranslateIT\BuildPackage"
node .\tools\validate-ui-build-package.mjs .\ui-build-package.json
node .\tools\build-ui-package-to-frontend.mjs .\ui-build-package.json .\GeneratedFrontend
```

Expected output:

```txt
GeneratedFrontend/
├─ index.html
├─ styles.css
├─ ui-runtime.js
├─ backend-adapter.js
├─ ui-bindings.json
└─ README.md
```

## Pass Criteria

Plugin can be considered ready for practical use when:

- no red plugin runtime error appears;
- validation does not return `BLOCKED`;
- one workspace page is generated;
- generated content is modular;
- `99 Import Report` is generated and readable;
- icon masters and UI icon instances work;
- UI Build Package JSON exports;
- exported JSON contains `quality.readinessLevel` and `quality.readinessScore`;
- codegen produces `GeneratedFrontend`;
- `ui-bindings.json` contains expected action and binding entries.

## Fail / Do Not Sync Criteria

Do not treat output as ready for app sync when:

- readiness is `BLOCKED`;
- generated UI has obvious missing major sections;
- expected action bindings are missing;
- expected state/slot bindings are missing;
- icons are duplicated as detached shapes instead of instances;
- `99 Import Report` shows unsupported CSS that controls core layout;
- generated frontend still needs manual layout repair.

## Important Limitation

This plugin is still not a browser engine. It is intended for structured editable UI conversion and codegen preparation, not pixel-perfect CSS rendering.

# TranslateIT Figma Plugin Ready Checklist

Use this checklist before treating the plugin output as ready for app workflow.

## Pull Latest V1

```powershell
$Repo="D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1"
Set-Location $Repo
git fetch origin --prune
git switch V1
git pull --ff-only origin V1
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

Open and copy all contents from:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/Samples/single-html-ready-sample.html
```

Paste into the plugin field:

```txt
Single HTML package
```

## Expected Plugin Flow

1. Click `Validate Plugin`.
2. Click `Generate One-Page Editable Figma`.
3. Confirm a page exists:

```txt
TranslateIT Import / Workspace
```

4. Confirm the generated import run contains:

```txt
00 Component Preview
01 Imported UI
99 Import Report
```

5. Confirm icon masters exist in `00 Component Preview`:

```txt
Icon/plus
Icon/mic
Icon/send
```

6. Confirm repeated UI icons are instances, not duplicated manual icon drawings.
7. Change an icon master color or stroke in `00 Component Preview`.
8. Confirm corresponding UI icon instances update.
9. Click `Export UI Build Package JSON`.
10. Copy the generated JSON into:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/BuildPackage/ui-build-package.json
```

## Codegen Smoke Test

Run:

```powershell
cd "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DevelopingData\FigmaDesignExport\TranslateIT\BuildPackage"
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
- one workspace page is generated;
- generated content is modular;
- icon masters and UI icon instances work;
- UI Build Package JSON exports;
- codegen produces `GeneratedFrontend`;
- `ui-bindings.json` contains expected action and binding entries.

## Important Limitation

This plugin is still not a browser engine. It is intended for structured editable UI conversion and codegen preparation, not pixel-perfect CSS rendering.

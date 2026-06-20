# TranslateIT Figma Plugin

Status: ready for practical smoke testing with v3 readiness guardrails.

This plugin is a design-to-build helper. It is not part of the TranslateIT app runtime.

## Current Workflow

```txt
One self-contained HTML package
        ↓
Figma plugin input validation
        ↓
Readiness score and unsupported CSS warning check
        ↓
Figma plugin import
        ↓
One Figma workspace page
        ↓
Modular editable sections
        ↓
Reusable icon master components + UI instances
        ↓
Export UI Build Package JSON with quality metadata
        ↓
Validate UI Build Package JSON
        ↓
Codegen GeneratedFrontend
        ↓
Backend adapter connects actions/state
```

## What You Import

The plugin accepts one input only:

```txt
Single HTML package
```

The HTML must contain CSS inside a `<style>` tag.

It can also contain SVG `<symbol>` icons.

The plugin no longer requires a separate CSS field.

## Recommended HTML Contract

Use simple flex-based HTML for best results:

```html
<main data-component="Screen / Main">
  <button data-component="Button / Send" data-action="translation.send" data-backend="translation_send">
    Send
  </button>

  <span data-bind="worker.status">Ready</span>
  <div data-slot="translation.output"></div>
  <span data-icon="send"></span>
</main>
```

Recommended attributes:

- `data-component`: stable Figma/code component name.
- `data-action`: UI event name.
- `data-backend`: backend or Tauri command override.
- `data-bind`: backend state value.
- `data-slot`: dynamic output area.
- `data-icon`: icon symbol/component reference.

## v3 Readiness Guardrails

The plugin now calculates a readiness level before import and stores it in the exported UI Build Package JSON.

Readiness levels:

```txt
READY
USABLE_WITH_WARNINGS
NEEDS_CLEANUP
BLOCKED
```

`BLOCKED` currently prevents import for clearly invalid input, such as an empty HTML package.

The exported package now includes:

```json
{
  "quality": {
    "readinessLevel": "READY",
    "readinessScore": 100,
    "warnings": [],
    "analysis": {
      "elements": 0,
      "components": 0,
      "actions": 0,
      "binds": 0,
      "slots": 0,
      "icons": 0
    }
  }
}
```

## Supported CSS Scope

The plugin supports a practical subset for editable Figma conversion:

- `display:flex` and `inline-flex`;
- `flex-direction` row/column;
- `gap`, `row-gap`, `column-gap`;
- `padding` and directional padding;
- `width`, `height`, `min-width`, `min-height`;
- `background`, `background-color`, `color`;
- `border`, `border-color`, `border-width`, `border-radius`;
- `opacity`;
- `font-size`, `font-weight`;
- `align-items`, `justify-content`.

The plugin warns when it sees unsupported or risky features, including:

- CSS grid;
- absolute/fixed/sticky positioning;
- media/container queries;
- pseudo-elements/pseudo-classes;
- keyframes/animation;
- transform;
- external `url()` assets;
- box-shadow;
- filter/backdrop-filter;
- complex selectors.

## What the Plugin Creates

The plugin creates one page:

```txt
TranslateIT Import / Workspace
```

Inside this page, every import becomes one generated run frame:

```txt
Import Run / timestamp
├─ 00 Component Preview
├─ 01 Imported UI
└─ 99 Import Report
```

Older generated runs can be archived on the same page through refresh:

```txt
98 Archive / timestamp
```

Manual user-created layers are not moved or deleted.

## Icon System

SVG symbols become reusable Figma component masters in `00 Component Preview`.

Example HTML:

```html
<symbol id="shield" viewBox="0 0 24 24">
  <path d="M12 4 6 7v5c0 4 2.4 7 6 8 3.6-1 6-4 6-8V7l-6-3Z" />
</symbol>

<span data-icon="shield"></span>
```

The plugin creates:

```txt
Icon/shield
Icon Instance/shield
```

Editing the master icon updates matching icon instances in the imported UI.

## Backend Binding Attributes

Use these attributes in your HTML before importing:

```html
<button data-component="Button / New Chat" data-action="chat.new" data-backend="chat_new">
  New Chat
</button>

<span data-component="Status / Worker" data-bind="worker.status">
  Ready
</span>

<div data-slot="translation.output"></div>
```

Meaning:

- `data-action`: click or UI event name.
- `data-backend`: backend/Tauri command override.
- `data-bind`: backend state value.
- `data-slot`: dynamic output area.
- `data-component`: stable Figma/code component name.

## Manual Run

1. Open Figma Desktop.
2. Create or open a Figma design file.
3. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`.
4. Select:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/plugin/manifest.json
```

5. Run `TranslateIT Design Export`.
6. Click `Load Built-in Smoke Test Sample` or paste one self-contained HTML package.
7. Click `Validate Plugin`.
8. Click `Generate One-Page Editable Figma` only if the plugin reports `READY` or `USABLE_WITH_WARNINGS`.
9. Review/edit the generated Figma page.
10. Review `99 Import Report`.
11. Click `Export UI Build Package JSON`.
12. Copy the JSON into:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/BuildPackage/ui-build-package.json
```

## Codegen

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

## Smoke Test

Use either:

```txt
Built-in plugin sample
```

or:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/Samples/single-html-ready-sample.html
```

Follow:

```txt
DevelopingData/FigmaDesignExport/TranslateIT/QA/PLUGIN_READY_CHECKLIST.md
```

## Important Limitation

This plugin is not a full browser engine.

It creates an editable and buildable UI structure, not a pixel-perfect CSS renderer.

For pixel-perfect review, keep using PNG renders from DesignPreview.

For modular Figma editing and frontend handoff, use this plugin.

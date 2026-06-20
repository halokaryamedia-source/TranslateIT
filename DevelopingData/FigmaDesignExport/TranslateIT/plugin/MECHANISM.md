# TranslateIT Figma Plugin Mechanism

This plugin is a modular **Single HTML Package to Figma** importer.

The recommended workflow is now one import input only:

```txt
figma-import.html
```

The file should contain both:

1. CSS inside a `<style>` block.
2. HTML structure below it.

Example:

```html
<style>
  :root {
    --bg: #030407;
    --surface: #11151c;
    --text: #f5f7fa;
  }

  .preview-root {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    background: var(--bg);
  }

  .card {
    background: var(--surface);
    color: var(--text);
    border-radius: 16px;
    padding: 20px;
  }
</style>

<div class="preview-root" data-component="Preview / Root">
  <section class="card" data-component="Card / Feature">
    <h3>Voice input</h3>
    <p>Press the microphone button to start translating.</p>
  </section>
</div>
```

## Why One HTML Package?

Using separate HTML and CSS fields works, but it is less convenient and easier to mismatch.

A single self-contained HTML package is better because:

- the structure and visual rules travel together;
- the plugin can extract CSS from `<style>` automatically;
- the user only needs one copy-paste/import action;
- the preview can be archived and versioned as one file;
- it reduces confusion between which CSS belongs to which HTML.

## Correct Import Mechanism

```txt
Self-contained preview HTML
        ↓
Plugin extracts <style> CSS
        ↓
Plugin parses HTML structure
        ↓
Plugin builds intermediate layout tree
        ↓
Figma native builder
        ↓
Editable frames, text, rectangles, and vector-like layers
        ↓
Manual review/edit in Figma
        ↓
Approved changes are written back to repo files
        ↓
Render DesignPreview again
        ↓
Sync to Tauri only after approval
```

## What the Plugin Accepts

Primary input:

- `Single HTML package`: HTML with embedded `<style>` CSS.

Optional input:

- `Optional CSS override`: use only for testing or quick override.

The optional CSS is appended after embedded CSS, so it can override earlier rules when selector support matches.

## Current Supported CSS Subset

The importer supports common UI preview CSS patterns:

- class selectors such as `.card`;
- id selectors such as `#main`;
- tag selectors such as `button` or `section`;
- simple `tag.class` selectors;
- `:root` CSS variables;
- inline style attributes;
- `display: flex`;
- `flex-direction: row` or `column`;
- `gap`;
- `padding` and side-specific padding;
- `width` and `height` in px-like values;
- `background`, `background-color`;
- `color`;
- `font-size`;
- `font-weight`;
- `border-radius`;
- `border-color` and basic border width.

Unsupported CSS is ignored safely.

## Current HTML Handling

The importer supports regular HTML elements and text nodes.

It ignores unsafe or irrelevant tags:

- `script`;
- `style` after extracting its CSS;
- `link`;
- `meta`;
- `title`.

`img` tags are converted into image placeholder frames for now.

For clearer Figma layer names, add attributes like:

```html
<section data-component="Card / Feature">
  ...
</section>
```

or use clear classes:

```html
<div class="ti-card ti-feature-card">
  ...
</div>
```

## Generated Figma Pages

The plugin creates namespaced pages:

- `TranslateIT Import / 01 Imported Preview`
- `TranslateIT Import / 98 Archive`
- `TranslateIT Import / 99 Import Report`

## Safe Mode

The plugin tags generated top-level nodes using shared plugin metadata:

```txt
namespace: translateit.designExport
generated: true
version: 2026-06-html-css-ir-v3-single-html
```

Refresh does not delete manual nodes.

Refresh workflow:

1. Click `Prepare Refresh + Archive`.
2. Review generated node count.
3. Click `Generate + Archive Previous`.
4. Old generated top-level nodes move to `TranslateIT Import / 98 Archive`.
5. New import is generated.

## Important Limitation

This plugin is not a complete browser engine.

It will not perfectly reproduce every CSS behavior, especially:

- CSS grid;
- advanced positioning;
- pseudo-elements;
- complex selectors;
- media queries;
- canvas/webgl;
- external fonts loaded from the web;
- external image files.

The goal is a structured editable Figma layer tree, not a pixel-perfect browser screenshot.

For pixel-perfect review, keep using the generated PNG preview.

For editable design work, use this plugin import.

## Professional Workflow Recommendation

Generate one clean import artifact from DesignPreview:

```txt
DesignPreview/export/figma-import.html
```

That one file should contain:

- resolved design tokens;
- embedded CSS;
- semantic HTML;
- `data-component` names;
- no external scripts;
- no external CSS links.

This gives the best balance between easy import and editable Figma structure.

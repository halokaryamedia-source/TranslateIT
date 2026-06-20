# TranslateIT Figma Plugin Mechanism

This plugin is now a modular HTML/CSS to Figma importer.

It is designed to support the project workflow where UI is first previewed through HTML/CSS, then reviewed or adjusted in Figma as editable design layers.

## Correct Import Mechanism

You do not import a screenshot.

You do not import only CSS.

You paste both:

1. HTML structure, preferably the preview body or complete preview HTML.
2. CSS rules used by that HTML.

The plugin parses the HTML/CSS into an intermediate representation, then creates native editable Figma nodes.

```txt
Preview HTML
+ Preview CSS
        ↓
Plugin parser
        ↓
Intermediate layout tree
        ↓
Figma native builder
        ↓
Editable frames, text, rectangles, and vector-like icon layers
        ↓
Manual review/edit in Figma
        ↓
Approved changes are written back to repo files
        ↓
Render DesignPreview again
        ↓
Sync to Tauri only after approval
```

## Why HTML and CSS Together?

HTML gives the structure:

- sections;
- cards;
- nav items;
- buttons;
- text hierarchy;
- data-component names;
- grouping.

CSS gives the visual rules:

- colors;
- spacing;
- padding;
- gap;
- layout direction;
- width and height;
- border radius;
- typography.

If only HTML is pasted, the plugin can create the layer tree, but the visual result will be generic.

If only CSS is pasted, the plugin has no UI structure to build.

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
- `style`;
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
version: 2026-06-html-css-ir-v2
```

Refresh does not delete manual nodes.

Refresh workflow:

1. Click `Prepare Refresh + Archive`.
2. Review generated node count.
3. Click `Generate + Archive Previous`.
4. Old generated top-level nodes move to `TranslateIT Import / 98 Archive`.
5. New import is generated.

## What Figma Edits Mean

Figma edits are not automatically applied back to the app.

Use Figma to decide visual changes, then update the repo source:

- Icon shape changes -> `EngineData/Frontend/RustApp/DesignPreview/icons.svg`
- Icon placement changes -> `DevelopingData/FigmaDesignExport/TranslateIT/figma-icon-map.json` and DesignPreview JS mapping
- Component style changes -> DesignPreview CSS framework files
- Screen layout changes -> DesignPreview templates and CSS

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

For best results, maintain a clean HTML preview export:

```txt
DesignPreview/export/figma-import.html
DesignPreview/export/figma-import.css
```

The HTML should include semantic component names and `data-component` attributes.

The CSS should include resolved tokens and avoid overly complex selectors.

This will make Figma output more modular and easier to edit.

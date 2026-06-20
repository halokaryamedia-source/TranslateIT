# TranslateIT Figma Plugin Mechanism

This plugin is a modular **Single HTML Package to One Figma Page** importer.

## Current Goal

The plugin exists to support this workflow:

```txt
HTML/CSS preview shown to the user
        ↓
One self-contained HTML package
        ↓
Figma plugin import
        ↓
One Figma page
        ↓
Modular editable sections
        ↓
Reusable icon components + UI instances
```

## One Input Only

The plugin no longer requires a separate CSS input.

Use one input:

```txt
Single HTML package
```

That HTML must contain CSS inside a `<style>` tag.

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

<svg width="0" height="0" style="display:none">
  <symbol id="shield" viewBox="0 0 24 24">
    <path d="M12 4 6 7v5c0 4 2.4 7 6 8 3.6-1 6-4 6-8V7l-6-3Z" />
  </symbol>
</svg>

<div class="preview-root" data-component="Preview / Root">
  <section class="card" data-component="Card / Feature">
    <svg><use href="#shield"></use></svg>
    <h3>Voice input</h3>
    <p>Press the microphone button to start translating.</p>
  </section>
</div>
```

## One Figma Page Only

The plugin now outputs to one page:

```txt
TranslateIT Import / Workspace
```

Inside that page, each import run is grouped into one generated root frame.

Each generated root frame contains modular sections:

```txt
Import Run / timestamp
├─ 00 Component Preview
├─ 01 Imported UI
└─ 99 Import Report
```

When refreshing, older generated import runs are moved into an archive section on the same page:

```txt
98 Archive / timestamp
```

Manual Figma layers are not moved or deleted.

## Modular Sections

The plugin uses Figma frames as modular containers.

Recommended layer strategy:

- `00 Component Preview`: reusable icon master components and future component previews.
- `01 Imported UI`: editable UI imported from the self-contained HTML.
- `99 Import Report`: import metadata and warnings.
- `98 Archive`: old generated runs after refresh.

Use `data-component` attributes in HTML to get clean layer names:

```html
<section data-component="Nav / SavedChat">
  ...
</section>
```

Without `data-component`, the plugin uses tag, id, and class names.

## Reusable Icon Behavior

The plugin extracts SVG `<symbol id="...">` definitions from the HTML package.

For every symbol, it creates a reusable Figma master component:

```txt
Icon/shield
Icon/chevron
Icon/file
```

These master icons appear in:

```txt
00 Component Preview
```

When the UI contains:

```html
<svg><use href="#shield"></use></svg>
```

or:

```html
<span data-icon="shield"></span>
```

The imported UI uses an instance of the master icon.

That means:

```txt
Edit Icon/shield in Component Preview
        ↓
All Icon Instance/shield usages in the imported UI update together
```

This is the correct Figma design-system behavior.

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

## Important Limitation

This plugin is not a complete browser engine.

It will not perfectly reproduce every CSS behavior, especially:

- CSS grid;
- advanced positioning;
- pseudo-elements;
- complex selectors;
- media queries;
- external fonts loaded from the web;
- external image files.

The goal is a structured editable Figma layer tree, not a pixel-perfect browser screenshot.

For pixel-perfect review, keep using the generated PNG preview.

For editable design work, use this plugin import.

## Professional Workflow Recommendation

Generate one clean import artifact from DesignPreview:

```txt
EngineData/Frontend/RustApp/DesignPreview/export/figma-import.html
```

That one file should contain:

- resolved design tokens;
- embedded CSS;
- semantic HTML;
- `data-component` names;
- inline SVG `<symbol>` icons;
- no external scripts;
- no external CSS links.

This gives the best balance between easy import, modular structure, and reusable Figma components.

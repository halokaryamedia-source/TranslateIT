# TranslateIT V11.2 Professional Section Templates

## Purpose

V11.1 made the Design Clone pipeline more structured, but the editable draft can still feel like a list of extracted blocks. V11.2 moves the editable draft closer to a professional design reconstruction by using section templates.

Scope remains **Design Clone only**.

## Problem to solve

A raw section block is readable, but not always useful enough for design work. The output can still feel mechanical if every section is rendered with the same simple layout.

## V11.2 approach

Use the rebuild plan intent to choose a cleaner editable template:

```txt
navigation/header → Header Template
hero/landing      → Hero Template
content/about     → Content Template
gallery/card-grid → Gallery/Card Grid Template
footer            → Footer Template
fallback          → Content Section Template
```

## Template expectations

### Header Template

- Brand/title area.
- Navigation item row.
- Optional CTA button.
- Clean horizontal composition.

### Hero Template

- Eyebrow or section label.
- Large heading.
- Supporting paragraph.
- CTA placeholder.
- Media placeholder or extracted image.

### Content Template

- Section heading.
- Body text group.
- Optional media block.
- Clean two-column or single-column structure.

### Gallery/Card Grid Template

- Section heading.
- 2–3 reusable card placeholders.
- Media areas if images exist.
- Text labels from extracted content.

### Footer Template

- Simple brand/text area.
- Link row when links exist.
- Muted visual style.

## Quality rule

The editable result should look like a professional wireframe/design draft, not a raw extraction table.

## Failure rule

The output fails if:

- every section uses the same generic block without structure,
- text overlaps or becomes unreadable,
- media placement is random,
- the editable draft is less useful than manual rebuilding.

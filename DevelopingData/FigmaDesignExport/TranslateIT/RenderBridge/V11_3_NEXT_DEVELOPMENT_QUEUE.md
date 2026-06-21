# TranslateIT V11.3 Next Development Queue

## Current honest status

V11.2 has improved the Design Clone direction by adding template-based editable drafts. However, it should still be treated as a prototype until visual Figma validation proves the output is clean.

Current realistic target:

```txt
7/10 usable prototype
```

Do not claim 8/10 or 9/10 until imported Figma output is visually checked across multiple websites.

## What must be done next

### 1. Align Bridge Mode to V11.2

The plugin renderer is already V11.2, but the RenderBridge still behaves as a V11.1-compatible payload provider. This is usable, but naming should be aligned to avoid confusion.

Required work:

- Change bridge mode to `universal-page-adapter-v11-2-design-clone`.
- Change bridge adapter label to mention `template-ready` or `section-template-ready`.
- Add diagnostics for template readiness.

Acceptance criteria:

- `/health` returns V11.2 mode.
- `/render` returns V11.2 mode.
- Smoke test checks V11.2 mode.

### 2. Add Template Intent Mapping to Payload

The plugin currently maps section intent into templates. The bridge should also expose this directly.

Required work:

- Add `templateIntent` to each rebuildPlan section.
- Possible values:
  - `header`
  - `hero`
  - `content`
  - `gallery`
  - `footer`

Acceptance criteria:

- Every rebuildPlan section has `templateIntent`.
- Plugin can use `templateIntent` directly instead of guessing from `intent` string.

### 3. Improve Editable Draft Template Safety

The editable result must avoid text overlap and visual clutter.

Required work:

- Add maximum text lengths per template.
- Add section height rules.
- Add fallback if a section has too much text.
- Prevent media placeholders from overlapping.

Acceptance criteria:

- Long text is truncated safely.
- Hero does not overlap body and media.
- Gallery cards remain aligned.
- Footer remains readable.

### 4. Improve UI Library Visual Polish

The UI Library must feel like a clean design system page.

Required work:

- Add group description per component category.
- Add better spacing between groups.
- Add stronger visual hierarchy.
- Add tokens for radius/shadow where possible.

Acceptance criteria:

- UI Library is readable from zoomed-out view.
- Each category is easy to scan.
- Components do not look like extracted fragments.

### 5. Add Radius Tokens

Current tokens include color, typography, and spacing. Professional design systems usually also need radius tokens.

Required work:

- Add radius token inference from borderRadius styles.
- Fallback radius tokens:
  - `Radius / SM` 8
  - `Radius / MD` 16
  - `Radius / LG` 24
  - `Radius / XL` 32

Acceptance criteria:

- rebuildPlan.tokens.radius exists.
- UI Library renders Radius Tokens.
- Audit checks radius token count.

### 6. Add Local HTML Preview Audit Later

Before asking the user to test in Figma, we should reduce obvious layout risk with a simulated preview/audit.

Required work:

- Build a small local preview script that reads RenderBridge payload and creates an HTML mock of the section templates.
- Use it only for internal inspection.

Acceptance criteria:

- Can visually inspect Header/Hero/Content/Gallery/Footer template composition outside Figma.
- Does not replace Figma validation.

## Priority order

```txt
1. Bridge V11.2 alignment
2. templateIntent in rebuildPlan
3. radius tokens
4. safer editable templates
5. better UI Library polish
6. local preview audit
```

## Next answer format

When reporting progress, use this format:

```txt
What I changed:
- ...

Why it matters:
- ...

Current honest readiness:
- ...

What must be done next:
1. ...
2. ...
3. ...
```

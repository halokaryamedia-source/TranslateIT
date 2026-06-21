# TranslateIT Version 0.1 - Alpha Development Queue

## Current public version

```txt
Version 0.1 - Alpha
```

This public version is locked until the workflow is genuinely ready.

Do not create new version labels for small patches.

## Product scope

TranslateIT is currently focused on **Design Clone only**.

Current pipeline:

```txt
Website / screenshot / visual reference
→ visual understanding
→ rebuild plan
→ structured Figma UI Library
→ clean editable design draft
→ honest audit
```

Out of scope for this Alpha:

- production code generation
- app/backend logic
- framework-specific export
- deployment workflow

## Current honest readiness

```txt
Target now: usable Alpha prototype
Not yet: professional-ready release
```

Current expected readiness:

```txt
Foundation: around 7/10
Actual Figma output: still needs visual validation
Release readiness: not ready yet
```

## Work that must be completed before leaving Alpha

### 1. Public naming cleanup

Required:

- UI should say `Version 0.1 - Alpha`.
- Documentation should use `Version 0.1 - Alpha` as the public version.
- Internal technical names may exist, but should not be treated as public release versions.

Acceptance criteria:

- No new public labels like V11.4, V11.5, 0.1.1, etc.

### 2. Template safety improvements

Required:

- max text length per template
- overflow warning note
- safe section height rules
- safe media fallback
- gallery card alignment protection

Acceptance criteria:

- Long text does not overlap.
- Hero layout remains readable.
- Gallery cards stay aligned.
- Footer remains readable.

### 3. UI Library polish

Required:

- clean category descriptions
- consistent group spacing
- radius tokens visible
- spacing tokens visible
- button/card/section components readable from zoomed-out view

Acceptance criteria:

- UI Library feels like a design system page, not extracted fragments.

### 4. Local preview audit

Required:

- generate a local HTML preview from RenderBridge payload
- preview Header/Hero/Content/Gallery/Footer templates outside Figma
- use it to catch obvious layout problems before Figma validation

Acceptance criteria:

- Preview can show obvious text/media/template issues before user testing.

### 5. Figma visual validation

Required:

- import at least one real website
- screenshot frame must be pure
- rebuild plan must be readable
- UI Library must be clean
- editable draft must be usable
- audit frame must be honest

Acceptance criteria:

- Manual score reaches at least 7/10 usable prototype.

## Rule for next version

Do not move beyond `Version 0.1 - Alpha` until:

- local tests pass
- Figma visual validation passes
- output is consistently usable
- known major layout problems are fixed

Only then should the next version be named.

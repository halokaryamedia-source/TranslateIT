# TranslateIT V11 Professional Design Clone Quality Gate

## Scope

TranslateIT is focused on **Design Clone only**.

Code clone, app logic, backend, production framework, and deployment are outside this scope.

## Professional output order

Every import must produce this order:

1. `01 Screenshot Preview / Pure Reference`
2. `02 Rebuild Plan / AI Interpretation`
3. `03 UI Components / Structured Library`
4. `04 Editable Result / Clean Structured Draft`
5. `05 Audit / Design Clone Notes`

## Non-negotiable rules

### 01 Screenshot Preview

- Must be pure screenshot reference.
- Must not contain editable overlay layers.
- Must not contain random extracted DOM layers.

### 02 Rebuild Plan

- Must summarize the design intent.
- Must list detected sections.
- Must describe likely component roles.
- Must include confidence/uncertainty when extraction is imperfect.

### 03 UI Components / Structured Library

The UI library must be organized into clear groups:

- Color Tokens
- Typography Tokens
- Navigation Components
- Button / CTA Components
- Media Components
- Section Components

It must not be a dump of tiny absolute-position fragments.

### 04 Editable Result

- Must be a clean editable design draft.
- Must be section-based.
- Must prioritize readability and usefulness.
- Must not use raw browser coordinates as the main layout strategy.

### 05 Audit

- Must show diagnostics.
- Must make weak areas visible.
- Must not pass only because screenshot fidelity is good.

## Professional score target

`audit-v11-design-clone.mjs` must be used to check:

- screenshot purity
- rebuild plan readiness
- UI library structure
- editable draft quality
- workflow discipline

The final score is the lowest category score, not the average.

## Failure conditions

The output is considered failed if:

- UI Library is visually chaotic.
- Components are not grouped by purpose.
- Screenshot frame has overlay layers.
- Editable draft is unreadable.
- Output only looks good as an image but is not useful in Figma.
- Code generation is mixed into the Design Clone workflow.

## Design philosophy

Professional Design Clone means:

```txt
Understand the page first.
Plan the rebuild.
Create clean tokens and components.
Build an editable draft.
Audit honestly.
```

It does not mean blindly copying every browser layer position.

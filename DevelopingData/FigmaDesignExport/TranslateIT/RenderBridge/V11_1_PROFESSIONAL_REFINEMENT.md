# TranslateIT V11.1 Professional Refinement

## Goal

Move TranslateIT Design Clone from a clean structured prototype into a more professional design-system output.

The scope remains **Design Clone only**.

No production code generation, no app logic, no backend, and no deployment workflow.

## Output order remains locked

1. `01 Screenshot Preview / Pure Reference`
2. `02 Rebuild Plan / AI Interpretation`
3. `03 UI Components / Structured Library`
4. `04 Editable Result / Clean Structured Draft`
5. `05 Audit / Design Clone Notes`

## V11.1 required improvements

### 1. Spacing Tokens

The UI Library must include spacing guidance, not only color and typography.

Required spacing token examples:

- `Space / XS`
- `Space / SM`
- `Space / MD`
- `Space / LG`
- `Space / XL`
- `Section Gap`
- `Card Padding`
- `Grid Gap`

Spacing tokens may be inferred from layout gaps when available, with fallback defaults when extraction is weak.

### 2. Responsive Intent

The Rebuild Plan must include responsive notes:

- Desktop layout intent
- Tablet layout intent
- Mobile layout intent

Example:

```txt
Desktop: two-column hero, horizontal navigation, 3-column cards.
Tablet: reduce cards to 2 columns, keep hero readable.
Mobile: stack hero, collapse navigation, cards become single column.
```

### 3. Component Fallback Rules

The UI Library must never look empty or broken if the target site has limited data.

Fallback components must be generated when needed:

- Default button component
- Default navigation item
- Default card component
- Default media placeholder
- Default section block

### 4. Component Variants

Professional UI Library should prepare common variants:

- Button / Primary
- Button / Secondary
- Button / Ghost
- Navigation / Default
- Card / Default
- Card / Media
- Section / Header
- Section / Content
- Section / Gallery

### 5. Audit Checklist

The audit frame must make these visible:

- screenshot purity
- rebuild plan exists
- color tokens count
- typography tokens count
- spacing tokens count
- component group count
- editable section count
- known limitations

## Quality target

A result is considered closer to professional if:

- screenshot frame is pure
- component library is organized and readable
- component groups have stable layout
- editable draft is section-based
- output does not depend on raw DOM coordinates
- audit exposes weaknesses honestly

## Failure rules

The result fails if:

- UI Library is visually chaotic
- components are tiny absolute-position fragments
- editable draft is not readable
- screenshot preview contains overlays
- design clone includes code-generation workflow
- audit hides missing tokens/components

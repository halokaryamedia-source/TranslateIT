# CSS Priority Override Audit

This audit tracks remaining CSS priority override usage in the active Rust launcher UI layer.

## Scope

- `src/styles.css`
- `src/referenceLayout.css`
- `src/professionalUi.css`
- `src/settingsLayout.css`
- `src/launcherGuard.css`

## Current Finding

No CSS priority override declaration is allowed in the active Rust launcher UI layer.

The legacy utility was cleaned from:

```css
.is-hidden { display: none; }
```

## Decision

Do not add CSS priority override declarations for layout, spacing, card sizing, typography, colors, responsive behavior, or visibility utilities.

Use normal cascade order, route-scoped state classes, `hidden`, or `aria-hidden` where appropriate.

## Guard Script

The guard script is available at:

```text
scripts/audit_css_important.mjs
```

Package scripts include:

```text
npm run audit:css-priority
```

The audit is wired into both:

```text
npm run validate:internal
npm run validate:full
```

## Cleanup Plan

1. Keep `.is-hidden` as a normal visibility utility only.
2. Use explicit `hidden`, `aria-hidden`, or route-local classes for future visibility state where safer.
3. Keep `referenceLayout.css` as the final imported layout authority.
4. Reject new CSS priority overrides through `npm run audit:css-priority`.

## Status

- Audit baseline: documented.
- Guard script: added.
- Package script: wired.
- Cleanup applied to source CSS: complete.
- Remaining CSS priority overrides: zero expected.
- Runtime validation: not run.

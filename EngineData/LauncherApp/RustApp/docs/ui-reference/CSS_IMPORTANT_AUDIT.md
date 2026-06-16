# CSS `!important` Audit

This audit tracks remaining `!important` usage in the active Rust launcher UI layer.

## Scope

- `src/styles.css`
- `src/referenceLayout.css`
- `src/professionalUi.css`
- `src/settingsLayout.css`
- `src/launcherGuard.css`

## Current Finding

The current active source check found one legacy utility usage:

```css
.is-hidden { display: none !important; }
```

## Decision

Keep this as a temporary compatibility utility until the UI visibility flow is migrated to explicit `hidden`, `aria-hidden`, or route-scoped state classes.

Do not add new `!important` declarations for layout, spacing, card sizing, typography, colors, or responsive behavior.

## Cleanup Plan

1. Confirm every `.is-hidden` usage is only used for binary visibility state.
2. Replace affected call sites with explicit `hidden` attributes or route-local classes where safe.
3. Remove `!important` from `.is-hidden` after call sites no longer rely on cascade override behavior.
4. Keep `referenceLayout.css` as the final imported layout authority.

## Status

- Audit baseline: documented.
- Cleanup applied: pending.
- Runtime validation: not run.

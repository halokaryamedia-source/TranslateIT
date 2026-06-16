# CSS Priority Override Audit

This audit tracks remaining CSS priority override usage in the active Rust launcher UI layer.

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

Do not add new priority override declarations for layout, spacing, card sizing, typography, colors, or responsive behavior.

## Guard Script

The guard script is now available at:

```text
scripts/audit_css_important.mjs
```

Package scripts now include:

```text
npm run audit:css-priority
```

The audit is wired into both:

```text
npm run validate:internal
npm run validate:full
```

## Cleanup Plan

1. Confirm every `.is-hidden` usage is only used for binary visibility state.
2. Replace affected call sites with explicit `hidden` attributes or route-local classes where safe.
3. Remove the priority override from `.is-hidden` after call sites no longer rely on cascade override behavior.
4. Keep `referenceLayout.css` as the final imported layout authority.

## Status

- Audit baseline: documented.
- Guard script: added.
- Package script: wired.
- Cleanup applied to source CSS: pending.
- Runtime validation: not run.

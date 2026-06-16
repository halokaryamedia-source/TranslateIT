# TranslateIT UI Page Template

This file is the practical template for building future TranslateIT pages without re-measuring spacing manually.

Use this together with `UI_REFERENCE_GUIDE.md`, `src/referenceLayout.css`, `src/app/launcher/referenceUiPrimitives.ts`, and `src/app/launcher/uiPageFactory.ts`.

## Non-Negotiable Layout Rules

- Keep `src/referenceLayout.css` imported last.
- Do not create a new sidebar width.
- Do not create a new topbar height.
- Do not create custom random page padding.
- Do not introduce new color values outside `referenceLayout.css` tokens.
- Do not rename backend-connected IDs unless the controller is updated in the same change.
- New settings-like pages must use the settings page structure below.
- New reusable views should use `uiPageFactory.ts` helpers before adding custom markup.

## UI Factory Helpers

Prefer these helpers for new pages and future refactors:

- `settingsPage()` for settings page wrappers.
- `settingsSection()` for section titles.
- `settingsCard()` for card containers.
- `settingsGrid()` for two-column or compact card layout.
- `settingsField()` for form-like field blocks and modifier classes.
- `settingsActions()` for action rows.
- `selectButton()` for select-like field buttons.
- `primaryButton()` for main actions.
- `advancedEmpty()` for reserved advanced setting blocks.
- `emptyState()` for empty chat, list, or data states.
- `outputRow()` for translate output rows.
- `statusBadge()` for compact runtime or feature state.
- `developerLogRows()` for structured developer status rows.

## Settings Page Template

Use this structure for every future settings page:

```ts
return settingsPage("Page Name", "Short page description.", "settings-view--page-name", `
  ${settingsSection("Primary Section", "Short section helper text.", true)}
  ${settingsCard("settings-card--page-name", settingsGrid(`
    ${settingsField("Field Label", selectButton("Field Label", "Field Value"))}
    ${settingsField("Second Field", "<p>Use this area for helper text or a reusable row.</p>")}
  `))}
  ${settingsActions(primaryButton("Primary Action", { id: "exampleActionButton" }))}
  ${settingsSection("Advanced Page Setting", "Reserved for optional future settings.")}
  ${advancedEmpty()}
`);
```

## Required Classes for Settings Pages

Every settings page should reuse these classes:

| Purpose | Class |
| --- | --- |
| Page wrapper | `settings-view` |
| Page title area | `settings-view-header` |
| Section title | `settings-section-title` |
| Card | `settings-card` |
| Two-column grid | `settings-grid-2` |
| Compact grid | `compact-grid` |
| Field wrapper | `settings-field` |
| Select/action field | `select-field-v22` |
| Radio row | `radio-row-v22` |
| Output row | `settings-output-row` |
| Main button | `mic-test-button-v22` |
| Empty advanced card | `advanced-empty-v22` |

## Required Measurements

| Item | Value |
| --- | ---: |
| Main sidebar | `360px` |
| Settings sidebar | `322px` |
| Topbar | `72px` |
| Settings content column | `993px` |
| Settings content left offset | `173px` |
| Settings card radius | `20px` |
| Form field height | `46px` |
| Standard button | `132px × 48px` |
| Main composer | `990px × 62px` |
| Main hero width | `720px` |

## Main/Home Page Template

For future home-like pages, keep the same structure:

```html
<section class="hero-panel">
  <span class="hero-kicker">Context Label</span>
  <h3>Primary Question or Page Title</h3>
  <p>Short supporting description.</p>
  <div class="feature-grid">
    <article class="feature-card">...</article>
    <article class="feature-card">...</article>
  </div>
  <article class="assistant-card">...</article>
</section>
<section class="composer-wrap">...</section>
```

Do not change the main sidebar, topbar, hero width, feature grid width, or composer width for a page variant unless a new approved reference screenshot replaces the baseline.

## Refactor Priority

1. Empty states and status badges.
2. General Settings.
3. Audio Settings.
4. Translate Settings.
5. Developer Settings.
6. Home feature cards.

## Checklist Before Adding a New Page

- The page uses the approved class names.
- The page prefers `uiPageFactory.ts` helpers for shared structure.
- The page does not introduce new spacing constants.
- The page does not introduce new colors.
- The page does not change sidebar/topbar/composer dimensions.
- The page preserves required backend IDs.
- `npm run validate:ui-reference` passes.
- `npm run validate:ui-template` passes.
- A screenshot preview is compared with the accepted reference direction.

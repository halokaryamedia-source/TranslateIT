# TranslateIT UI Page Template

This file is the practical template for building future TranslateIT pages without re-measuring spacing manually.

Use this together with `UI_REFERENCE_GUIDE.md`, `src/referenceLayout.css`, and `src/app/launcher/referenceUiPrimitives.ts`.

## Non-Negotiable Layout Rules

- Keep `src/referenceLayout.css` imported last.
- Do not create a new sidebar width.
- Do not create a new topbar height.
- Do not create custom random page padding.
- Do not introduce new color values outside `referenceLayout.css` tokens.
- Do not rename backend-connected IDs unless the controller is updated in the same change.
- New settings-like pages must use the settings page structure below.

## Settings Page Template

Use this exact structure for every future settings page:

```ts
return `${pageStart("Page Name", "Short page description.", "settings-view--page-name")}
  <section class="settings-section-title first">
    <h2>Primary Section</h2>
    <p>Short section helper text.</p>
  </section>

  <article class="settings-card settings-card--page-name">
    <div class="settings-grid-2">
      <section class="settings-field">
        <h3>Field Label</h3>
        <button class="select-field-v22" type="button">
          <span>Field Value</span>
        </button>
      </section>

      <section class="settings-field">
        <h3>Second Field</h3>
        <p>Use this area for helper text or a reusable row.</p>
      </section>
    </div>

    <div class="settings-card-actions">
      <button class="mic-test-button-v22" type="button">Primary Action</button>
    </div>
  </article>

  <section class="settings-section-title">
    <h2>Advanced Page Setting</h2>
    <p>Reserved for optional future settings.</p>
  </section>
  <article class="advanced-empty-v22"></article>
</div>`;
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
| Field wrapper | `settings-field` |
| Select/action field | `select-field-v22` |
| Radio row | `radio-row-v22` |
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

## Checklist Before Adding a New Page

- The page uses the approved class names.
- The page does not introduce new spacing constants.
- The page does not introduce new colors.
- The page does not change sidebar/topbar/composer dimensions.
- The page preserves required backend IDs.
- `npm run validate:ui-reference` passes.
- A screenshot preview is compared with the accepted reference direction.

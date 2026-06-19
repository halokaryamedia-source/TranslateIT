# TranslateIT UI Reference Guide

This document is the required UI baseline for the TranslateIT desktop launcher. All new pages, panels, and settings screens must follow this guide unless the reference screenshots are intentionally replaced.

## Source of Truth

The current visual baseline follows these reference screens:

- Main Page v28
- Audio Settings v22
- Translate Settings v14
- Developer Settings v37

Runtime style entry order:

1. `src/styles.css`
2. `src/settingsLayout.css`
3. `src/launcherGuard.css`
4. `src/referenceLayout.css`

`src/referenceLayout.css` is the final visual lock and must stay imported last in `src/main.ts`.

Reference copy must live directly in the source UI files such as `src/app/active-launcher/shell.ts` and `src/app/active-launcher/settingsViews.ts`. Do not use post-render text patching, `MutationObserver`, or hidden DOM copy correction to make the UI match the reference.

## Layout Tokens

Use these dimensions as the default desktop layout target.

| Token | Value | Usage |
| --- | ---: | --- |
| `--ref-main-sidebar` | `360px` | Main launcher sidebar width |
| `--ref-settings-sidebar` | `322px` | Settings sidebar width |
| `--ref-settings-content-width` | `993px` | Settings content card column width |
| Main topbar height | `72px` | Main page header |
| Settings topbar height | `72px` | Settings header/back row |
| Main workspace horizontal padding | `40px` | Main content left/right margin after sidebar |
| Main bottom padding | `22px` | Bottom breathing space under composer |
| Settings scroll left padding | `173px` | Left offset from settings sidebar to content column |
| Settings scroll bottom padding | `90px` | Space below final settings card |

Do not create full-width content by default. The reference style uses narrow, centered content with clear negative space.

## Main Page Rules

Main page layout order:

1. Sidebar
2. Topbar
3. Center hero panel
4. Two feature cards
5. Assistant status card
6. Bottom composer

Required dimensions:

| Element | Required behavior |
| --- | --- |
| Sidebar | Fixed `360px`, full height, dark background |
| Topbar | `72px` height, title left, direction and record pills right |
| Hero panel | Centered, `720px` width |
| Hero kicker | Centered pill, `286px` minimum width, `32px` height |
| Feature grid | Two columns, `720px` total width, `30px` gap |
| Feature card | `188px` minimum height, `14px` radius |
| Assistant card | `720px` width, `58px` minimum height |
| Composer | Bottom aligned, `990px` width, `62px` minimum height |

Main page typography:

| Element | Size |
| --- | ---: |
| Topbar title | `21px` |
| Topbar subtitle | `11px` |
| Hero title | `32px` |
| Hero subtitle | `11px` |
| Feature title | `16px` |
| Feature body | `12px` |

Main page content must not be left-heavy. The reference uses centered hero and cards.

## Settings Page Rules

Settings layout order:

1. Fixed settings sidebar
2. Topbar with Back button on the right
3. Scrollable content column
4. Section title
5. Card
6. Optional advanced card

Required dimensions:

| Element | Required behavior |
| --- | --- |
| Settings sidebar | Fixed `322px`, full height |
| Settings topbar | `72px` height |
| Back button | `130px × 40px`, right aligned |
| Content column | `993px` width |
| Content left offset | `173px` from workspace start |
| Section card radius | `20px` |
| Form field height | `46px` |
| Standard button | `132px × 48px` minimum |

Settings typography:

| Element | Size |
| --- | ---: |
| Page title | `32px` |
| Page subtitle | `12.5px` |
| Section title | `24px` |
| Section subtitle | `11.5px` |
| Field label | `12.5px` |
| Field value | `12px` |

## Settings Page Specifics

### Audio Settings

Required vertical sequence:

1. Page title and subtitle
2. Audio device card
3. Voice section title
4. Voice behavior card
5. Advanced Audio Setting section

Required dimensions:

| Element | Value |
| --- | ---: |
| Audio card height | `338px` |
| Voice card height | `250px` |
| Audio card top margin | `40px` |
| Voice section top margin | `46px` |
| Voice card top margin | `30px` |

### Translate Settings

Required vertical sequence:

1. Page title and subtitle
2. Language direction card
3. Realtime section
4. Realtime card
5. Translate Output section
6. Output card
7. Advanced Translate Setting

Required dimensions:

| Element | Value |
| --- | ---: |
| Language card height | `144px` |
| Realtime / output card height | `126px` |
| Language card top margin | `40px` |
| Compact card top margin | `30px` |
| Language swap button | `56px × 48px` |

`Save Translate` may exist for backend compatibility, but it should not become a dominant visual element if the reference screen hides it. If the UI auto-persists translate changes, the persistence must be part of the controller/runtime flow, not a visual copy patch.

### Developer Settings

Required vertical sequence:

1. Page title and subtitle
2. Monitoring section
3. Monitoring card
4. Diagnostic section
5. Diagnostic card with progress and logs

Required dimensions:

| Element | Value |
| --- | ---: |
| Monitoring card height | `248px` |
| Diagnostic card minimum height | `622px` |
| Diagnostic card top margin | `34px` |
| Log card radius | `18px` |

Developer page must remain readable and operational. Hardware bars, health status, run diagnostic, progress, and logs must stay connected to real backend state.

## Spacing Scale

Use this scale when adding new UI:

| Name | Value | Use |
| --- | ---: | --- |
| `xs` | `4px` | Icon/detail micro gaps |
| `sm` | `8px` | Inline text/icon gaps |
| `md` | `14px` | Field internal spacing |
| `lg` | `22px` | Button/card minor spacing |
| `xl` | `30px` | Card internal groups |
| `2xl` | `40px` | Card top margin / page blocks |
| `3xl` | `46px` | Settings section margin |
| `4xl` | `56px` | Card horizontal padding |
| `5xl` | `68px` | Settings grid column gap |
| `6xl` | `96px` | Large hero-to-card separation |

Do not use random values unless there is a measured reason from the reference image.

## Color Tokens

Use the existing `referenceLayout.css` colors:

| Token | Value | Use |
| --- | --- | --- |
| `--ref-bg` | `#050609` | Global background |
| `--ref-sidebar` | `#07080c` | Sidebar/topbar surface |
| `--ref-surface` | `#11141a` | Cards and composer |
| `--ref-surface-2` | `#151922` | Active buttons and secondary actions |
| `--ref-surface-3` | `#0b0e14` | Inactive buttons and pills |
| `--ref-border` | `#252b35` | Soft borders |
| `--ref-border-strong` | `#37404b` | Card borders |
| `--ref-text` | `#f5f6f8` | Primary text |
| `--ref-muted` | `#a5adba` | Secondary text |
| `--ref-muted-2` | `#858e9c` | Helper text |
| `--ref-accent` | `#d6dbe3` | Neutral accent lines/toggles |

## Frontend and Backend Sync Rules

Do not break these IDs. They are UI-to-backend contract points:

| ID / Selector | Purpose |
| --- | --- |
| `#messageInput` | Manual text input |
| `#sendButton` | Manual translation submit |
| `#attachmentInput` | Attachment picker |
| `#composerPlusButton` | Attachment trigger |
| `#microphoneButton` | Main voice record trigger |
| `#quickMicButton` | Sidebar voice toggle |
| `#recordStatusButton` | Record state and voice watcher trigger |
| `#voiceOutputButton` | Voice output toggle |
| `#settingsButton` | Open settings |
| `#backHomeButton` | Return to main page |
| `#saveSettingsButton` | Persist general settings |
| `#resetSettingsButton` | Reset defaults |
| `#checkAudioInputButton` | Audio input check |
| `#audioVoiceToggleButton` | Voice output setting |
| `#micTestButton` | Mic diagnostic |
| `#sourceLanguageButton` | Source language selector |
| `#targetLanguageButton` | Target language selector |
| `#swapLanguageButton` | Swap direction |
| `#saveTranslateButton` | Persist translation settings |
| `#realtimeModeButton` | Fast mode |
| `#qualityModeButton` | Quality mode |
| `#runDiagnosticButton` | Developer diagnostic |
| `#seeAllLogsButton` | Expand/collapse logs |

Visual redesign may hide or reposition controls, but these IDs must remain available if the backend expects them.

## Implementation Rules for New Pages

When adding a new page:

1. Use the settings shell if it belongs to settings.
2. Use the `settings-view` structure.
3. Keep content width at `993px` unless a reference update says otherwise.
4. Use section title plus card pattern.
5. Use `settings-card`, `settings-field`, `select-field-v22`, `radio-row-v22`, and `mic-test-button-v22` when possible.
6. Do not introduce new colors outside the token list.
7. Do not introduce new spacing values outside the spacing scale unless measured against a reference screenshot.
8. Preserve all backend command IDs and event targets.
9. Import visual override after base CSS if a page needs a locked reference state.
10. Generate a preview screenshot before calling the UI final.
11. Keep reference copy in source UI files, not in post-render patch logic.

## Validation Checklist

Before marking a UI update complete:

- Main page still matches Main Page v28 proportions.
- Settings sidebar remains `322px`.
- Settings content column remains `993px`.
- Topbars remain `72px` high.
- Composer remains bottom aligned and centered.
- Buttons connected to backend IDs still exist.
- Language and mode changes still persist through the existing settings flow.
- Developer diagnostic still reads backend/runtime data.
- No page uses random spacing or colors.
- Screenshot preview has been compared with the reference images.
- `npm run validate:ui-reference` passes.

Build/test is still required for final runtime validation.



# TranslateIT V1-Pull Locked UI Reference Guidelines

Status: active locked UI guideline for `V1-Pull` launcher stabilization.
Scope: `EngineData/Frontend/RustApp` active launcher UI.

## Non-negotiable visual direction

The launcher UI must follow the uploaded locked reference set:

- Main Page: `v28`
- Audio Settings: `v22`
- Translate Settings: `v14`
- Developer Settings: `v37`

Do not use Main Page `v29`. It was rejected.

## Hard rule

Do not introduce a new visual direction unless the user explicitly approves a new reference. The UI must stay aligned to the locked screenshots, including:

- left sidebar width and spacing;
- topbar height and placement;
- centered hero layout;
- feature card size and gap;
- bottom composer width and position;
- settings sidebar and content width;
- card grid spacing;
- advanced settings sections;
- developer monitoring and diagnostic card structure.

## Code structure rule

The locked reference implementation must stay structural and maintainable. Do not force the UI with fragile one-off positioning hacks.

The active layering should remain:

1. `styles.css` for base tokens and shared primitives;
2. `professionalUi.css` for result cards, badges, focus state, and diagnostics;
3. `referenceLayout.css` for shared locked reference tokens and template layout;
4. `mainPageLayout.css` for Main Page v28;
5. `audioSettingsLayout.css` for Audio Settings v22;
6. `translateSettingsLayout.css` for Translate Settings v14;
7. `developerSettingsLayout.css` for Developer Settings v37.

Do not add a new final override layer such as `uiComfortLayout.css` unless the user approves a new reference.

## UI library rule

Settings pages must continue using `uiPageFactory.ts` primitives:

- `settingsPage`
- `settingsSection`
- `settingsCard`
- `settingsGrid`
- `settingsField`
- `primaryButton`
- `statusBadge`
- `radioOption`
- `selectButton`
- `outputRow`

This keeps settings layout reusable and prevents duplicated card/button markup.

## Main Page v28 shell copy

The main shell must preserve the locked reference language:

- `Voice translation`
- `Speak Indonesian. Get translated English voice output.`
- `Local-first voice translation`
- `How can I help translate today?`
- `Type a message, or press the microphone button on the right to record speech locally.`
- `Text input`
- `Voice input`
- composer placeholder: `Ask anything...`

## Validation gate

`run_ui_readiness_report.mjs` must fail when:

- the locked CSS reference modules are not imported;
- `uiComfortLayout.css` or another unapproved override is imported;
- Main v28 shell copy drifts;
- `referenceLayout.css` no longer declares Main v28 + Audio v22 + Translate v14 + Developer v37;
- settings pages stop using UI factory primitives;
- Enter-to-send is no longer wired.

## User review rule

Do not claim final UI quality based on generated mock images. The next review must be based on the uploaded reference screenshots or a real app screenshot after the user chooses to run the app locally.

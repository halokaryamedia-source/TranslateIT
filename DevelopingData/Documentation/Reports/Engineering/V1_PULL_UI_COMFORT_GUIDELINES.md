# TranslateIT V1-Pull UI Comfort Guidelines

Status: active guideline for `V1-Pull` launcher stabilization.
Scope: `EngineData/Frontend/RustApp` active launcher UI.

## Product intent

TranslateIT should feel like a familiar desktop chat/translation app, not a developer console. The default path must be obvious for new users:

1. type text;
2. press Enter or Send;
3. see the translation result;
4. use microphone only when the user intentionally wants voice input;
5. open Settings only when changing behavior or checking runtime state.

## Layout rules

- Keep the left sidebar compact. The sidebar should guide navigation, not dominate the screen.
- Keep the main workspace centered and predictable.
- Keep the composer near the bottom, like common chat applications.
- Keep the first screen focused on two primary tasks: Text translation and Voice translation.
- Avoid forcing users to understand helper/provider/GPU terminology on the home screen.
- Place advanced runtime diagnostics behind Settings > Developer or visually down-rank them.

## Copy rules

- Prefer user-facing labels: `Translate`, `New translation`, `Check mic`, `Voice translation`.
- Avoid vague labels such as `Ask anything` because this app is specifically for translation.
- Avoid exposing engineering labels as primary actions unless the action is in Developer settings.
- Error messages must tell the user what to do next.

## Control hierarchy

Primary controls:

- Text input composer
- Send / translate text
- Microphone start/stop
- Check mic
- Settings

Secondary controls:

- Recent chats
- Drafts
- Saved chats
- Local files
- Worker status

Advanced controls:

- Developer diagnostics
- Helper bridge details
- Evidence reports
- GPU/provider details

Advanced controls may remain accessible, but they must not visually compete with the main translation workflow.

## UI library usage

Settings pages should continue using `uiPageFactory.ts` primitives:

- `settingsPage`
- `settingsSection`
- `settingsCard`
- `settingsGrid`
- `settingsField`
- `primaryButton`
- `statusBadge`

Home layout comfort is controlled through `uiComfortLayout.css`, imported after the baseline/reference CSS layers. This keeps the approved UI baseline intact while allowing user-comfort improvements as the final override layer.

## Validation gates

`run_ui_readiness_report.mjs` must check:

- `uiComfortLayout.css` is imported;
- home shell copy is translation-specific;
- advanced actions are visually down-ranked;
- UI factory primitives remain present;
- Enter-to-send remains wired;
- runtime readiness guard remains wired.

Do not mark UI as final if the home screen again becomes developer-heavy or exposes placeholder controls as primary actions.

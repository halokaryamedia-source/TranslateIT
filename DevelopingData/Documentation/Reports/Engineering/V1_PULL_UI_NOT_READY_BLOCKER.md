# V1-Pull UI Not Ready Blocker

Status: BLOCKED / NOT READY

This document exists to prevent false reporting. The UI is not approved and must not be reported as ready.

## Why it is blocked

The previous preview attempts were not acceptable because they were static redraws and did not prove that the actual repository UI matches the uploaded reference. The user explicitly rejected those previews.

## Critical issues confirmed by user

1. Voice recording state must not visually re-layout Main Page v28.
   - It must preserve the exact Main Page v28 sidebar, hero, cards, topbar, and composer.
   - Only the recording state indicator may change.

2. Settings sidebar must be identical across all settings-related screens.
   - It must come from one shared source.
   - It must not be recreated per tab or per extension screen.

## Valid evidence only

Manual redraw previews are not valid approval evidence.

Valid evidence must be one of:

- a screenshot rendered from the actual Tauri app; or
- a screenshot rendered from a repository preview that imports and uses the same source CSS/component structure.

## Current repo status

The repo now contains a blocking visual approval report script:

- `EngineData/Frontend/RustApp/scripts/run_ui_visual_approval_report.mjs`

The repo also contains a stricter reference extension report:

- `EngineData/Frontend/RustApp/scripts/run_ui_reference_extension_report.mjs`

However, the package/professional gate integration could not be completed in this session because full-file package/professional-gate updates were blocked by the tool safety layer.

## Do not claim

Do not claim any of the following until real visual evidence exists and the user approves it:

- UI is ready;
- UI matches the reference 100%;
- extension screens are approved;
- settings sidebar is visually approved;
- voice recording state is visually approved.

## Next required work

1. Render the actual app or repository preview from source.
2. Capture screenshots for all required screens.
3. Compare them to the uploaded references.
4. Fix source CSS/components until the screenshots match.
5. Only then create `ui-visual-approval.json` with user approval.

# V1 Advance Simple UI Contract

## Purpose

TranslateIT must be easy to use. The main screen must not feel like a debug dashboard. The UI should expose the smallest useful workflow first, then hide advanced runtime details in Settings > Developer.

## Primary rule

One main screen. One obvious job:

```text
Type text -> click Translate -> read result.
```

Voice, helper setup, worker checks, logs, and diagnostics are secondary. They must not compete with the Translate button.

## Runtime facade

The frontend product layer may use:

```text
EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts
```

The low-level bridge remains:

```text
EngineData/Frontend/RustApp/src/app/bridge/runtimeApi.ts
```

The facade exists to turn raw engine responses into short user-facing readiness messages. It should not force a complicated UI.

## Main screen layout

The main screen should contain only:

1. **Text input**
   - Large textarea.
   - Clear placeholder.
   - Attach text file button is optional and secondary.

2. **Translate button**
   - Main primary action.
   - Always visible.
   - Shows clear failure message if the engine is blocked.

3. **Translation result area**
   - Empty on startup.
   - Shows original and translated text only after action.

4. **Small engine status card**
   - One plain-language status message.
   - Maximum four small actions:
     - Start Helper
     - Check Worker
     - Check Mic
     - Diagnostics

5. **Voice button**
   - Secondary.
   - Must not look like the main product action.
   - If voice is blocked, it should explain setup is needed.

## What must not happen again

Do not make the main screen contain separate large panels for every runtime concept. Avoid exposing these on the main screen unless absolutely needed:

- Raw runtime bundle.
- Model inventory details.
- GPU policy details.
- Pipeline handoff raw state.
- Virtual route internals.
- Audio studio internals.
- Long blocker arrays.

Those belong in Developer Diagnostics.

## Button policy

Every visible main-screen button must satisfy:

1. It has a direct user-facing purpose.
2. It has a clear label.
3. It produces visible feedback.
4. It is not just a raw debug command.

## Current intended main buttons

```text
Translate
Attach text
Start Helper
Check Worker
Check Mic
Diagnostics
Start voice
Settings
```

No additional main-screen buttons should be added without a product reason.

## Non-goals

- No PR/merge from `V1-Advance`.
- No release claim.
- No complex dashboard UI.
- No hiding errors silently.

## Implementation order

1. Simplify shell around one translate screen.
2. Keep result area empty until user translates.
3. Keep setup actions small and secondary.
4. Use facade for short readiness messages when useful.
5. Keep raw diagnostics in Settings > Developer.
6. Validate build before local app testing resumes.

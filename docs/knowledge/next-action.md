# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: UI/product Plan is closed; top-level navigation and normal Settings hierarchy are source-aligned through ChatGPT -> GitHub

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/foundation/01-product-overview.md
-> docs/foundation/02-product-requirements.md
-> docs/knowledge/source-ownership.md
-> one relevant current source owner only
```

Do not reconstruct approved product decisions from chat history when canonical repository owners already contain them.

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Static source alignment may continue, but rendered/device/runtime/audio/model/package claims remain `LOCAL PROOF REQUIRED` until the dedicated local phase.

## Locked Product / UI Baseline

```text
Primary       -> Meeting
Secondary     -> Text
Top-level UI  -> Meeting / Text / History / Settings
History       -> Recent / Saved
Settings      -> Meeting / History & Privacy / Advanced
Documents     -> removed
Audio Studio  -> advanced/post-core
```

UI target remains **Modern + Easy to use + Familiar** with conventional Windows desktop patterns, one obvious primary task per workspace, restrained surfaces, and no decorative/technical AI dashboard behavior.

Approved first-use terminology/behavior remains: `Your microphone`, `Meeting sound`, `Meeting microphone`, `TranslateIT Meeting Microphone`, `Incoming translation`, `Start Translation`, `Translation Live`, `Stop Translation`, `Stop Voice`, `Fix Setup`, `Retry`, `Check Setup`. Meeting setup may be intentionally deferred without pretending success; Text remains capability-independent from Meeting audio setup.

## Completed Source Slice — Top-Level Shell / Navigation

Completed:

- active sidebar exposes only `Meeting`, `Text`, `History`, `Settings`;
- Documents navigation/workspace was removed from the active shell;
- top-level Saved navigation/workspace was removed from the active shell;
- controller workspace contract accepts only `meeting`, `text`, `history`;
- no replacement launcher, parallel shell, dependency, or compatibility path was added.

## Completed Source Slice — Normal Settings Hierarchy

Current normal Settings routing is now:

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

Completed changes:

- inherited normal `General`, `Translation`, and standalone `Audio` tabs are no longer routed from active Settings navigation;
- `Meeting` is the default Settings section and owns the current product-level microphone / meeting-audio / managed Meeting Microphone setup presentation;
- `History & Privacy` exists as the approved responsibility surface but intentionally does not expose fake History toggle/Clear History behavior before persistence semantics are implemented;
- `Advanced` is now a product-level setup-health landing rather than immediately exposing the technical control surface;
- existing technical diagnostics are opened explicitly from `Advanced -> Open Diagnostics`;
- removing global Translation Settings did not remove Text direction control: Text now exposes a contextual Indonesian/English swap action and persists it through the existing settings command;
- Meeting's fixed initial ID -> EN direction is kept independent from Text direction state.

Static proof is in current shell/controller/Settings renderer and `docs/knowledge/source-ownership.md`.
Rendered appearance remains local proof later.

## Current Source Reality

Important approved gaps remain independently:

```text
Meeting Ready/Live composition is still inherited/incomplete
Text still uses inherited composer/result layout and stale text-file attachment behavior
History/Saved nested workflow and persistence semantics are incomplete
First Setup wizard / intentional defer is not implemented
global Meeting strip / cross-view live state / single-instance behavior is incomplete
Meeting runtime lifecycle, incoming lane, turn coordination, recovery, and Stop semantics remain incomplete
legacy unreachable Settings view helpers may still remain and require bounded reachability cleanup later
installer/runtime asset proof remains later
```

Do not combine all remaining gaps into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** for completed source slices:

- active shell is `Meeting / Text / History / Settings` only;
- normal Settings navigation is `Meeting / History & Privacy / Advanced` only;
- Advanced has an explicit nested Diagnostics entry;
- controller no longer routes normal Settings through `general`, `translate`, `audio`, or `developer` tabs;
- Text owns a persisted ID/EN swap after removal of global Translation Settings;
- current entry remains `main.ts -> SimpleLauncherController -> shell`.

**LOCAL PROOF REQUIRED** for actual rendered layout/resizing and all Windows/runtime behavior.

## Hold

- do not revive Documents, top-level Saved, or the old Settings hierarchy;
- do not create a second shell/launcher or a second Settings control plane;
- do not expose fake History persistence controls before their storage contract exists;
- do not start local Windows acceptance yet;
- do not treat remaining UI/runtime gaps as one broad refactor;
- do not claim rendered success from source markup.

## Next Step

Start the next bounded source slice: **reconcile the active Meeting workspace from the inherited readiness-card layout toward the approved Meeting Ready composition**, while preserving truthful current readiness/recovery semantics. Do not implement the full Live conversation/runtime lifecycle in the same slice; first establish the Ready-state information hierarchy, product terminology, managed Meeting Microphone presentation, and one clear `Start Translation` boundary without inventing runtime readiness that current source cannot prove.

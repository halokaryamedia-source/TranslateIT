# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: UI/product Plan is closed; first bounded source slice (top-level shell/navigation reconciliation) is complete through ChatGPT -> GitHub

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

Final first-use terminology/behavior is also approved: `Your microphone`, `Meeting sound`, `Meeting microphone`, `TranslateIT Meeting Microphone`, `Incoming translation`, `Start Translation`, `Translation Live`, `Stop Translation`, `Stop Voice`, `Fix Setup`, `Retry`, `Check Setup`. Meeting setup may be intentionally deferred without pretending success; Text remains capability-independent from Meeting audio setup.

## Completed Source Slice — Top-Level Shell / Navigation

Root cause was in the current canonical shell owners:

```text
lockedReferenceShellParts.ts
SimpleLauncherController.ts
```

Before the slice they still exposed/accepted top-level `Documents` and `Saved` workspaces.

Completed changes:

- active sidebar now exposes only `Meeting`, `Text`, `History`, `Settings`;
- Documents navigation and Documents workspace panel were removed from the active shell;
- top-level Saved navigation and Saved workspace panel were removed from the active shell;
- `ProductWorkspace`, title mapping, and workspace guard now accept only `meeting`, `text`, and `history`;
- Settings remains the existing fourth top-level destination through the single current shell/controller path;
- no replacement launcher, parallel shell, dependency, or compatibility path was added.

Static proof is recorded by the current source and `docs/knowledge/source-ownership.md`.
Rendered visual behavior remains local proof later.

## Current Source Reality

Top-level navigation is now source-aligned, but important approved gaps remain independently:

```text
Settings still uses General / Translation / Audio / Advanced
Meeting Ready/Live composition is still inherited/incomplete
Text still uses inherited composer/result layout and text-file attachment behavior
History/Saved nested workflow and persistence semantics are incomplete
First Setup wizard / intentional defer is not implemented
global Meeting strip / cross-view live state / single-instance behavior is incomplete
Meeting runtime lifecycle, incoming lane, turn coordination, recovery, and Stop semantics remain incomplete
installer/runtime asset proof remains later
```

Do not combine all of these into one implementation task.

## Proof State

**CURRENT-PROJECT VERIFIED** for this slice:

- active shell markup contains Meeting/Text/History/Settings only;
- active shell no longer contains Documents or top-level Saved panels;
- controller workspace contract no longer accepts `documents` or `saved`;
- current entry remains `main.ts -> SimpleLauncherController -> shell`.

**LOCAL PROOF REQUIRED** for actual rendered layout/resizing and all Windows/runtime behavior.

## Hold

- do not revive Documents or top-level Saved;
- do not create a second shell/launcher;
- do not start local Windows acceptance yet;
- do not treat remaining UI/runtime gaps as one broad refactor;
- do not claim rendered success from source markup.

## Next Step

Start the next bounded source slice: **reconcile normal Settings hierarchy from inherited `General / Translation / Audio / Advanced` to approved `Meeting / History & Privacy / Advanced`**, preserving contextual Translation choices in Meeting/Text and keeping Developer Diagnostics nested under Advanced rather than creating a new control plane.
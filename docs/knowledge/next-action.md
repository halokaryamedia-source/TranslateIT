# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: UI/product Plan is closed; top-level navigation, normal Settings hierarchy, and Meeting Ready composition are source-aligned through ChatGPT -> GitHub

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

- active sidebar exposes only `Meeting`, `Text`, `History`, `Settings`;
- Documents navigation/workspace was removed from the active shell;
- top-level Saved navigation/workspace was removed from the active shell;
- controller workspace contract accepts only `meeting`, `text`, `history`;
- no replacement launcher, parallel shell, dependency, or compatibility path was added.

## Completed Source Slice — Normal Settings Hierarchy

Current normal Settings routing is:

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

- inherited normal `General`, `Translation`, and standalone `Audio` tabs are no longer routed from active Settings navigation;
- `Meeting` is the default Settings section;
- `History & Privacy` exists without fake persistence controls;
- `Advanced` is a setup-health landing with explicit nested Diagnostics;
- Text owns its contextual Indonesian/English direction swap after removal of global Translation Settings;
- Meeting's fixed initial ID -> EN direction remains independent from Text direction state.

## Completed Source Slice — Meeting Ready Composition

The active Meeting Ready surface now follows the approved hierarchy:

```text
readiness
-> Speak Indonesian / meeting hears English
-> Your microphone
-> Incoming translation / Meeting sound
-> TranslateIT Meeting Microphone
-> Realtime / Auto
-> Start Translation boundary
-> meeting-app microphone reminder
```

Source behavior is intentionally truthful:

- overall Meeting, physical-microphone, and managed-route statuses are driven by the existing product readiness snapshot/current input evidence;
- Meeting sound displays the existing configured preference;
- incoming translation is shown as `Not connected yet` because the approved incoming lane is not implemented yet;
- `Start Translation` is visible as the correct primary boundary but remains disabled because the approved atomic live-session Start lifecycle is not connected yet;
- Retry / Fix Setup remain secondary recovery actions;
- Developer Diagnostics is no longer a competing Meeting action and remains under Settings -> Advanced;
- Meeting Ready uses a single restrained information surface with row reflow rather than the inherited card/dashboard composition.

Static source proof is in `lockedReferenceShellParts.ts`, `SimpleLauncherController.ts`, `mainPageLayout.css`, and `source-ownership.md`. Actual rendered quality remains local proof later.

## Current Source Reality

Important approved gaps remain independently:

```text
Text still uses inherited composer/result layout and stale text-file attachment behavior
History/Saved nested workflow and persistence semantics are incomplete
First Setup wizard / intentional defer is not implemented
global Meeting strip / cross-view live state / single-instance behavior is incomplete
atomic Start Translation and Meeting Live lifecycle are not implemented
incoming lane, turn coordination, recovery, and Stop semantics remain incomplete
legacy unreachable Settings view helpers may still remain and require bounded reachability cleanup later
installer/runtime asset proof remains later
```

Do not combine all remaining gaps into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** for completed source slices:

- active shell is `Meeting / Text / History / Settings` only;
- normal Settings navigation is `Meeting / History & Privacy / Advanced` only;
- Meeting Ready composition matches the approved static information hierarchy;
- Meeting Ready does not claim incoming readiness or atomic Start behavior that source does not yet provide;
- current entry remains `main.ts -> SimpleLauncherController -> shell`.

**LOCAL PROOF REQUIRED** for actual rendered layout/resizing and all Windows/runtime behavior.

## Hold

- do not revive Documents, top-level Saved, or the old Settings hierarchy;
- do not enable `Start Translation` by mapping it to capture-only behavior;
- do not pretend incoming translation is Ready before its actual lane exists;
- do not create a second shell/launcher or a second Settings control plane;
- do not expose fake History persistence controls before their storage contract exists;
- do not start local Windows acceptance yet;
- do not treat remaining UI/runtime gaps as one broad refactor;
- do not claim rendered success from source markup.

## Next Step

Start the next bounded source slice: **reconcile the active Text workspace to the approved familiar source/target translator composition and remove the stale text-file attachment workflow**. Preserve the existing canonical text translation command and persisted ID/EN direction swap; establish source/target panes, explicit Translate, contextual Quality/Tone presentation, and truthful result/error states without adding document parsing or changing Meeting runtime behavior.

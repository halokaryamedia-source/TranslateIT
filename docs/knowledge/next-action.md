# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: UI/product Plan is closed; top-level navigation, normal Settings hierarchy, Meeting Ready, and active Text composition are source-aligned through ChatGPT -> GitHub

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

The active Meeting Ready surface follows the approved hierarchy:

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

Source behavior remains truthful:

- overall Meeting, physical-microphone, and managed-route statuses are driven by the existing product readiness snapshot/current input evidence;
- Meeting sound displays the existing configured preference;
- incoming translation is shown as `Not connected yet` because the approved incoming lane is not implemented yet;
- `Start Translation` is visible as the correct primary boundary but remains disabled because the approved atomic live-session Start lifecycle is not connected yet;
- Retry / Fix Setup remain secondary recovery actions;
- Developer Diagnostics remains under Settings -> Advanced;
- Meeting Ready uses one restrained information surface with narrow-window row reflow.

## Completed Source Slice — Text Workspace

The active Text workspace now uses the approved familiar translator composition:

```text
Source language <-> Target language
Source textarea | editable Target textarea
Mode / Tone summary
Translate
inline result state
```

Completed source behavior:

- removed active text-file input, `Attach text` action, attachment-ingestion imports/method/state, and attachment event bindings;
- kept translation on the existing `runtimeProductFacade -> runtimeApi.translateText -> Rust translate_text` path;
- ID/EN Swap remains contextual to Text and persists through the existing settings command;
- when a visible target exists, successful Swap moves that target into the source pane and clears the target for reverse translation;
- translation is explicit through the `Translate` button, with `Ctrl + Enter` as the keyboard shortcut; Enter itself remains normal text entry;
- target text is editable;
- failed translation preserves the user's source and any previous visible target while reporting an inline error;
- editing source after a completed translation keeps the previous target visible and marks it `Needs update`;
- if source changes while inference is running, the result is marked as belonging to the previous source rather than silently appearing current;
- current contextual Mode displays the actual inherited persisted runtime profile instead of falsely claiming independent Text `Quality` ownership is already implemented;
- Tone is presented as approved `Auto`, while actual tone inference remains a later source/runtime gap.

Static proof is in `lockedReferenceShellParts.ts`, `SimpleLauncherController.ts`, `mainPageLayout.css`, and `source-ownership.md`. Rendered appearance and runtime translation quality remain local proof later.

## Current Source Reality

Important approved gaps remain independently:

```text
History/Saved nested workspace and persistence semantics are incomplete
First Setup wizard / intentional defer is not implemented
global Meeting strip / cross-view live state / single-instance behavior is incomplete
atomic Start Translation and Meeting Live lifecycle are not implemented
incoming lane, turn coordination, recovery, and Stop semantics remain incomplete
Text Quality-default ownership, tone inference, Copy/Save semantics remain incomplete
legacy unreachable attachment/Settings helpers may remain and require bounded reachability cleanup later
installer/runtime asset proof remains later
```

Do not combine all remaining gaps into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** for completed source slices:

- active shell is `Meeting / Text / History / Settings` only;
- normal Settings navigation is `Meeting / History & Privacy / Advanced` only;
- Meeting Ready composition matches the approved static information hierarchy without claiming missing incoming/Start behavior;
- Text is source/target-pane based, uses explicit Translate, persists its ID/EN swap, and no longer mounts/binds the file-attachment workflow;
- Text stale/error states preserve the user's visible work rather than silently clearing or presenting an obsolete result as current;
- current entry remains `main.ts -> SimpleLauncherController -> shell`.

**LOCAL PROOF REQUIRED** for actual rendered layout/resizing, translation runtime quality, and all Windows/runtime behavior.

## Hold

- do not revive Documents, top-level Saved, file attachment translation, or the old Settings hierarchy;
- do not enable `Start Translation` by mapping it to capture-only behavior;
- do not pretend incoming translation is Ready before its actual lane exists;
- do not fake Text `Quality`/tone runtime semantics that current command ownership does not yet prove;
- do not expose fake History persistence controls before their storage contract exists;
- do not create a second shell/launcher or parallel data store;
- do not start local Windows acceptance yet;
- do not treat remaining UI/runtime gaps as one broad refactor;
- do not claim rendered success from source markup.

## Next Step

Start the next bounded source slice: **reconcile History as the unified `Recent / Saved` workspace against the existing storage/session owners**. First inspect only the current History/Saved persistence contracts and direct callers; then wire the smallest truthful collection/detail surface that can distinguish automatic Recent History from explicit Saved without inventing entries, deleting Saved through Clear History, or creating a second persistence system. If current storage ownership is insufficient, record the exact gap before adding behavior.

# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: core shell, Settings hierarchy, Meeting Ready, Text workspace, Text-backed History Recent/Saved, and History & Privacy controls are source-aligned through ChatGPT -> GitHub

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

Do not reconstruct approved product decisions from chat history when canonical
repository owners already contain them.

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Static source alignment may continue,
but rendered/device/runtime/audio/model/filesystem/package claims remain
`LOCAL PROOF REQUIRED` until the dedicated local phase.

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

UI target remains **Modern + Easy to use + Familiar**. Normal UI uses product
language rather than helper/model/audio-engineering terminology.

## Completed Source Slices

### 1. Top-level shell / navigation

- active sidebar is `Meeting / Text / History / Settings` only;
- Documents and top-level Saved are removed from the active shell;
- one current shell/controller path remains.

### 2. Normal Settings hierarchy

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

Global General/Translation/Audio destinations are no longer active. Diagnostics
stays nested under Advanced.

### 3. Meeting Ready

The active Ready surface follows the approved hierarchy and remains truthful:

```text
readiness
-> Your microphone
-> Incoming translation / Meeting sound
-> TranslateIT Meeting Microphone
-> Realtime / Auto
-> Start Translation boundary
```

Incoming remains explicitly not connected and `Start Translation` remains disabled
until the approved atomic Meeting lifecycle exists.

### 4. Text workspace

- familiar source/target panes;
- contextual persisted ID/EN Swap;
- explicit Translate + Ctrl+Enter;
- editable target;
- stale/error states preserve visible user work;
- active file-attachment translation removed;
- canonical translation runtime path preserved.

### 5. Canonical History / Saved persistence

Canonical product History is:

```text
src-tauri/src/engine/history_store.rs
src-tauri/src/commands/history.rs

UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

It provides Text Recent creation, Recent/Saved listing + type filtering, detail read,
idempotent Recent -> Saved independent copy, Remove from Saved, and Clear Recent
without touching Saved. `RuntimeSettings.history_enabled` defaults ON.

Legacy `session_chat.rs` and `session_store.rs` remain non-canonical for product
History and are not wired as a second system.

### 6. History frontend + Text Recent integration

Canonical History commands are connected through the existing `runtimeApi`.
Successful intentional Text translation writes to Recent only when `history_enabled`
is ON. A History write failure remains separate from translation success.

The active History workspace provides:

```text
Recent | Saved
Search
All | Meeting | Text
chronological collection
-> Text detail
   -> Save
   -> Remove from Saved
```

Recent/Saved collection, local search/filter, Text detail, Save, and Remove from
Saved all use the same canonical History owner. Meeting filters remain truthful but
no Meeting records are invented before canonical Meeting lifecycle writes exist.

### 7. Settings -> History & Privacy

The approved privacy controls now use the same settings and History owners:

- `Keep History` is a real On/Off control backed by
  `RuntimeSettings.history_enabled` and the existing `save_runtime_settings` path;
- turning History off changes future/current automatic retention only; it does not
  delete existing Recent or Saved items;
- save failure rolls the preference back instead of presenting an unsaved state as
  committed;
- `Clear History` uses an explicit confirmation stating that Recent Meeting/Text
  History will be deleted while Saved is unaffected;
- confirmation calls only canonical `runtimeApi.clearRecentHistory()`;
- after successful Clear Recent, cached Recent collection/detail state is invalidated
  so returning to History cannot display a deleted Recent detail from UI memory;
- Saved-scope state is not cleared by Clear History;
- Settings reports busy/result/error state inline and does not introduce a second
  privacy/storage service.

History/privacy styling is scoped within the existing History stylesheet rather than
creating another shell or visual system.

Static source proves action mapping and ownership only. Actual settings persistence,
filesystem deletion, confirmation/rendering behavior, and installed-run behavior
remain local proof later.

## Current Source Reality

Important approved gaps remain independently:

```text
Meeting History write/detail waits for canonical Meeting lifecycle
First Setup wizard / intentional defer is not implemented
global Meeting strip / cross-view live state / single-instance behavior is incomplete
atomic Start Translation and Meeting Live lifecycle are not implemented
incoming lane, turn coordination, recovery, and Stop semantics remain incomplete
Text independent Quality-default ownership, tone inference, Copy/direct Save remain incomplete
verified Meeting device-selection behavior remains incomplete
legacy unreachable helpers may remain and require bounded reachability cleanup later
installer/runtime asset proof remains later
```

Do not combine all remaining gaps into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** for the completed History/privacy slices:

- canonical History Tauri commands are reachable through the current frontend
  `runtimeApi`;
- successful Text translation has one explicit History write gate using
  `history_enabled`;
- active History UI reads the canonical Recent/Saved store rather than legacy chat
  or technical transcript stores;
- Text detail Save/Remove actions map to the same canonical owner;
- Settings History On/Off persists through the existing runtime-settings owner;
- History Off does not invoke any History deletion command;
- Clear History is confirmation-gated and maps only to `clearRecentHistory()`;
- the canonical backend Clear Recent path does not target Saved;
- controller Recent cache/detail is invalidated after successful Clear Recent;
- current application entry remains `main.ts -> SimpleLauncherController -> shell`.

**LOCAL PROOF REQUIRED** for TypeScript/build execution, actual Tauri invocation,
settings/filesystem persistence, rendered Settings/History behavior, and Windows
installed-run persistence.

## Hold

- do not wire product History to `session_chat.rs` or `session_store.rs`;
- do not create another persistent storage root or privacy service;
- do not make Saved depend on Recent lifetime;
- do not let Clear History delete Saved;
- do not invent Meeting History before Meeting lifecycle exists;
- do not revive Documents, file attachment translation, top-level Saved, or old
  Settings hierarchy;
- do not enable `Start Translation` by mapping it to capture-only behavior;
- do not start local Windows acceptance yet;
- do not claim filesystem/rendered success from static source.

## Next Step

Start the next bounded source slice: **reconcile First Setup against the approved
five-step setup model and intentional `Set up later` behavior**. First inspect only
the current startup/setup-state persistence and product readiness actions, then add
the smallest focused Setup shell that can truthfully represent Welcome, Your
Microphone, Meeting Sound, Meeting Microphone, and Verify / Ready. Persist only
setup/defer facts that are actually needed; do not persist permanent `Ready` truth,
do not block Text merely because Meeting setup is deferred, and do not enable the
atomic Meeting Start/Live lifecycle in the same slice.

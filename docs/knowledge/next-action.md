# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: core shell, Settings hierarchy, Meeting Ready, Text workspace, and Text-backed History Recent/Saved collection/detail are source-aligned through ChatGPT -> GitHub

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

Canonical History commands are now connected through the existing `runtimeApi`.
The active Text flow snapshots the completed request metadata and, only when
`history_enabled` is ON, writes a successful intentional Text translation to Recent.
A History write failure is surfaced separately and does not convert a successful
translation into a translation failure.

The active History workspace now provides:

```text
Recent | Saved
Search
All | Meeting | Text
chronological collection
-> Text detail
   -> Save
   -> Remove from Saved
```

Current behavior:

- Recent/Saved and Meeting/Text filters call the canonical store only;
- local search filters retrieved title/snippet data;
- stale asynchronous collection requests are discarded by scope/filter identity;
- Text detail reads persisted source/target/language/tone/mode metadata;
- Recent `Save` uses canonical idempotent independent-copy semantics;
- Saved `Remove from Saved` removes only Saved and leaves Recent untouched;
- History OFF does not hide/delete old History; it only prevents new Text Recent
  writes in the currently connected path;
- Meeting filters are truthful but no Meeting records are invented because the
  canonical Meeting lifecycle still does not write History;
- dedicated History CSS is mounted through the existing `main.ts` entry rather than
  creating another shell.

Static source proves wiring and ownership only. Actual filesystem persistence,
rendered layout, and installed-run behavior remain local proof later.

## Current Source Reality

Important approved gaps remain independently:

```text
History & Privacy On/Off control is not connected yet
History & Privacy Clear History confirmation/action is not connected yet
Meeting History write/detail waits for canonical Meeting lifecycle
First Setup wizard / intentional defer is not implemented
global Meeting strip / cross-view live state / single-instance behavior is incomplete
atomic Start Translation and Meeting Live lifecycle are not implemented
incoming lane, turn coordination, recovery, and Stop semantics remain incomplete
Text independent Quality-default ownership, tone inference, Copy/direct Save remain incomplete
legacy unreachable helpers may remain and require bounded reachability cleanup later
installer/runtime asset proof remains later
```

Do not combine all remaining gaps into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** for this completed History slice:

- canonical History Tauri commands are reachable through the current frontend
  `runtimeApi`;
- successful Text translation has one explicit History write gate using
  `history_enabled`;
- active History UI reads the canonical Recent/Saved store rather than legacy chat
  or technical transcript stores;
- Text detail Save/Remove actions map to the same canonical owner;
- Saved lifetime remains independent from Recent in the backend contract;
- search/filter/detail state is owned by the current controller, not a second state
  manager;
- the current application entry remains `main.ts -> SimpleLauncherController -> shell`.

No GitHub Actions workflow run was available for the current source commit during
this slice.

**LOCAL PROOF REQUIRED** for TypeScript/build execution, actual Tauri invocation,
filesystem write/read durability, rendered History behavior/resizing, and Windows
installed-run persistence.

## Hold

- do not wire product History to `session_chat.rs` or `session_store.rs`;
- do not create another persistent storage root;
- do not make Saved depend on Recent lifetime;
- do not let Clear History delete Saved;
- do not invent Meeting History before Meeting lifecycle exists;
- do not revive Documents, file attachment translation, top-level Saved, or old
  Settings hierarchy;
- do not start local Windows acceptance yet;
- do not claim filesystem/rendered success from static source.

## Next Step

Start the next bounded source slice: **connect `Settings -> History & Privacy` to the
same canonical owners**. Add a real History On/Off control backed by
`RuntimeSettings.history_enabled`, preserving existing History/Saved when turned
off, and add the approved `Clear History` confirmation/action backed only by
`runtimeApi.clearRecentHistory()`. Saved must remain untouched. Do not add Meeting
History writes or a second privacy/storage service in this slice.

# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: core shell, Settings, Meeting Ready, Text composition, and canonical History/Saved persistence foundation are source-aligned through ChatGPT -> GitHub

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

UI target remains **Modern + Easy to use + Familiar**. Normal UI uses product language rather than helper/model/audio-engineering terminology.

## Completed Source Slices

### Top-level shell/navigation

- active sidebar is `Meeting / Text / History / Settings` only;
- Documents and top-level Saved were removed from the active shell;
- one current shell/controller path remains.

### Normal Settings hierarchy

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

Global General/Translation/Audio destinations are no longer active. Text owns its contextual ID/EN direction. Diagnostics stays nested under Advanced.

### Meeting Ready

The active Ready surface follows the approved hierarchy and remains truthful:

```text
readiness
-> Your microphone
-> Incoming translation / Meeting sound
-> TranslateIT Meeting Microphone
-> Realtime / Auto
-> Start Translation boundary
```

Incoming remains explicitly not connected and `Start Translation` remains disabled until the approved atomic Meeting lifecycle exists.

### Text workspace

- familiar source/target panes;
- contextual persisted ID/EN Swap;
- explicit Translate + Ctrl+Enter;
- editable target;
- stale/error states preserve visible user work;
- active file-attachment translation removed;
- canonical text translation runtime path preserved.

### Canonical History/Saved persistence foundation

Inspection found the inherited persistence owners insufficient for approved product History:

```text
session_chat.rs
-> generic role/content chat files in SavedProject/Chat
-> no approved Meeting metadata / detail/delete/clear/save-copy semantics

session_store.rs
-> technical transcript payloads in SavedTranscript
-> not unified Recent/Saved product retrieval
```

Neither is promoted into a second active History system.

A single canonical product History owner now exists:

```text
src-tauri/src/engine/history_store.rs
src-tauri/src/commands/history.rs

UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Current persistence contract provides:

- Text Recent-entry creation contract;
- schema capable of Text detail and future Meeting chronological turns/delivery state;
- list by Recent/Saved + optional Meeting/Text filter;
- detail read;
- idempotent Recent -> Saved independent copy;
- Remove from Saved without deleting Recent;
- Clear Recent without touching Saved;
- bounded file/list/text sizes and atomic writes.

`RuntimeSettings` schema now persists `history_enabled`, default `true`, with backward-compatible serde default behavior.

Static proof only: registered Tauri commands and storage ownership are source-visible. Filesystem/runtime behavior remains local proof later.

## Current Source Reality

Important approved gaps remain independently:

```text
History frontend runtimeApi bridge is not connected yet
Text successful translations do not yet call the new Recent write command
History workspace is still a placeholder instead of Recent / Saved collection/detail
History & Privacy toggle / Clear History UI is not connected yet
Meeting History write is blocked by the missing canonical Meeting lifecycle
First Setup wizard / intentional defer is not implemented
global Meeting strip / cross-view live state / single-instance behavior is incomplete
atomic Start Translation and Meeting Live lifecycle are not implemented
incoming lane, turn coordination, recovery, and Stop semantics remain incomplete
Text Quality-default ownership, tone inference, Copy/Save semantics remain incomplete
legacy unreachable helpers may remain and require bounded reachability cleanup later
installer/runtime asset proof remains later
```

Do not combine all remaining gaps into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** for the History foundation:

- canonical `history_store.rs` exists and is registered through `commands/history.rs` and the Tauri registry;
- persistence remains under the approved existing `UserData/SavedProject` root;
- Recent and Saved use separate subdirectories and Saved is an independent copied artifact;
- Clear Recent code does not target Saved;
- inherited chat/transcript stores remain separate and are not declared canonical product History;
- `history_enabled` defaults on and has backward-compatible Rust deserialization.

**LOCAL PROOF REQUIRED** for actual filesystem writes/reads, rendered History UI, Windows behavior, and persistence across installed runs.

## Hold

- do not wire History UI to `session_chat.rs` or `session_store.rs`;
- do not create another persistent storage root;
- do not make Saved a pointer whose lifetime depends on Recent;
- do not let Clear History delete Saved;
- do not invent Meeting History records before Meeting lifecycle exists;
- do not start local Windows acceptance yet;
- do not claim filesystem/runtime success from static source.

## Next Step

Start the next bounded source slice: **connect the canonical History commands through the existing frontend runtime bridge, write successful Text translations to Recent only when `history_enabled` is on, and replace the History placeholder with the smallest truthful `Recent / Saved` collection + Text detail surface**. Preserve one current persistence owner; do not implement Meeting History writes until Meeting lifecycle exists. After that, wire History & Privacy On/Off and Clear History against the same owner rather than a separate store.

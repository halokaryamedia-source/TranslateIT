# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Meeting History Finalization Handoff is source-aligned. Full Meeting Stop now snapshots canonical committed turns after output cleanup, applies the current `history_enabled` retention policy through the existing History persistence owner, then clears transient conversation bodies. Finalized Meeting entries are readable/saveable through the existing History workspace.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> current app-shell/window lifecycle owners only for the next Plan boundary
```

## Current Mode

**Plan**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust compilation, TypeScript typecheck, static-validator execution, Tauri invocation,
filesystem persistence, rendered History/Meeting UI, microphone/model/TTS/route
execution, Pause/Resume/Stop race timing, Windows behavior, and installed operation
remain `LOCAL PROOF REQUIRED`.

## Locked Runtime / Data Shape

```text
application Meeting session
-> finalized outbound consumer
-> bounded transient committed turns in meeting_session.rs
-> Live transcript [read-only projection]

full Stop
-> revoke generation authority
-> cancel/stop route + capture + helper + outbound consumer
-> immutable final committed-turn snapshot
-> current RuntimeSettings.history_enabled
   -> ON  -> history_store.rs creates at most one Recent Meeting entry
   -> OFF -> no Recent write
-> clear transient committed turns
-> clear runtime Meeting session
```

Do not add another Meeting lifecycle store, conversation store, History database,
frontend transcript accumulator, or live incremental persistence path.

# Closed Source Boundaries

## Canonical Meeting lifecycle and transcript

Already source-aligned at bounded source claims:

- one application Meeting lifecycle owner;
- Start/Stop plus Pause/Resume generation lifecycle;
- finalized utterances rather than rolling audio enter product output;
- one bounded memory-only committed-turn store in `meeting_session.rs`;
- turn identity `(session_id, generation, utterance_id)` plus session-wide monotonic
  `sequence`;
- truthful turn states `preparing_voice / speaking / output_complete / output_failed /
  interrupted` with terminal-state protection;
- separate `get_meeting_committed_turns` projection;
- Meeting Live renders backend snapshots instead of owning conversation state.

## Meeting History Finalization Handoff

### A. Persistence owner remains canonical History

`engine/history_store.rs` remains the one persistent History owner. It now exposes
`create_meeting_recent(...)` using the existing `Recent / Saved` storage root and
existing generic History read/save/remove operations.

No Meeting-specific persistence root, database, or live History writer was added.

The History schema advances to version 2 only to preserve explicit bounded-transcript
truth through:

```text
dropped_turn_count
```

The field has a serde default, so existing schema-v1 entries remain readable. Existing
Text entries set it to zero. History's own turn bound also increments the count if it
ever removes older turns during sanitization.

### B. Finalization order

`stop_meeting_translation()` keeps safety ownership first:

```text
revoke current generation authority
-> interrupt non-terminal current-generation turns
-> cancel Meeting route
-> stop capture
-> cancel helper work
-> join serialized outbound consumer
-> take immutable committed-turn snapshot
-> apply History retention handoff
-> clear transient turn state
-> clear Meeting runtime session
```

The snapshot occurs after the matching outbound consumer has stopped, so the History
handoff does not race an intentionally still-running canonical producer.

Pause and Resume do not persist History.

### C. Retention semantics

At Stop, the backend reads current persisted `RuntimeSettings.history_enabled`.

```text
History ON
-> convert retained committed turns to HistoryTurn
-> create at most one Recent Meeting entry keyed by canonical session id

History OFF
-> do not call the History persistence owner
-> discard transient conversation bodies during Stop cleanup
```

An empty finalized Meeting creates no empty Recent entry. Existing Recent/Saved data is
not deleted. Saved remains an explicit action.

A History write failure does not block safety-critical Stop or keep an orphan live
Meeting session; the Stop result reports the persistence failure and transient bodies
are still cleared.

### D. Persistent Meeting entry

The existing `HistoryEntry` contract now stores finalized Meeting metadata with:

```text
entry_type = meeting
title = Meeting Translation
created/updated time
session duration
interrupted flag
source_language = id
target_language = en
tone = Auto
mode = Realtime
dropped_turn_count
turns[]
```

Each persisted turn carries chronological sequence, lane, source text, translated
text, truthful delivery state, and creation timestamp. Raw microphone/Meeting audio
and generated TTS are never persisted as normal History content.

### E. History product surface

The existing History collection already understands Meeting rows. Meeting detail is
now connected to the same persisted `HistoryEntry.turns` data:

```text
YOU
Indonesian final transcript      [primary]
English verified translation     [secondary]
delivery state
```

Duration/interrupted metadata and bounded-turn truncation are shown when applicable.
The existing generic Save / Remove from Saved actions now apply to both Text and
Meeting entries. No second Meeting History UI/store was introduced.

## Static regression definition

`validate_startup_runtime_readiness.mjs` now defines checks for:

- canonical committed-turn ownership and read-only Live transcript behavior;
- Stop-only Meeting History finalization;
- safety/resource cleanup before snapshot/persistence and transient clear afterward;
- current `history_enabled` retention gate;
- `create_meeting_recent` under the canonical History store;
- schema-v2 backward-compatible `dropped_turn_count` contract;
- Meeting History detail rendering and Saved reuse;
- absence of conversation bodies from `MeetingSessionStatus` and `runtime_state.rs`.

The validator was **not executed** in this channel. It is source-contract definition,
not executable PASS evidence.

# Static Proof State

**CURRENT-PROJECT VERIFIED** at source level:

1. Live conversation bodies remain owned by the bounded `meeting_session.rs` transient store;
2. Meeting History persistence is performed only during full Stop/finalization, not Pause/Resume or Live processing;
3. Stop snapshots turns after matching outbound cleanup and before transient/session clear;
4. current persisted `history_enabled` controls whether a Recent Meeting entry is created;
5. History OFF performs no Meeting Recent write and transient bodies are cleared;
6. the canonical History store creates at most one Recent entry for a finalized session and reuses the existing Recent/Saved root;
7. persisted Meeting turns preserve delivery state and disclose prior live-bound truncation;
8. existing History collection/detail and generic Saved actions now support Meeting entries;
9. raw audio/TTS and conversation bodies are not added to normal logs/Diagnostics/lifecycle status.

No build/typecheck/validator execution, Tauri persistence invocation, rendered UI,
model/audio/device, race timing, or Windows proof was obtained.

# Known Gaps Kept Truthful

- global/cross-view Meeting indicator and close-live safety handling remain incomplete;
- incoming Meeting Sound / `INCOMING` turns and self-output suppression remain unimplemented;
- approved tone/context does not yet reach canonical inference;
- Text Copy/direct Save remains incomplete;
- `uv.lock`, model acquisition metadata, and packaging remain incomplete;
- all compile/test/model/audio/performance/installed proof remains deferred locally.

# Hold

- do not make History the live transcript store;
- do not add incremental Meeting History writes while Live/Paused;
- do not create a separate Meeting persistence root or Saved semantics;
- do not add incoming Meeting Sound, Svelte, packaging, benchmark, or Windows acceptance
  into the next lifecycle-shell planning boundary.

## Next Step

Plan the **Global Meeting Cross-View State + Safe Close Lifecycle Boundary**. Resolve
which existing shell/window owners should present the already-canonical application
Meeting state outside the Meeting workspace and enforce the approved `Stop & Close`
behavior without creating a second Meeting lifecycle store or control plane.
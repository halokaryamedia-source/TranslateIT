# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Canonical Committed Meeting Turn Source + Live Transcript Read Path is source-aligned. `meeting_session.rs` now owns one bounded transient committed-turn store, `get_meeting_committed_turns` exposes a read-only snapshot, and the existing Meeting Live surface renders chronological outbound `YOU` turns without frontend accumulation or persistent History writes.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> commands/meeting_session.rs
-> engine/history_store.rs + commands/history.rs
-> current History frontend direct consumer only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust compilation, TypeScript typecheck, static-validator execution, Tauri invocation,
rendered transcript behavior, microphone/model/TTS/route execution, Pause/Resume race
timing, Windows behavior, and installed operation remain `LOCAL PROOF REQUIRED`.

## Locked Runtime Shape

```text
Normal Meeting UI
-> runtimeProductFacade / runtimeApi
-> canonical application Meeting session
   -> session_id + generation authority
   -> finalized utterance producer
   -> serialized outbound consumer
      -> final Indonesian ASR transcript
      -> verified Realtime English translation
      -> bounded committed-turn transient state
      -> TTS / Meeting Microphone delivery
   -> get_meeting_committed_turns [read-only projection]
      -> Meeting Live transcript presentation
```

Do not add another Meeting lifecycle store, conversation store, frontend transcript
accumulator, worker/Diagnostics transcript source, or persistent live-conversation
database.

# Closed Source Boundaries

## Engine / lifecycle baseline

Already source-aligned at their bounded claims:

- one persistent Python AI worker and one helper scheduler;
- Meeting outbound owns Realtime; Text owns Quality;
- finalized utterances, not rolling preview audio, enter product Meeting output;
- application Meeting Start/Stop is canonical and navigation-independent;
- Pause retains `session_id`, invalidates old-generation authority, and clears matching
  pending output work;
- Resume creates fresh generation authority for the same session;
- normal frontend consumes canonical Meeting lifecycle without a second store;
- Meeting Live activity presentation reads canonical outbound stage only.

## Canonical committed Meeting turns — source aligned

### A. One transient owner

`commands/meeting_session.rs` owns the live committed-turn body state. It now contains a
bounded memory-only `VecDeque` scoped to the current application Meeting `session_id`.

Explicit non-owners remain:

```text
runtime_state.rs             -> lifecycle/generation authority only
Python worker                -> inference execution only
rolling audio / Diagnostics  -> preview/evidence only
frontend                     -> read-only presentation only
history_store.rs             -> persistent finalized History only
```

### B. Commitment boundary

A turn is inserted only after:

```text
finalized utterance
-> final Indonesian transcript
-> verified-complete Realtime English translation
-> generation still authoritative
```

Canonical transient fields:

```text
session_id
sequence
generation
utterance_id
lane = you
source_text
translated_text
delivery_state
created_unix_ms
updated_unix_ms
```

Identity/dedupe is `(session_id, generation, utterance_id)`. `sequence` is monotonic for
the whole Meeting session, so chronology continues across Resume generations.

The live store is bounded to an implementation safety limit. If old turns are dropped,
its snapshot exposes `dropped_turn_count` and `truncated`; the UI does not claim a
complete session transcript.

### C. Truthful delivery state

Committed outbound turns use:

```text
preparing_voice
speaking
output_complete
output_failed
interrupted
```

TTS/route failure after text commitment updates the turn to `output_failed`.
Successful guarded output becomes `output_complete`. `output_complete` means the
TranslateIT-side guarded output attempt completed; it does not claim a remote
participant heard it.

`output_complete`, `output_failed`, and `interrupted` are terminal. Late/stale callbacks
cannot overwrite them. Pause/Stop authority loss interrupts non-terminal turns from
the revoked generation; Pause retains the transcript and Resume appends new-generation
turns into the same session chronology.

ASR/translation failure before verified translated text exists does not manufacture a
transcript turn.

### D. Separate product read projection

Conversation bodies are not attached to `get_meeting_session_status`.

A separate registered command now owns the read boundary:

```text
get_meeting_committed_turns
```

`runtimeApi.ts` exposes a typed `MeetingCommittedTurnsSnapshot`. The frontend receives
snapshots only; it does not append/merge them into another authoritative store.

The Meeting Live presentation checks that the transcript snapshot belongs to the same
`session_id` as the lifecycle snapshot before rendering it, preventing a transition
race from presenting a different session's turns.

### E. Meeting Live transcript

The existing `MeetingLiveActivityPresentation.ts` now keeps the activity region and
adds a chronological transcript region beneath it.

Current outbound turns render as:

```text
YOU
Indonesian final transcript      [primary]
English verified translation     [secondary]
truthful delivery state
```

The transcript is reconstructed from the backend snapshot on refresh rather than
accumulated as browser-owned conversation state. Empty, unavailable, and bounded-
truncation states are explicit. User text is inserted with DOM `textContent`, not
worker-response HTML.

Incoming `INCOMING` turns remain out of scope because the incoming Meeting lane is not
implemented.

### F. Lifecycle cleanup

A new Meeting Start resets the transient turn store. Start rollback clears it. Pause
retains it. Resume reuses it. Full Stop interrupts current non-terminal turns and
clears transient conversation bodies because persistent Meeting History finalization
has not yet been implemented.

The next History slice must insert its allowed immutable handoff before this final
transient clear; it must not turn History into the live source.

## Static regression definition

`validate_startup_runtime_readiness.mjs` now defines source checks that:

- `get_meeting_committed_turns` is registered and exposed through `runtimeApi`;
- committed bodies and bounded turn state exist in `meeting_session.rs`;
- `MeetingSessionStatus` remains body-free/lightweight;
- `runtime_state.rs` remains conversation-body-free;
- Meeting Live reads committed-turn snapshots and checks session identity;
- frontend does not call Meeting lifecycle mutations or scrape worker/legacy pipeline
  transcript state;
- `meeting_session.rs` does not write directly to History in this slice;
- transcript presentation styles exist.

This validator was **not executed** in this channel. It remains a static source-contract
definition, not executable PASS evidence.

# Static Proof State

**CURRENT-PROJECT VERIFIED** at source level:

1. one backend Meeting outbound/session owner now holds committed conversation bodies;
2. turn commitment occurs after final transcript + verified translation and current-generation checks;
3. dedupe identity uses session/generation/utterance while chronology uses a session-wide monotonic sequence;
4. delivery states are bounded and terminal states reject stale overwrites;
5. Pause retains prior turns and interrupts non-terminal revoked-generation turns; Resume keeps chronology with a fresh generation;
6. `get_meeting_committed_turns` is a separate read-only Tauri/API projection;
7. Meeting Live renders backend snapshots as `YOU` turns with Indonesian primary, English secondary, and delivery state;
8. snapshot/session identity mismatch is not rendered as current transcript;
9. bounded transcript truncation is disclosed;
10. persistent History, worker/Diagnostics, lifecycle status, and frontend accumulation are not competing body owners.

No Rust/TypeScript build, validator execution, Tauri invocation, rendered UI,
microphone/model/audio, race timing, or Windows runtime proof was executed.

# Known Gaps Kept Truthful

- Meeting History finalization/persistence from committed turns is not implemented;
- current Stop therefore clears transient turns without creating Recent Meeting History;
- incoming Meeting Sound / `INCOMING` transcript turns remain unimplemented;
- global/cross-view Meeting strip and close-live handling remain incomplete;
- approved tone/context does not yet reach canonical inference;
- Text Copy/direct Save remains incomplete;
- `uv.lock`, model acquisition metadata, and packaging remain incomplete;
- all compile/test/model/audio/performance/installed proof remains deferred locally.

# Hold

- do not make History the live transcript store;
- do not add incremental persistent writes merely to keep Live transcript current;
- do not add conversation bodies to Diagnostics/logs/status payloads;
- do not build incoming turns, global strip/close handling, Svelte, packaging,
  benchmark, or Windows acceptance into the next persistence slice;
- Saved remains an explicit independent ownership action.

## Next Step

Implement **Meeting History Finalization Handoff** as one bounded source slice:
convert an immutable final committed-turn snapshot into one canonical Recent Meeting
History entry only when current `RuntimeSettings.history_enabled` permits retention,
then clear transient conversation bodies. History-off must discard the transient body;
Saved remains unchanged and no live incremental History writes are introduced.

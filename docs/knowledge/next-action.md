# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **The Canonical Committed Meeting Turn Source Boundary is planned and ownership-resolved. The existing `meeting_session.rs` outbound/session boundary will own one bounded transient committed-turn store; frontend, worker, Diagnostics, `runtime_state.rs`, and persistent History will not become competing Live transcript owners. Source implementation is next.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> commands/meeting_session.rs
-> runtimeApi.ts + MeetingLiveActivityPresentation.ts direct consumer
-> history_store.rs only as the later persistence contract
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Rust compilation, TypeScript typecheck,
static-validator execution, Tauri invocation, Python/model execution,
microphone/VAD behavior, scheduler/cancellation timing, Windows TTS/audio, Meeting
Microphone delivery, rendered UI, and installed operation remain
`LOCAL PROOF REQUIRED`.

## Locked Runtime Shape

```text
Normal Meeting UI
-> runtimeProductFacade / runtimeApi
-> canonical application Meeting session
   -> session_id + generation authority
   -> capture
   -> finalized utterance producer
   -> serialized outbound consumer
      -> final ASR transcript
      -> verified Realtime translation
      -> committed-turn transient state       [next implementation]
      -> TTS / Meeting Microphone delivery
   -> helper scheduler / persistent Python worker
```

Do not add another Meeting store/controller/service, worker, finalizer, scheduler,
readiness authority, capture path, lifecycle owner, frontend transcript accumulator,
or persistent live-conversation database.

# Closed Source Boundaries

## Engine / lifecycle baseline

Already source-aligned at their bounded claims:

- one persistent Python AI worker and one helper scheduler;
- Meeting outbound owns Realtime; Text owns Quality;
- finalized utterances, not rolling preview audio, enter product Meeting output;
- stale Meeting generations are rejected;
- application Meeting Start/Stop is canonical and navigation-independent;
- Pause preserves the `session_id`, invalidates old-generation authority, and clears
  matching pending output work;
- Resume creates fresh generation authority for the same session and reopens required
  resources transactionally;
- normal frontend consumes the canonical Meeting lifecycle without a second store;
- the current Live activity region is read-only and uses canonical outbound stage
  status only.

Actual runtime/device/render proof remains local.

# Canonical Committed Meeting Turn Plan — Closed Planning Boundary

## A. Semantic owner

The transient conversation-body owner is the **existing application Meeting outbound/
session boundary in `commands/meeting_session.rs`**.

Why this owner:

- it already receives `session_id + generation + utterance_id`;
- it already validates generation authority between AI/output stages;
- it is the first current boundary where final Indonesian ASR text and
  verified-complete English translation coexist;
- it also sees TTS/output progression required for truthful delivery state.

Explicit non-owners:

```text
runtime_state.rs             -> lifecycle/generation authority only
Python worker                -> inference execution only
rolling audio / Diagnostics  -> preview/evidence only
frontend                     -> read-only presentation
history_store.rs             -> persistent finalized History only
```

## B. Minimum transient turn contract

A turn enters canonical transient state only after:

```text
finalized utterance
-> final Indonesian transcript
-> verified-complete Realtime English translation
-> same generation still authoritative
```

Minimum fields:

```text
session_id
sequence                 # monotonically increasing for the whole Meeting session
generation
utterance_id              # generation-local finalized utterance id
lane = you                # current outbound-only slice
source_text               # final Indonesian transcript
translated_text           # verified English translation
delivery_state
created_unix_ms
updated_unix_ms
```

Identity/idempotency:

```text
(session_id, generation, utterance_id)
```

`sequence` is separate because Resume creates a fresh generation and generation-local
utterance ids may repeat. It provides one stable chronological order and maps to the
existing `HistoryTurn.sequence` contract later.

## C. Delivery-state contract

Initial product states are deliberately small:

```text
preparing_voice
speaking
output_complete
output_failed
interrupted
```

Rules:

- new committed turn starts `preparing_voice`;
- after usable TTS exists and Meeting output is entering guarded delivery, it may
  become `speaking`;
- successful TranslateIT-side guarded output completion becomes `output_complete`;
- TTS/route failure after text commitment becomes `output_failed`;
- Pause/Stop authority loss converts any non-terminal turn from the revoked generation
  to `interrupted`;
- `output_complete`, `output_failed`, and `interrupted` are terminal and cannot be
  overwritten by late/stale callbacks.

`output_complete` never means a remote participant definitely heard the audio.

ASR/translation failure before final translated text exists does **not** manufacture a
committed transcript turn; the existing activity/error state remains the truthful
surface.

## D. Lifecycle and bounds

The committed-turn store is:

- memory-only;
- scoped to one application Meeting `session_id`;
- bounded for long sessions;
- initialized/reset for a new Meeting session;
- retained across Pause and Resume for that same session;
- cleared on full Stop/finalization after any allowed later History handoff.

Pause keeps terminal historical turns visible and marks the revoked generation's
non-terminal turn interrupted. Resume appends fresh-generation turns using the same
session sequence.

If the live bound drops old turns, the read snapshot must expose a dropped/truncated
count (or equivalent explicit marker). The UI must not claim it still holds the full
session transcript.

Exact bound constants are implementation safety values, not product guarantees; they
should remain compatible with the existing History safety boundary rather than create
an unbounded second policy.

## E. Product read path

Do **not** attach conversation bodies to `get_meeting_session_status`; that command
remains the lightweight lifecycle/activity source.

Implement a separate read-only projection from the same owner, planned as:

```text
get_meeting_committed_turns
```

The frontend bridge may expose a typed snapshot for the current application Meeting.
The Meeting Live view renders that snapshot chronologically but does not append/merge
turns into a durable frontend store. Returning to Meeting after navigation simply
reads the same backend transient state again.

Conversation bodies must not be copied into Developer Diagnostics, normal logs, worker
status JSON, or startup/readiness payloads.

## F. History/privacy handoff — contract decided, implementation later

`history_store.rs` remains the only persistent History owner. It already defines a
Meeting-compatible `HistoryEntry` / `HistoryTurn` shape with sequence, lane, source
text, translation, delivery state, and timestamp.

A later full Meeting finalization slice may convert an **immutable committed-turn
snapshot** into one Recent Meeting entry.

Retention rule:

```text
full Meeting finalization
-> read current RuntimeSettings.history_enabled
-> ON  -> automatic Recent handoff may persist the finalized Meeting snapshot
-> OFF -> discard transient conversation bodies; do not create Recent History
```

Existing Recent/Saved data is never deleted by this decision. Saved remains explicit
and independent. Raw microphone/Meeting audio and generated TTS never become normal
History content.

No live incremental History writes are required to power the transcript UI; History
must not become the Live transcript owner.

# Planned Implementation Slice

Implement **Canonical Committed Meeting Turn Source + Live Transcript Read Path**.

In scope:

1. bounded transient turn state inside the existing `meeting_session.rs` semantic owner;
2. exactly-once turn commitment after verified translation under authoritative generation;
3. monotonic session sequence + terminal delivery-state updates and Pause/Stop interruption;
4. one read-only Tauri/API projection for current committed turns;
5. current Meeting Live surface renders chronological outbound `YOU` turns from that
   projection while preserving the existing activity region and lifecycle controls;
6. static source-contract validation for ownership/non-owner boundaries.

Out of scope:

- persistent Meeting History write/finalization;
- incoming Meeting Sound / `INCOMING` turns;
- translation context consumption;
- global Meeting strip / close-live handling;
- Svelte/packaging/benchmark/local Windows acceptance.

## Acceptance criteria

1. **One source owner:** committed body state exists only in the canonical backend
   Meeting outbound/session boundary; frontend/History/worker/runtime-state do not
   duplicate ownership.
2. **Correct commitment:** a turn appears only after final transcript + verified
   translation and authoritative generation, deduped by session/generation/utterance.
3. **Lifecycle safety:** Pause/Stop cannot allow late callbacks to overwrite terminal
   turn state; Resume continues session chronology with fresh generation identity.
4. **Truthful read UI:** Live transcript reads backend snapshots, shows Indonesian as
   primary and English as secondary with truthful delivery state, and discloses bounded
   truncation when applicable.
5. **Scope/privacy:** no conversation body is added to logs/Diagnostics/status payloads
   or persistent History in this slice.

# Proof Budget

`ChatGPT -> GitHub` may prove:

- exact owner/store/read-command source wiring;
- identity/state-transition guards;
- direct frontend caller path;
- absence of forbidden alternative body stores/History writes in the bounded slice;
- static validator definition and canonical documentation consistency.

Still `LOCAL PROOF REQUIRED`:

- Rust/TypeScript compilation;
- validator execution;
- Tauri invocation;
- rendered transcript behavior/scrolling;
- actual microphone/model/TTS/route output;
- Pause/Resume race timing;
- Windows runtime behavior.

## Next Step

Implement **Canonical Committed Meeting Turn Source + Live Transcript Read Path** as
the bounded Developing slice above. Meeting History finalization remains the next
separate persistence boundary after this source is established.

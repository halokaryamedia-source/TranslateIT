# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Reliable bidirectional translation routing and Incoming-Failure-Is-Nonblocking Outbound Delivery are source-aligned at their bounded contracts. Required outbound ID -> EN no longer returns failure solely because optional incoming self-output suppression is unavailable: incoming is disabled/ignored before the same outbound Meeting Microphone route continues. No Rust/validator/Windows runtime proof has been obtained. The next stale dependency is automatic Meeting Stop -> History persistence, which is outside the simplified initial translation core.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/01-product-overview.md
-> docs/foundation/02-product-requirements.md
-> .agents/skills/development-brief/SKILL.md
-> inspect meeting_session.rs Stop + history_store/history direct contracts only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust/TypeScript/Python execution, static-validator execution, model files/load,
translation quality, CUDA/CPU latency, Windows audio, suppression effectiveness,
rendered UI, persistence behavior, and installed operation remain
`LOCAL PROOF REQUIRED`.

# Closed Source Slice — Reliable Bidirectional Translation Core

The one persistent worker routes translation by language direction:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

Realtime/Quality compatibility fields may still exist at old direct callers, but they
no longer select the model. Required outbound readiness depends on ID -> EN; optional
reverse readiness is reported separately.

Translation safety remains fail-closed for unsafe content:

```text
no silent character truncation
truncation=False
verify model/tokenizer input limit
reject oversized source
verify EOS completion
reject known incomplete output
```

No Tone, previous-turn context, History context, second worker, or cloud fallback was
added.

# Closed Source Slice — Incoming Failure Is Nonblocking

## A. Healthy incoming still protects against self-output

The existing session-scoped suppression guard remains the normal path:

```text
outbound English TTS ready
-> begin_self_output_suppression
-> reset incoming speech boundary
-> suppression ON
-> guarded Meeting Microphone route
-> suppression guard drops
-> incoming resumes from a fresh boundary
```

No second suppression/audio owner was created.

## B. Suppression failure no longer rejects required outbound

The stale outbound failure branch was removed. Current source instead does:

```text
begin_self_output_suppression unavailable
-> clear finalized incoming producer immediately
-> stop Meeting Sound capture best-effort
-> mark incoming stage = disabled / degraded
-> incoming_session_is_eligible rejects disabled lane promotion
-> execute the same required outbound Meeting Microphone route
```

Therefore optional incoming safety cannot be the sole reason a generation-authoritative
outbound TTS turn returns `output_failed`.

Clearing the incoming producer before route dispatch ensures still-open Meeting Sound
callbacks have no finalized speech owner to feed while cleanup completes. An in-flight
incoming AI result also rechecks lane eligibility before promotion and is rejected once
the lane is disabled.

## C. Outbound failure ownership remains narrow

Outbound may still fail for its own required boundaries, including:

```text
stale generation
ASR failure
ID -> EN translation failure
TTS generation failure
Meeting Microphone route failure
```

Optional incoming suppression failure is not on that list anymore.

## D. Static validation definition

`validate_startup_runtime_readiness.mjs` now defines checks that:

- healthy suppression is attempted before outbound route dispatch;
- suppression failure calls the canonical incoming-disable path;
- the finalized incoming producer is cleared and Meeting Sound capture is stopped
  best-effort;
- disabled incoming is rejected from later promotion;
- old `suppression_unavailable` outbound result/blocker markers are absent;
- the required outbound route still executes exactly through the existing route owner.

The validator was **not executed** in this channel.

# Known Proof Limits

No claim is made that:

- Windows Meeting Sound actually stops at the intended instant;
- self-output suppression works against real mixed meeting audio;
- a disabled in-flight incoming request races correctly on target hardware;
- Meeting Microphone delivery succeeds;
- ID -> EN / EN -> ID model assets load or translate correctly;
- current Rust source compiles.

Those remain local proof.

# Next Developing Slice — Remove Stop Persistence From Core

## Goal

Remove automatic Meeting Stop -> History persistence from the initial translation core
so stopping translation is only responsible for safe runtime shutdown and transient
conversation cleanup.

Target behavior:

```text
Stop Translation
-> revoke outbound authority
-> stop required/optional audio resources
-> cancel/join active Meeting work
-> clear transient current-session transcript/state
-> Ended
```

No History write is required for Stop success.

## In scope

1. remove `finalize_meeting_history` from the canonical Stop path;
2. remove History store/settings imports from `meeting_session.rs` when no longer needed;
3. keep transient committed turns for Live display, then clear them on Stop;
4. keep safe Stop & Close delegated to the same canonical Stop owner;
5. update validator/canonical docs so persistence is not a core success dependency.

## Out of scope

- deleting every History/Saved source file in the same slice;
- UI/navigation pruning;
- Pause/Resume removal;
- model/download/packaging work;
- local Windows acceptance.

## Acceptance criteria

1. Meeting Stop has no call to `create_meeting_recent` / `finalize_meeting_history`;
2. persistence failure/state cannot affect Stop completion because persistence is no
   longer invoked by Stop;
3. transient committed turns are still available while Live and cleared after Stop;
4. safe native/application close continues to call the same canonical Stop;
5. existing History source may remain disconnected/deferred without becoming a second
   Meeting transcript owner.

# Hold

- do not reintroduce Tone/Context or Realtime/Quality product modes;
- do not add another translation worker;
- do not use cloud fallback;
- do not broaden Stop cleanup into full History UI deletion;
- do not begin local acceptance inside this source cleanup slice.

## Next Step

Implement **Remove Meeting Stop -> History Persistence From Initial Core** in the
canonical Meeting Stop path, then continue pruning stale initial-product features.
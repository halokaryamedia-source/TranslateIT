# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps the simplified product to current source owners. It is not a backlog or
runtime proof report. `docs/knowledge/next-action.md` owns the single continuation.

Status vocabulary:

```text
ALIGNED  -> current owner matches the simplified product boundary
PARTIAL  -> useful owner exists but behavior/proof is incomplete
STALE    -> source implements behavior removed/deferred from initial core
MISSING  -> required simplified-core behavior has no valid current implementation
```

## Executive Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `main.ts`, `shell.ts`, `SimpleLauncherController.ts` | **STALE / PRUNE** | Current source still exposes History and old Meeting controls; initial product is Meeting / Text / Settings only. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **PARTIAL / SIMPLIFY** | One canonical session owner is valid; Pause/Resume behavior is no longer initial product scope. |
| Physical microphone capture | `engine/audio/live_capture.rs` | **ALIGNED / WINDOWS PROOF LATER** | Required outbound capture owner. |
| Finalized speech boundary | `engine/audio/finalized_utterance.rs` | **ALIGNED BASE / SIMPLIFY** | Finalized stable speech/event identity remains useful; no initial product need for context machinery. |
| Meeting Sound capture | `engine/audio/meeting_sound_capture.rs` | **PARTIAL / OPTIONAL** | Distinct incoming loopback owner exists; incoming must never block required outbound. |
| Translation worker | `realtime_local_worker.py` | **MISSING CORE BIDIRECTIONAL CONTRACT** | Current Realtime path is Marian ID->EN only; Quality path uses NLLB. Initial product requires one bidirectional ID<->EN behavior. |
| Meeting outbound AI | `meeting_session.rs` -> helper -> worker | **PARTIAL** | ID ASR -> ID->EN -> TTS wiring exists, but actual model/audio proof is local. |
| Meeting incoming AI | `meeting_session.rs` -> helper -> worker | **BROKEN BY CURRENT MODEL CONTRACT** | Source asks Realtime EN->ID while worker explicitly rejects that direction. |
| Self-output suppression | `meeting_session.rs` + `meeting_sound_capture.rs` | **STALE FAILURE POLICY / SIMPLIFY** | Own-TTS protection is useful, but suppression failure currently may block outbound; new policy says disable/degrade incoming instead. |
| Helper scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **ALIGNED BASE** | One scheduler/worker remains; outbound > incoming > Text > diagnostics. |
| Live transcript | transient committed-turn store + `MeetingLiveActivityPresentation.ts` | **ALIGNED BASE / SIMPLIFY** | Keep transient finalized transcript for current session; no persistence dependency. |
| History / Saved | `history_store.rs`, History commands/frontend | **STALE / DEFERRED** | Existing source is outside initial core and must not be required by Meeting/Text success. |
| Meeting History Stop handoff | `meeting_session.rs` -> `history_store.rs` | **STALE / REMOVE FROM CORE** | Stop should not depend on persistence in initial core. |
| Text translation | `text_translate.rs` -> helper -> worker | **PARTIAL / SIMPLIFY** | Explicit Text action is valid; current Quality-mode dependency must converge with one bidirectional engine behavior. |
| Tone | settings/UI assumptions | **STALE / DEFERRED** | Auto/Formal/Casual removed from initial core. |
| Meeting context | no canonical inference path | **DEFERRED BY POLICY** | Current utterance only; do not add context now. |
| Global safe close | `GlobalMeetingShell.ts`, native `main.rs` -> canonical Stop | **ALIGNED BASE** | Keep Stop-before-close safety; remove only dependencies on deferred persistence/lifecycle complexity. |
| Audio Studio/custom voice | existing advanced/source boundaries | **STALE FOR INITIAL CORE** | Deferred until translator is proven. |

## 1. Simplified Product Flow

```text
Meeting
ID microphone speech
-> finalized utterance
-> local ASR
-> one canonical ID -> EN translation behavior
-> English TTS
-> Meeting Microphone

Optional incoming
Meeting Sound EN speech
-> finalized utterance
-> local ASR
-> same canonical EN -> ID translation behavior
-> local transcript only

Text
ID <-> EN source
-> same canonical translation behavior
-> result
```

Normal users do not select model/provider, tone, Realtime/Quality mode, context, queue,
or worker internals.

## 2. Translation Engine Is The Current Primary Gap

Current worker source has two implementation paths:

```text
Realtime -> marianmt-id-en
Quality  -> nllb-200-distilled-600M
```

The Realtime implementation explicitly allows only ID -> EN. Current incoming Meeting
source requests EN -> ID using Realtime, so the source tree does not currently satisfy
the product's two-direction translation contract.

The next implementation must establish one bidirectional ID <-> EN path and remove the
normal product dependency on the Realtime/Quality split. Exact model/provider remains an
implementation choice subject to target-PC quality/latency/memory proof.

## 3. Required Meeting Owners To Preserve

Keep one owner per responsibility:

```text
runtime_state.rs / meeting_session.rs
-> one application Meeting authority

live_capture.rs
-> physical microphone

finalized_utterance.rs
-> stable finalized speech/event identity

helper_bridge + helper_bridge_runtime
-> one local AI scheduler/worker bridge

realtime_local_worker.py
-> ASR / translation / TTS provider execution

virtual Meeting Microphone owners
-> translated English delivery
```

Do not build a replacement parallel engine while pruning old features.

## 4. Incoming Must Be Subordinate To Outbound

Incoming remains optional because required outbound is the core product.

```text
incoming healthy
-> EN -> ID transcript available

incoming capture / suppression / ASR / translation fails
-> incoming unavailable/degraded
-> required ID -> EN outbound continues
```

Own-TTS suppression remains a valid safety mechanism only while it stays subordinate to
outbound. If suppression cannot be established, the incoming lane should be stopped or
ignored; outbound TTS must not fail solely because optional incoming protection is
unavailable.

Automatic mid-session default-output rebind remains deferred.

## 5. Finalized Transcript Remains Transient

One bounded transient committed-turn store may remain for the active Meeting view.
It is useful for:

- current-session comprehension;
- truthful final transcript display;
- chronological YOU / optional INCOMING ordering.

It is **not** permission to keep History/Saved as a core translation dependency.
Initial Stop should clear transient bodies after resource cleanup.

## 6. Deferred Source To Remove Or Disconnect

The simplification implementation should remove/disconnect initial product paths for:

```text
Pause / Resume
Push to Talk
Stop Voice
Speak Now / Cancel coordination
partial translated subtitles
Auto / Formal / Casual tone controls
Realtime / Quality user modes
conversation-context prompting
History / Saved navigation and automatic persistence
Meeting Stop -> History finalization dependency
Audio Studio/custom voice initial-product flow
Document Translation
```

Prefer actual removal/disconnection over compatibility layers that preserve competing
behavior.

## 7. UI Target

Initial normal UI:

```text
Meeting
├─ readiness
├─ microphone / optional Meeting Sound / Meeting Microphone
├─ Start Translation
├─ finalized live transcript
└─ Stop Translation

Text
├─ ID <-> EN direction
├─ source / result
├─ Translate
└─ Copy

Settings
├─ Meeting
└─ Advanced / Diagnostics
```

No normal tone/mode/context/persistence controls.

## 8. Static Vs Runtime Proof

ChatGPT -> GitHub may prove ownership and wiring changes only.

Local Windows proof is still required for:

- final ASR;
- ID -> EN translation;
- EN -> ID translation;
- translation quality and completion;
- TTS;
- Meeting Microphone delivery;
- Meeting Sound loopback;
- latency/memory/contention;
- Stop/Close race behavior;
- installed runtime.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Product scope has been simplified. The immediate implementation task is to align the
current source with that smaller product, beginning with the translation worker/runtime
because the current EN -> ID Meeting path is not valid.

The single continuation is `docs/knowledge/next-action.md`.

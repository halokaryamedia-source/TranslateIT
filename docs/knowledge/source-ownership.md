# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps the simplified product to current source owners. It is not a backlog or
runtime proof report. `docs/knowledge/next-action.md` owns the single continuation.

Status vocabulary:

```text
ALIGNED  -> current owner matches the simplified source boundary
PARTIAL  -> useful owner exists but behavior/proof is incomplete
STALE    -> source implements behavior removed/deferred from initial core
MISSING  -> required simplified-core behavior has no valid current implementation
```

## Executive Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `main.ts`, `shell.ts`, `SimpleLauncherController.ts` | **STALE / PRUNE** | Source still exposes History and old Meeting controls; initial product target is Meeting / Text / Settings. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **PARTIAL / SIMPLIFY** | One canonical session owner is valid; Pause/Resume is no longer initial product scope. |
| Physical microphone capture | `engine/audio/live_capture.rs` | **ALIGNED / WINDOWS PROOF LATER** | Required outbound capture owner. |
| Finalized speech boundary | `engine/audio/finalized_utterance.rs` | **ALIGNED BASE / SIMPLIFY** | Finalized stable speech/event identity remains useful. |
| Meeting Sound capture | `engine/audio/meeting_sound_capture.rs` | **PARTIAL / OPTIONAL** | Distinct incoming loopback owner exists; actual Windows behavior is local proof. |
| Translation worker | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | One persistent worker routes ID->EN to `marianmt-id-en` and EN->ID to `marianmt-en-id` by language direction; no NLLB/mode-based model routing remains. |
| Translation safety | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; input limit and EOS-completion guards remain before promotion. |
| Meeting outbound AI | `meeting_session.rs` -> helper -> worker | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Explicit ID->EN request reaches same direction-based worker, then TTS/route. |
| Meeting incoming AI | `meeting_session.rs` -> helper -> worker | **SOURCE ALIGNED CONTRACT / MODEL PROOF LATER** | Explicit EN->ID request selects reverse Marian direction; actual reverse model asset/load/quality remains unproved. |
| Self-output suppression | `meeting_session.rs` + `meeting_sound_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | Healthy incoming is suppressed during TranslateIT playback; if suppression cannot be established, incoming is disabled/ignored and required outbound continues. |
| Helper scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **ALIGNED BASE** | One scheduler/worker remains; outbound > incoming > Text > diagnostics. |
| Live transcript | transient committed-turn store + `MeetingLiveActivityPresentation.ts` | **ALIGNED BASE / SIMPLIFY** | Keep transient finalized current-session transcript; persistence is not core. |
| History / Saved | `history_store.rs`, History commands/frontend | **STALE / DEFERRED** | Existing source is outside initial core and must not be required by Meeting/Text success. |
| Meeting History Stop handoff | `meeting_session.rs` -> `history_store.rs` | **STALE / NEXT** | Stop still performs automatic persistence work that the simplified core no longer requires. |
| Text translation | `text_translate.rs` -> helper -> worker | **SOURCE ALIGNED CONTRACT / CALLER CLEANUP LATER** | Text still carries a temporary Quality compatibility label, but worker routing is language-direction based and Meeting-independent. |
| Tone | settings/UI assumptions | **STALE / DEFERRED** | Auto/Formal/Casual removed from initial core. |
| Meeting context | no canonical inference path | **DEFERRED BY POLICY** | Current utterance only; do not add context now. |
| Global safe close | `GlobalMeetingShell.ts`, native `main.rs` -> canonical Stop | **ALIGNED BASE** | Keep Stop-before-close safety; remove deferred persistence/lifecycle dependencies without creating another close path. |
| Audio Studio/custom voice | existing advanced/source boundaries | **STALE FOR INITIAL CORE** | Deferred until translator is proven. |
| Static translation-core validation | `scripts/validate_startup_runtime_readiness.mjs` | **SOURCE ALIGNED DEFINITION / NOT EXECUTED** | Validator protects direction-based bidirectional routing, translation safety, optional-incoming nonblocking outbound semantics, common Meeting/Text worker, and safe core owners. |

## 1. Simplified Product Flow

```text
Meeting outbound
ID microphone speech
-> finalized utterance
-> local ASR
-> canonical ID -> EN translation
-> English TTS
-> Meeting Microphone

Optional incoming
Meeting Sound EN speech
-> finalized utterance
-> local ASR
-> canonical EN -> ID translation
-> local transcript only

Text
ID <-> EN source
-> same canonical translation worker
-> result
```

Normal users do not select model/provider, tone, Realtime/Quality mode, context, queue,
or worker internals.

## 2. Canonical Bidirectional Translation Source

`realtime_local_worker.py` owns direction selection:

```text
ID -> EN -> RuntimeAssets/Translation/ModelData/marianmt-id-en
EN -> ID -> RuntimeAssets/Translation/ModelData/marianmt-en-id
```

`TRANSLATION_RUNTIME` is cached by `id->en` / `en->id`. A temporary `mode` response
label may remain for existing direct caller compatibility, but mode no longer chooses a
model.

Worker status keeps required outbound ID->EN readiness distinct from optional reverse
EN->ID readiness. This avoids turning a missing optional incoming model into a false
required outbound Start blocker.

No runtime/model claim follows from this source alignment: the reverse checkpoint is
not proven installed, loadable, accurate, fast, or package-ready.

## 3. Translation Safety

The worker preserves:

```text
truncation=False
-> verify input token count and active model limit
-> reject oversized input
-> generate
-> verify normal EOS completion
-> only then decode/promote translation
```

Known incomplete translation is not normal Text/TTS output. No automatic previous-turn
or History context is added.

## 4. Required Owners To Preserve

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
-> ASR / direction-based translation / TTS execution

virtual Meeting Microphone owners
-> translated English delivery
```

Do not create a replacement parallel engine while pruning old features.

## 5. Incoming Is Subordinate To Outbound

Current source now follows:

```text
incoming healthy
-> deterministic self-output suppression while TranslateIT speaks
-> EN -> ID transcript remains available

suppression unavailable
-> clear incoming finalized producer first
-> stop Meeting Sound capture best-effort
-> mark incoming disabled/degraded
-> incoming session eligibility rejects late promotion
-> required outbound Meeting Microphone route still executes
```

The disabled stage lives inside the existing `meeting_session.rs` incoming orchestration
status; no second Meeting/audio/suppression authority was added. Clearing the finalized
incoming producer before route dispatch makes still-open callbacks ignored even if
capture cleanup itself reports a failure.

Actual Windows suppression effectiveness, capture-stop behavior, and race timing remain
local proof. Automatic mid-session default-output rebind remains deferred.

## 6. Finalized Transcript Remains Transient

One bounded transient committed-turn store may remain for the active Meeting view for
current-session comprehension and truthful chronological output. It is not permission
to keep History/Saved as a core dependency.

The next simplification target is the remaining automatic Meeting Stop -> History
persistence handoff. Initial Stop should clean the runtime/transient conversation
without requiring persistence work.

## 7. Deferred Source To Remove Or Disconnect

```text
Pause / Resume
Push to Talk
Stop Voice
Speak Now / Cancel coordination
partial translated subtitles
Auto / Formal / Casual tone controls
remaining Realtime / Quality caller/UI assumptions
conversation-context prompting
History / Saved navigation and automatic persistence
Meeting Stop -> History finalization dependency
Audio Studio/custom voice initial-product flow
Document Translation
```

Prefer actual removal/disconnection over compatibility layers that preserve competing
behavior.

## 8. UI Target

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

## 9. Static Vs Runtime Proof

ChatGPT -> GitHub may prove source ownership/routing only. Local Windows proof remains
required for final ASR, both translation directions, model quality/load, TTS, Meeting
Microphone delivery, Meeting Sound loopback, suppression effectiveness,
latency/memory/contention, native race behavior, and installed operation.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Reliable bidirectional translation routing and optional-incoming nonblocking outbound
semantics are source-aligned at their bounded contracts. The next stale dependency is
automatic Meeting Stop -> History persistence, which no longer belongs to the initial
translation core.

The single continuation is `docs/knowledge/next-action.md`.
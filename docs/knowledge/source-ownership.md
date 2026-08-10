# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-11  
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
| Product shell/navigation | `main.ts`, `shell.ts`, `SimpleLauncherController.ts` | **STALE / PRUNE** | Meeting controls now use Start/Stop only, but source still exposes History; initial product target is Meeting / Text / Settings. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Application Meeting now has one normal `starting -> live -> stopping` authority path; Pause/Resume and fresh Resume generation machinery are removed. |
| Physical microphone capture | `engine/audio/live_capture.rs` | **ALIGNED / WINDOWS PROOF LATER** | Required outbound capture owner. |
| Finalized speech boundary | `engine/audio/finalized_utterance.rs` | **ALIGNED BASE / SIMPLIFY** | Finalized stable speech/event identity remains useful. |
| Meeting Sound capture | `engine/audio/meeting_sound_capture.rs` | **PARTIAL / OPTIONAL** | Distinct incoming loopback owner exists; actual Windows behavior is local proof. |
| Translation worker | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | One persistent worker routes ID->EN to `marianmt-id-en` and EN->ID to `marianmt-en-id` by language direction; no NLLB/mode-based model routing remains. |
| Translation safety | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; input limit and EOS-completion guards remain before promotion. |
| Meeting outbound AI | `meeting_session.rs` -> helper -> worker | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Explicit ID->EN request reaches same direction-based worker, then TTS/route. |
| Meeting incoming AI | `meeting_session.rs` -> helper -> worker | **SOURCE ALIGNED CONTRACT / MODEL PROOF LATER** | Explicit EN->ID request selects reverse Marian direction; incoming/helper promotion is eligible only while the application Meeting is Live. |
| Self-output suppression | `meeting_session.rs` + `meeting_sound_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | Healthy incoming is suppressed during TranslateIT playback; if suppression cannot be established, incoming is disabled/ignored and required outbound continues. |
| Helper scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **ALIGNED BASE** | One scheduler/worker remains; outbound > incoming > Text > diagnostics. Incoming session guard now follows the Live-only Meeting lifecycle. |
| Live transcript | transient committed-turn store + `MeetingLiveActivityPresentation.ts` | **SOURCE ALIGNED / RENDER PROOF LATER** | Finalized current-session transcript remains transient, read-only in frontend, and cleared at Stop. |
| Meeting Stop lifecycle | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Stop revokes authority, cleans both lanes/helper/consumers/transient state, and does not write History. |
| History / Saved | `history_store.rs`, History commands/frontend | **STALE / NEXT** | Existing persistence/UI is outside initial core. Top-level History and automatic Text History still remain in active product source. |
| Text translation | `text_translate.rs` -> helper -> worker | **SOURCE ALIGNED CONTRACT / CALLER CLEANUP LATER** | Text reaches the same direction-based worker and remains Meeting-independent; caller/UI still carries stale mode/persistence concepts. |
| Tone | settings/UI assumptions | **STALE / DEFERRED** | Auto/Formal/Casual removed from initial core. |
| Meeting context | no canonical inference path | **DEFERRED BY POLICY** | Current utterance only; do not add context now. |
| Global safe close | `GlobalMeetingShell.ts`, native `main.rs` -> canonical Stop | **ALIGNED BASE** | Stop-before-close remains and does not create Pause behavior. |
| Audio Studio/custom voice | existing advanced/source boundaries | **STALE FOR INITIAL CORE** | Deferred until translator is proven. |
| Static translation-core validation | `scripts/validate_startup_runtime_readiness.mjs` | **SOURCE ALIGNED DEFINITION / NOT EXECUTED** | Validator protects bidirectional routing, translation safety, nonblocking incoming, simple Start/Live/Stop lifecycle, persistence-free Stop, and safe close ownership. |

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

## 4. Simple Meeting Lifecycle

The application Meeting owner now follows:

```text
Start
-> starting authority
-> required resources open
-> live authority
-> continuous finalized translation
-> Stop
-> stopping authority / generation invalidated
-> cleanup
-> no active Meeting session
```

Removed from the current product/runtime path:

```text
pause_meeting_translation
resume_meeting_translation
paused lifecycle state
resuming lifecycle state
fresh Resume generation
Pause/Resume frontend bridge/facade/control mapping
```

Navigation and minimize do not become substitute Pause operations. The active Meeting
remains application-level until explicit Stop or safe Stop & Close.

## 5. Incoming Is Subordinate To Outbound

Current source follows:

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

Incoming/helper promotion is now valid only while the same application Meeting session
is `live`. Actual Windows suppression effectiveness, capture-stop behavior, and race
timing remain local proof.

## 6. Stop Is Runtime Cleanup, Not Persistence

The canonical Stop path is:

```text
revoke Meeting output authority
-> cancel Meeting route
-> stop physical microphone
-> stop optional Meeting Sound
-> cancel helper work by Meeting session
-> join outbound/incoming consumers
-> clear suppression/finalized sequence/transient committed turns
-> clear application Meeting session
-> Ended
```

`meeting_session.rs` does not import History persistence or read a final snapshot for a
History write. Persistence state/failure therefore cannot determine Stop success.

## 7. Deferred Source To Remove Or Disconnect

```text
Push to Talk
Stop Voice
Speak Now / Cancel coordination
partial translated subtitles
Auto / Formal / Casual tone controls
remaining Realtime / Quality caller/UI assumptions
conversation-context prompting
History / Saved navigation and automatic persistence
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
required for compilation, final ASR, both translation directions, model quality/load,
TTS, Meeting Microphone delivery, Meeting Sound loopback, suppression effectiveness,
latency/memory/contention, Start/Stop/close race behavior, rendered UI, and installed
operation.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Reliable bidirectional translation, optional-incoming nonblocking outbound semantics,
persistence-free Stop, and the simple Start -> Live -> Stop product lifecycle are
source-aligned at their bounded contracts. The next stale initial-product surface is
History/Saved plus automatic Text History persistence.

The single continuation is `docs/knowledge/next-action.md`.

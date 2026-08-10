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
| Product shell/navigation | `shell.ts`, `lockedReferenceShellParts.ts`, `SimpleLauncherController.ts` | **SOURCE ALIGNED / RENDER PROOF LATER** | Active navigation is Meeting / Text / Settings. Normal Settings exposes Meeting / Advanced only. Normal Meeting/Text no longer presents Mode/Tone. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Application Meeting has one normal `starting -> live -> stopping` authority path; Pause/Resume and fresh Resume generation machinery are removed. |
| Physical microphone capture | `engine/audio/live_capture.rs` | **ALIGNED / WINDOWS PROOF LATER** | Required outbound capture owner. |
| Finalized speech boundary | `engine/audio/finalized_utterance.rs` | **ALIGNED BASE / SIMPLIFY** | Finalized stable speech/event identity remains useful. |
| Meeting Sound capture | `engine/audio/meeting_sound_capture.rs` | **PARTIAL / OPTIONAL** | Distinct incoming loopback owner exists; actual Windows behavior is local proof. |
| Translation worker | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | One persistent worker routes ID->EN to `marianmt-id-en` and EN->ID to `marianmt-en-id` by language direction; no NLLB/mode-based model routing remains. |
| Translation product readiness | worker status -> `runtimeProductFacade.ts` | **SOURCE ALIGNED / EXECUTION PROOF LATER** | Product reads `translation_id_en` / `translation_en_id`. Meeting required outbound uses ID->EN; Text readiness follows selected direction; old Realtime/Quality aliases do not decide normal product readiness. |
| Translation safety | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; input limit and EOS-completion guards remain before promotion. |
| Translation model inventory/setup | `model_manifest.json`, `runtime_inventory.rs` | **SOURCE ALIGNED / INSTALLATION PROOF ONLY** | Manifest now declares `marianmt-id-en` at the worker ID->EN path and nonblocking `marianmt-en-id` at the worker EN->ID path; obsolete NLLB/mode-based translation inventory is removed. Inventory only blocks on manifest-required missing assets and remains installation evidence. |
| Model asset delivery | release/runtime asset flow | **UNRESOLVED / PLAN NEXT** | Source metadata now exists for both Marian directions, but this repository state does not prove the model bytes are delivered to a target installation or define the final simplest delivery strategy. |
| Meeting outbound AI | `meeting_session.rs` -> helper -> worker | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Explicit ID->EN request reaches the same direction-based worker without a normal `mode` field, then TTS/route. |
| Meeting incoming AI | `meeting_session.rs` -> helper -> worker | **SOURCE ALIGNED CONTRACT / MODEL PROOF LATER** | Explicit EN->ID request reaches the reverse Marian direction without a normal `mode` field; incoming/helper promotion is eligible only while the application Meeting is Live. |
| Self-output suppression | `meeting_session.rs` + `meeting_sound_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | Healthy incoming is suppressed during TranslateIT playback; if suppression cannot be established, incoming is disabled/ignored and required outbound continues. |
| Helper scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **ALIGNED BASE** | One scheduler/worker remains; outbound > incoming > Text > diagnostics. Incoming session guard follows the Live-only Meeting lifecycle. |
| Live transcript | transient committed-turn store + `MeetingLiveActivityPresentation.ts` | **SOURCE ALIGNED / RENDER PROOF LATER** | Finalized current-session transcript remains transient, read-only in frontend, and cleared at Stop. |
| Meeting Stop lifecycle | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Stop revokes authority, cleans both lanes/helper/consumers/transient state, and does not write History. |
| History / Saved active product surface | active shell/controller/`runtimeApi.ts` | **SOURCE ALIGNED / REMOVED FROM INITIAL SURFACE** | No top-level History workspace, no History settings tab, no active controller History state/actions, and no frontend bridge History methods. |
| History / Saved backend persistence | `history_store.rs`, History Tauri commands/registration | **DEFERRED / DISCONNECTED** | Persistence source may remain for future reconsideration but is not reachable through the active initial frontend and is not required by Meeting/Text success. |
| Text translation | `text_translate.rs` -> helper -> worker + active Text controller | **SOURCE ALIGNED / EXECUTION PROOF LATER** | Text sends content + explicit language direction, validates the canonical bidirectional translation contract, has no normal mode selection, and does not automatically persist History. |
| Tone | active product surface | **REMOVED FROM INITIAL SURFACE** | Tone is not presented or sent by normal Meeting/Text flow. |
| Realtime / Quality product assumptions | active facade/controller/shell | **REMOVED FROM NORMAL PRODUCT CONTRACT** | Normal product no longer uses Realtime/Quality for readiness, model selection, or translation requests. Worker/diagnostic compatibility aliases may remain temporarily. |
| Meeting context | no canonical inference path | **DEFERRED BY POLICY** | Current utterance only; do not add context now. |
| Global safe close | `GlobalMeetingShell.ts`, native `main.rs` -> canonical Stop | **ALIGNED BASE** | Stop-before-close remains and does not create Pause or persistence behavior. |
| Audio Studio/custom voice | existing advanced/source boundaries | **STALE FOR INITIAL CORE** | Deferred until translator is proven. |
| Static translation-core validation | `scripts/validate_startup_runtime_readiness.mjs` | **SOURCE ALIGNED DEFINITION / NOT EXECUTED** | Validator protects direction-based readiness, the direction-based Marian inventory, reverse nonblocking required-outbound semantics, mode/tone-free normal flow, History-free active surface, Text persistence independence, bidirectional routing, nonblocking incoming, Start/Live/Stop lifecycle, persistence-free Stop, and safe close ownership. |

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

## 2. Canonical Bidirectional Translation Source And Readiness

`realtime_local_worker.py` owns direction selection:

```text
ID -> EN -> RuntimeAssets/Translation/ModelData/marianmt-id-en
EN -> ID -> RuntimeAssets/Translation/ModelData/marianmt-en-id
```

`TRANSLATION_RUNTIME` is cached by `id->en` / `en->id`. The worker may still expose
Realtime/Quality compatibility aliases for inherited Diagnostics/preload contracts, but
they do not select a model and are not consumed by normal product readiness.

Normal product readiness follows:

```text
Meeting required outbound
ASR + translation_id_en + TTS + Meeting route

Optional incoming
translation_en_id may be unavailable without blocking outbound

Text
current source/target direction
-> matching translation_id_en or translation_en_id readiness
```

No runtime/model claim follows from source alignment: the reverse checkpoint is not
proven installed, loadable, accurate, fast, or package-ready.

## 3. Direction-Based Translation Model Inventory

`model_manifest.json` now describes the same translation directions and paths as the
worker:

```text
marianmt-id-en
stage = translation_id_en
required = true
expected_path = EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en
source = Helsinki-NLP/opus-mt-id-en
license = apache-2.0

marianmt-en-id
stage = translation_en_id
required = false
expected_path = EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-en-id
source = Helsinki-NLP/opus-mt-en-id
license = apache-2.0
```

The obsolete `nllb-200-distilled-600M` / `translation_quality` entry and old
`translation_realtime` manifest stage are removed from the current translation inventory.

`required=false` on `marianmt-en-id` is an inventory rule for the **required Meeting
outbound gate**, not a claim that reverse Text is optional for full product acceptance.
A missing reverse model therefore does not make the required-assets inventory fail or
false-block healthy ID->EN Meeting Start. Text EN->ID remains not ready unless the worker
reports `translation_en_id` available.

`runtime_inventory.rs` only creates blockers for missing entries marked `required` and
now states explicitly that optional direction/fallback assets may still be absent. Both
inventory and setup reports remain installation evidence only; neither proves load,
inference, translation quality, latency, or CUDA behavior.

## 4. Translation Safety

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

Normal Meeting/Text translation requests carry content and language direction rather
than a user/runtime mode selector.

## 5. Simple Meeting Lifecycle

The application Meeting owner follows:

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

## 6. Incoming Is Subordinate To Outbound

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

Incoming/helper promotion is valid only while the same application Meeting session is
`live`. Actual Windows suppression effectiveness, capture-stop behavior, and race timing
remain local proof.

## 7. Stop Is Runtime Cleanup, Not Persistence

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

## 8. History / Saved Is Disconnected From Initial Product

Active desktop source exposes:

```text
Primary navigation
Meeting
Text
Settings

Settings
Meeting
Advanced
```

The active controller no longer owns History list/detail/search/save/clear state or
automatic Text History writes. `runtimeApi.ts` no longer exposes History methods to the
active frontend.

Backend History/Saved storage and Tauri commands may remain in source for later
reconsideration. Their continued source presence is not product permission and must not
become a hidden Meeting/Text dependency.

## 9. Deferred / Unresolved Boundaries

```text
local/release delivery of both Marian model assets to target installations
Push to Talk / old voice controls if still reachable elsewhere
partial translated subtitles
conversation-context prompting
backend History / Saved persistence surface
Audio Studio/custom voice initial-product flow
Document Translation
worker/diagnostic compatibility labels that no longer have a proved consumer
```

The model inventory mismatch is closed. The remaining model question is delivery and
actual runtime proof, not another translation-model architecture change.

Prefer actual removal/disconnection over compatibility layers that preserve competing
behavior.

## 10. UI Target

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

History/Saved, Mode, and Tone are not part of the active initial desktop surface.

## 11. Static Vs Runtime Proof

ChatGPT -> GitHub may prove source ownership/routing and declarative asset metadata only.
Local Windows/release proof remains required for compilation, actual model installation,
model load, final ASR, both translation directions, model quality, TTS, Meeting
Microphone delivery, Meeting Sound loopback, suppression effectiveness,
latency/memory/contention, Start/Stop/close race behavior, rendered UI, and installed
operation.

## Current Mode / Continuation

Current mode: **Plan**.  
Execution channel: `ChatGPT -> GitHub`.

Reliable bidirectional translation, direction-based product readiness, direction-based
model inventory, mode/tone-free normal translation, optional-incoming nonblocking
outbound semantics, persistence-free Stop, the simple Start -> Live -> Stop lifecycle,
and History-free active product surface are source-aligned at their bounded contracts.

The next unresolved core boundary is how the two declared Marian assets reach a target
installation and how that delivery is accepted without adding user-facing model/runtime
complexity.

The single continuation is `docs/knowledge/next-action.md`.

# Next Action

Updated: 2026-08-11  
Working branch: `New`  
Status: **Reliable bidirectional translation, direction-based product readiness, mode/tone-free normal Meeting/Text flow, Incoming-Failure-Is-Nonblocking Outbound Delivery, persistence-free Meeting Stop, simple Start -> Live -> Stop lifecycle, and a History-free initial desktop surface are source-aligned at their bounded contracts. Normal product readiness now consumes `translation_id_en` / `translation_en_id`; normal Meeting/Text translation calls no longer send a mode selector. No Rust/TypeScript/Python/static-validator/rendered/Windows runtime proof has been obtained. The next material source mismatch is model inventory: the worker expects `marianmt-en-id`, while `model_manifest.json` still declares the old optional NLLB Quality asset and does not represent the reverse Marian checkpoint.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/02-product-requirements.md PR-020..023 / PR-047 / PR-050 / PR-053 / PR-090..093
-> .agents/skills/development-brief/SKILL.md
-> inspect model_manifest.json + runtime_inventory.rs + worker direction paths/status only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust/TypeScript/Python execution, static-validator execution, model files/load,
translation quality, CUDA/CPU latency, Windows audio, suppression effectiveness,
rendered UI, native lifecycle races, and installed operation remain
`LOCAL PROOF REQUIRED`.

# Closed Source Slice — Reliable Bidirectional Translation Core

The one persistent worker routes translation by language direction:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

Translation rejects silent truncation and known incomplete generation. Tone,
previous-turn context, History context, second worker, and cloud fallback remain absent
from model input.

# Closed Source Slice — Incoming Failure Is Nonblocking

Healthy incoming uses deterministic self-output suppression. If that protection cannot
be established, incoming is disabled/degraded before required outbound delivery
continues. Optional incoming cannot be the sole reason an otherwise safe outbound TTS
turn fails.

# Closed Source Slice — Meeting Stop Is Persistence-Free

Stop revokes output authority, cleans both audio lanes/helper/consumers/transient state,
and clears the Meeting session. It does not write History. Safe Stop & Close delegates
to the same canonical Stop.

# Closed Source Slice — Pause / Resume Removed

Application Meeting uses:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Pause/Resume commands, runtime states, fresh Resume generation, Tauri registration,
bridge/facade actions, and normal controls are removed. Incoming promotion is valid only
while the application Meeting is Live.

# Closed Source Slice — History / Saved Removed From Initial Surface

Active product navigation is:

```text
Meeting
Text
Settings
```

Normal Settings is:

```text
Meeting
Advanced
```

Successful Text translation performs no automatic History write. Active `runtimeApi`
contains no History frontend methods. Backend persistence remains disconnected/deferred.

# Closed Source Slice — Direction-Based Product Readiness + Mode/Tone Removal

## A. Product readiness now follows translation direction

`runtimeProductFacade.ts` consumes worker source truth:

```text
readiness.translation_id_en
readiness.translation_en_id
```

Normal readiness mapping is:

```text
Required Meeting outbound
ASR + ID->EN + TTS + Meeting route

Optional incoming
EN->ID may be unavailable/degraded without blocking outbound

Text
selected ID->EN -> translation_id_en
selected EN->ID -> translation_en_id
```

The active facade no longer uses `translation_realtime`, `translation_quality`,
`realtimeTranslationReady`, or `qualityTranslationReady` to decide normal product
availability.

## B. Normal translation requests are mode-free

Current normal requests send language direction explicitly:

```text
Meeting YOU       source=id target=en
Meeting INCOMING  source=en target=id
Text              source=current setting target=current setting
```

The normal Meeting/Text translation payload no longer sends `mode`. Standalone Text
validates the worker's canonical bidirectional translation contract rather than a
`Quality` response label.

Worker-side compatibility aliases may remain for inherited Diagnostics/preload
contracts; they do not select the model or normal product readiness.

## C. Normal UI has no Mode/Tone presentation

Removed from active Meeting/Text surface:

```text
Mode: Realtime
Mode: Quality/current profile
Tone: Auto
Speaking mode / Push-to-Talk copy in normal Meeting Settings
```

The active controller no longer has a `textModeValue`/`runtime_profile` presentation
path. Normal user-facing choice is language direction only.

## D. Static validation definition

`validate_startup_runtime_readiness.mjs` now defines checks for:

- worker direction readiness fields consumed by the active facade;
- ID->EN required outbound readiness independent from reverse EN->ID;
- Text readiness matching current ID<->EN direction;
- no active Realtime/Quality readiness mapping;
- no Mode/Tone presentation in normal Meeting/Text;
- no normal Meeting/Text `mode` translation payload;
- existing History-free, Start/Stop, nonblocking incoming, translation-safety, transient
  transcript, and safe-close contracts.

The validator was **not executed** in this channel.

# Known Proof Limits

No claim is made that current Rust/TypeScript/Python compiles or executes, the validator
passes, the shell renders correctly, models are installed/loadable, translation quality
or latency is acceptable, or Windows audio/TTS/Meeting routing works on target hardware.
Those remain local proof.

# Next Developing Slice — Direction-Based Model Inventory Reconciliation

## Root cause

The active worker/product contract is direction-based, but the declarative model
inventory still describes the previous mode-based plan:

```text
Worker source truth
marianmt-id-en
marianmt-en-id

Current model_manifest.json
marianmt-id-en              stage=translation_realtime
nllb-200-distilled-600M     stage=translation_quality
(no marianmt-en-id entry)
```

This means reverse EN->ID has a worker path but no truthful inventory/setup entry, while
an unused NLLB Quality asset still appears as current translation capability.

## Goal

Make model inventory describe the translation engine that the product actually uses,
without allowing reverse-direction availability to block required Meeting outbound.

## In scope

1. remove the obsolete NLLB Quality translation entry from the current model manifest;
2. rename the ID->EN manifest stage to direction-based terminology;
3. add `marianmt-en-id` at the exact worker-expected RuntimeAssets path with its source
   metadata;
4. keep reverse EN->ID capability nonblocking for Meeting outbound at the current
   inventory boundary; Text EN->ID readiness remains separately reported by worker;
5. reconcile `runtime_inventory.rs` wording only where it incorrectly implies a global
   translation capability instead of installation evidence;
6. extend static validation and canonical docs.

## Out of scope

- downloading or installing model bytes in ChatGPT -> GitHub;
- claiming the reverse checkpoint exists or loads;
- changing translation model family again;
- adding fallback to NLLB/cloud;
- adding a capability-profile framework or generic package manager;
- runtime quality/latency benchmarking;
- Audio Studio/History backend deletion.

## Acceptance criteria

1. current manifest contains `marianmt-id-en` and `marianmt-en-id` as the translation
   assets used by the worker and contains no NLLB Quality translation entry;
2. manifest paths exactly match worker `TRANSLATION_MODEL_ID_EN` / `TRANSLATION_MODEL_EN_ID`;
3. missing reverse EN->ID does not become a required Meeting outbound Start blocker;
4. inventory/setup remains installation evidence only and does not claim model load or
   translation success;
5. no fallback translator/model owner is introduced.

# Hold

- do not reintroduce Pause/Resume, History/Saved, Tone/Context, or user-facing
  Realtime/Quality modes;
- do not add another translation worker;
- do not use cloud or NLLB fallback;
- do not create a generic capability-profile/package framework;
- do not begin local acceptance inside this source reconciliation slice.

## Next Step

Implement **Direction-Based Model Inventory Reconciliation** so the declarative model
inventory/setup matches the already-selected `marianmt-id-en` / `marianmt-en-id` worker
contract without turning optional incoming/reverse availability into a required Meeting
outbound blocker.

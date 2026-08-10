# Next Action

Updated: 2026-08-11  
Working branch: `New`  
Status: **Reliable bidirectional translation, direction-based product readiness, direction-based model inventory, mode/tone-free normal Meeting/Text flow, Incoming-Failure-Is-Nonblocking Outbound Delivery, persistence-free Meeting Stop, simple Start -> Live -> Stop lifecycle, and a History-free initial desktop surface are source-aligned at their bounded contracts. `model_manifest.json` now declares `marianmt-id-en` and nonblocking `marianmt-en-id` at the exact worker paths, with obsolete NLLB/mode-based translation inventory removed. Inventory/setup remains installation evidence only. No Rust/TypeScript/Python/static-validator/model-load/rendered/Windows runtime proof has been obtained. The next unresolved core boundary is how both Marian assets reach a target installation without adding user-facing runtime complexity.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/02-product-requirements.md PR-011..013 / PR-020..023 / PR-025 / PR-028 / PR-040 / PR-047 / PR-053
-> inspect only current release/runtime asset-delivery owners that can answer the model-delivery question
```

## Current Mode

**Plan**.

Execution channel:

```text
ChatGPT -> GitHub
```

Do not load a project specialist while this remains Plan. If the delivery architecture
becomes sufficiently grounded and implementation is approved by the canonical owners,
transition explicitly to Developing before editing behavior.

Rust/TypeScript/Python execution, static-validator execution, actual model files/load,
translation quality, CUDA/CPU latency, Windows audio, suppression effectiveness,
rendered UI, native lifecycle races, packaged/installed operation, and clean-machine
proof remain `LOCAL PROOF REQUIRED`.

# Closed Source Boundaries

## Reliable Translation Core

One persistent worker routes by language direction:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

Normal Meeting/Text requests carry content and language direction only. Translation
rejects silent tokenizer truncation and known incomplete generation. Tone, previous-turn
context, History context, another worker, and cloud fallback are absent from the initial
translation contract.

## Direction-Based Product Readiness

```text
Meeting required outbound
ASR + translation_id_en + TTS + Meeting route

Optional incoming
translation_en_id may be unavailable without blocking outbound

Text
selected ID->EN -> translation_id_en
selected EN->ID -> translation_en_id
```

Normal product readiness does not use Realtime/Quality aliases.

## Direction-Based Model Inventory

Current translation entries are:

```text
marianmt-id-en
required = true
stage = translation_id_en
path = EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en
source = Helsinki-NLP/opus-mt-id-en
license = apache-2.0

marianmt-en-id
required = false
stage = translation_en_id
path = EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-en-id
source = Helsinki-NLP/opus-mt-en-id
license = apache-2.0
```

The obsolete NLLB Quality entry is removed. `required=false` for EN->ID is scoped to
the required Meeting-outbound inventory gate so missing optional incoming cannot
false-block ID->EN Start; it does not make reverse Text product acceptance optional.
Worker `translation_en_id` remains the actual Text reverse readiness truth.

`runtime_inventory.rs` only blocks its required-assets status for missing entries marked
`required` and explicitly states that optional assets may still be missing. Inventory and
`setup_models` do not claim download, install, load, inference, quality, or latency.

## Other Closed Simplifications

- optional incoming suppression failure disables/degrades incoming and required outbound continues;
- Meeting Stop clears runtime/transient state and does not write History;
- Pause/Resume is removed from the application Meeting lifecycle;
- active navigation is Meeting / Text / Settings;
- normal Settings is Meeting / Advanced;
- active History/Saved workflow and automatic Text History write are removed;
- normal Meeting/Text Mode/Tone presentation is removed;
- safe Stop & Close still delegates to canonical Meeting Stop.

# Static Validation Definition

`validate_startup_runtime_readiness.mjs` now defines checks for:

- worker/manifest path agreement for both Marian directions;
- `marianmt-id-en` required and `marianmt-en-id` nonblocking at the required-outbound inventory boundary;
- no NLLB / `translation_quality` / `translation_realtime` translation entry in current manifest;
- inventory blockers only for entries marked `required`;
- direction-based product readiness and mode-free normal requests;
- previous translation-safety, incoming, lifecycle, persistence, and safe-close contracts.

The validator was **not executed** in this channel.

# Known Proof Limits

Current source proves only repository contracts and declarative source metadata. It does
not prove either Marian checkpoint is physically present in a target install, can be
loaded by the pinned Python/Transformers runtime, gives acceptable translation, fits
RAM/VRAM, meets Meeting latency, or is included correctly in an installed release.

# Next Plan Boundary — Local Model Asset Delivery + Acceptance

## Goal

Choose the smallest reliable way to deliver the two already-selected Marian checkpoints
to users so the translator can work without exposing model/runtime internals.

The plan must preserve:

```text
normal user
-> install/open TranslateIT
-> required local assets available through an approved product/release flow
-> no manual Python/model operation
-> no silent cloud fallback
```

## Questions To Resolve From Current Source/Evidence

1. What current release/package/runtime-asset owner already exists for shipping large
   local model directories?
2. Is the simplest supported initial delivery to bundle both Marian checkpoints with the
   application/release, or does the existing product have an approved first-run asset
   acquisition mechanism that is already simpler and reliable?
3. How should `marianmt-en-id` be delivered for required Text EN->ID product capability
   while remaining nonblocking for an otherwise healthy outbound Meeting Start?
4. What exact source/revision/checksum metadata is required for reproducible release
   inputs without building a generic package manager?
5. Which checks are source/package evidence, and which must remain target-machine model
   load/inference acceptance?

## Constraints

- do not change translation model family again in this Plan unless current evidence
  proves the selected model cannot satisfy the product;
- do not add NLLB/cloud fallback;
- do not create an in-app package manager or generic capability-profile framework by
  default;
- do not require users to operate Python/Hugging Face manually;
- do not call manifest presence runtime success;
- do not reopen Tone/Context/History/Pause or other deferred product features;
- prefer the smallest existing release/runtime asset owner over a new downloader/service.

## Plan Acceptance

The Plan is complete only when it identifies:

1. one canonical asset-delivery owner/path;
2. exact responsibility for both Marian directions;
3. how required outbound remains available when reverse capability alone is unavailable;
4. reproducible source metadata requirements;
5. a bounded Developing slice plus separate local/installed proof requirements.

## Next Step

Plan **Local Model Asset Delivery + Acceptance Boundary** from the current release/runtime
asset owners, without implementing until the delivery method and ownership are resolved.

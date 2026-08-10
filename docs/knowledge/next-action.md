# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **The Reliable Bidirectional Translation Core is source-aligned at the worker/caller routing contract. One persistent worker now selects `marianmt-id-en` for ID -> EN and `marianmt-en-id` for EN -> ID by language direction rather than Realtime/Quality mode. Existing direct callers may still carry temporary mode compatibility fields, but mode no longer selects the model. No model-load/quality/latency proof has been obtained. The next source conflict is optional incoming self-output suppression still being able to reject required outbound TTS.**

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
-> inspect meeting_session.rs suppression + Meeting Sound direct contracts
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust/TypeScript/Python execution, static-validator execution, model files/load,
translation quality, CUDA/CPU latency, Windows audio, rendered UI, and installed
operation remain `LOCAL PROOF REQUIRED`.

# Closed Source Slice — Reliable Bidirectional Translation Core

## A. One worker, direction-based routing

`realtime_local_worker.py` now uses:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

The model is selected by normalized source/target language direction. No second worker
or translation engine was introduced.

`TRANSLATION_RUNTIME` is cached by language direction rather than Realtime/Quality
mode. Existing direct callers can temporarily send an old `mode` value, but it is only
a compatibility response label and does not choose the model.

## B. Required outbound vs optional reverse readiness

Worker status distinguishes:

```text
translation_id_en
translation_en_id
translation_bidirectional
```

Required outbound provider readiness depends on ID -> EN. Missing EN -> ID remains
visible as reverse/incoming degradation rather than falsely blocking required outbound
Meeting Start.

## C. Meeting + Text contract

Current Meeting callers already send explicit directions:

```text
YOU      source=id target=en
INCOMING source=en target=id
```

Both now reach the same worker translation command and select the appropriate direction.
Standalone Text also sends its current source/target language settings into the same
worker command and has no Meeting context/audio dependency.

## D. Translation safety retained

Worker still requires:

```text
no silent character truncation
truncation=False at tokenizer
verified input token count + model limit
reject oversized source before inference
verified EOS completion
reject known incomplete output before promotion
```

No previous-turn, History, Saved, tone, glossary, or contextual prompt layer was added.

## E. Static validation definition

`validate_startup_runtime_readiness.mjs` was refocused on the simplified core. It now
defines source checks for:

- one direction-based bidirectional worker;
- no NLLB/old mode-based model selection;
- no silent truncation and no incomplete-generation promotion;
- explicit ID->EN Meeting outbound direction;
- explicit EN->ID Meeting incoming direction;
- standalone Text using the same translate task;
- required outbound readiness separated from optional reverse readiness;
- one scheduler/session/audio owner and existing safe Stop/Close boundary.

Deferred History/Pause/Tone/UI features are intentionally no longer protected as
initial-core acceptance requirements. The validator was **not executed** in this
channel.

# Known Runtime / Asset Gap

The source contract now expects:

```text
RuntimeAssets/Translation/ModelData/marianmt-id-en
RuntimeAssets/Translation/ModelData/marianmt-en-id
```

Repository/source inspection does not prove that the reverse checkpoint is installed,
loadable, accurate, fast enough, correctly licensed in the packaged artifact, or
present in a clean installer. Those are later local/release acceptance claims.

# Next Developing Slice — Incoming Must Never Block Required Outbound

## Goal

Reconcile the remaining stale dependency where optional incoming self-output
suppression can cause an otherwise safe outbound English TTS turn to fail.

Target behavior:

```text
TranslateIT TTS ready
-> try to protect optional incoming from hearing TranslateIT's own voice

suppression available
-> suppress incoming during route playback
-> route outbound normally

suppression unavailable / incoming lane unhealthy
-> mark incoming unavailable/degraded
-> stop/ignore incoming capture as required
-> route required outbound TTS normally
```

## In scope

1. change only the canonical Meeting/session + direct incoming capture/suppression
   boundary needed to make incoming subordinate to outbound;
2. keep own-TTS protection whenever incoming is active and healthy;
3. when the protection boundary is unavailable, disable/degrade incoming rather than
   return `output_failed` solely for that reason;
4. preserve generation authority and at-most-once outbound route semantics;
5. update static validation and canonical docs for this policy.

## Out of scope

- UI/navigation pruning;
- Pause/Resume removal;
- History/Saved removal;
- model/download/packaging work;
- mid-session default-device rebind;
- AEC/fingerprint/similarity suppression;
- local Windows acceptance.

## Acceptance criteria

1. self-output suppression inability cannot be the sole reason a generation-authoritative
   outbound TTS turn is rejected;
2. incoming becomes explicitly degraded/stopped/ignored before unsuppressed outbound
   playback can be mistaken for remote incoming speech;
3. healthy incoming still uses the current deterministic suppression interval;
4. no second Meeting/audio/suppression authority is introduced;
5. actual Windows suppression effectiveness remains honestly unproved until local test.

# Hold

- do not reintroduce Tone/Context or Realtime/Quality product modes;
- do not add a second translation worker;
- do not use cloud fallback;
- do not preserve optional incoming at the expense of required outbound;
- do not broaden this slice into History/UI/packaging cleanup.

## Next Step

Implement **Incoming-Failure-Is-Nonblocking Outbound Delivery** in the canonical Meeting
session/suppression path, then reconcile the next stale initial-product feature slice.

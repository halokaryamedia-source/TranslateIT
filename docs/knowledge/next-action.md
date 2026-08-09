# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Plan approved; Developing has resumed with Slice 1 only.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> bounded Slice 1 engine owners + direct callers/contracts only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

The user approved the Engine Consolidation Plan. Do not reopen the architecture
choice during this slice unless current source contradicts a required assumption.

Local/Windows acceptance remains deferred. Static source may establish ownership and
wiring only; model execution/quality, latency, CUDA/CPU behavior, process timing,
Windows audio, and installed operation remain `LOCAL PROOF REQUIRED`.

## Approved Engine Consolidation Target

```text
Rust/Tauri product runtime
        |
        v
existing helper bridge / later scheduler
        |
        v
ONE persistent Python worker
        |
        +-- ASR
        +-- Translation
        +-- TTS
        |
        v
product result / Meeting route
```

Locked consolidation rules:

- one persistent Python worker process and one worker command protocol;
- `realtime_local_worker.py` is the target canonical worker;
- no product translation may fall back to one-shot workers, manual/rule-based
  translation, dev seed payloads, or migration handoff stubs;
- no silent Realtime <-> Quality fallback merely to obtain output;
- CPU fallback remains allowed inside the requested mode when capability supports it;
- Meeting session/generation authority remains in the existing Meeting runtime owner;
- Windows audio capture/delivery remains outside the AI worker;
- model/provider replacement waits for bounded local quality/performance evidence;
- Python/Rust development tools remain tools under existing skill governance, not
  new project skills.

Approved later sequence after Slice 1:

```text
Slice 2 -> capability/readiness truth
Slice 3 -> request-scoped modes + scheduler/cancellation
Slice 4 -> dependency/tooling consolidation
Slice 5 -> resume finalized outbound utterance producer
```

The Svelte frontend idea is intentionally not part of Engine consolidation. Frontend
framework migration may be reconsidered only after Engine contracts are stable and a
separate frontend architecture decision proves that Vanilla TypeScript has become a
material constraint.

## Active Slice 1 — Canonical Worker And Truthful Text Execution

### Goal

Make standalone Text translation use exactly one AI execution path:

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust `translate_text`
-> existing helper bridge
-> persistent `realtime_local_worker.py` `translate`
-> one truthful result
```

### In scope

- make `realtime_local_worker.py` the persistent helper process entry;
- make `commands/text_translate.rs` use the persistent helper only;
- remove active fallback from Text into `engine::translate_text`;
- retire `manual_translation_accelerated.rs` and `manual_translation.rs` from the
  active Rust engine when no direct current consumer remains;
- retire the standalone accelerated Python worker as an execution owner when no
  current product caller remains;
- retire the helper entry wrapper when the base worker already owns the canonical
  `ping/status/preload/transcribe/translate/synthesize` tasks needed by product
  execution;
- keep failures truthful when helper/model/direction/runtime is unavailable;
- update only source ownership / continuation state that materially changes.

### Out of scope

- helper scheduler/locking redesign;
- coarse `provider_ready` cleanup and readiness consolidation;
- Text independent Quality-default migration;
- model changes or CT2 backend adoption;
- `uv`, Ruff, pytest configuration;
- capture/VAD/finalized utterance work;
- incoming Meeting lane;
- Svelte migration;
- local Windows testing.

### Acceptance criteria

1. Product `translate_text` has no fallback to one-shot/manual/rule-based
   translation.
2. The helper bridge launches `realtime_local_worker.py` directly as its persistent
   worker entry.
3. Retired Text execution owners are removed from active module/source ownership;
   unavailable model/helper state returns a blocked/error result rather than fake
   translation success.
4. No silent Realtime <-> Quality retry is introduced in the canonical Text command.
5. Repository ownership and continuation state describe the source truth without
   claiming runtime/model success.

## Proof Budget

**CURRENT-PROJECT VERIFIED** may be used only for exact static claims such as:

- which worker script the helper bridge launches;
- which function `translate_text` calls;
- whether manual/one-shot fallback remains reachable from Text;
- whether retired modules remain registered in the active engine.

**LOCAL PROOF REQUIRED** for Rust/TypeScript build execution, actual helper startup,
model inference, translation quality, CUDA/CPU execution, latency, and installed
behavior.

## Hold

During Slice 1:

- do not add another worker/service/fallback/readiness gate;
- do not change models to make source consolidation look successful;
- do not solve scheduler/readiness/tooling work early;
- do not modify Meeting audio/VAD/finalization;
- do not preserve obsolete Text execution paths `just in case`; Git history is the
  recovery path;
- do not start local Windows acceptance yet.

## Next Step

Complete **Slice 1** only. When static ownership proves Text has one persistent-worker
execution route and no fake/parallel fallback, close the slice and advance to
**Slice 2 — capability/readiness truth**.
# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slice 1 is source-aligned across standalone Text execution, fake translation fallback removal, and retirement of the legacy capture one-shot AI pipeline.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> bounded Slice 2 capability/readiness owners + direct consumers only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Static source establishes ownership and
wiring only. Rust compilation, helper startup, Python imports/model load, translation
quality, latency, CPU/CUDA behavior, cancellation timing, Windows audio, and
installed operation remain `LOCAL PROOF REQUIRED`.

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

Locked rules:

- one persistent worker process/protocol;
- no fake/manual/rule-based product translation fallback;
- no alternate one-shot AI execution from legacy capture;
- no automatic Realtime <-> Quality switch merely to obtain output;
- Meeting session/generation authority stays in the existing Meeting owner;
- Windows audio stays outside AI ownership;
- model replacement waits for bounded evaluation evidence;
- Python/Rust tooling remains under existing skill governance;
- Svelte remains a later independent frontend architecture decision after Engine
  contracts stabilize.

## Slice 1 — Completed Source Boundary

### Standalone Text

Canonical Text execution is now:

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> commands/text_translate.rs
-> persistent helper bridge
-> realtime_local_worker.py `translate`
-> one result
```

Current source facts:

- `bridge_paths.rs` launches `realtime_local_worker.py` directly;
- standalone `realtime_local_worker_entry.py` and
  `realtime_local_worker_accelerated.py` are removed;
- `engine/manual_translation.rs` and `manual_translation_accelerated.rs` are removed
  together with their engine module registrations;
- `commands/text_translate.rs` does not fall back to a second translation engine;
- helper/model/direction/invalid-response failure stays blocked rather than creating
  a rule/dictionary result;
- Text does not retry another translation mode;
- the reachable translation-flow validator describes the persistent-helper ownership
  contract rather than retired migration/manual paths.

### Fake translation adapter

`engine/adapters/translation_logic.rs` no longer contains deterministic phrase tables
or word-by-word preview translation that can return `Completed` without model
inference.

It is now a non-executing contract helper only and may return:

```text
Skipped            -> explicit same-language passthrough, labelled as non-model
Blocked/Pending     -> no canonical worker execution available
Planned             -> request shape only; no translated output
```

It cannot manufacture successful product translation.

### Legacy capture

`engine/capture_lifecycle.rs` is now capture lifecycle only. The legacy path no
longer:

```text
spawns a Python AI worker
runs ASR
runs translation
runs TTS
plays translated audio
switches Realtime <-> Quality
```

`stop_capture()` may create a temporary diagnostic WAV from the existing capture
buffer, then removes it from the cache. Stale legacy one-shot audio-pipeline evidence
is removed so an earlier result cannot be mistaken for current proof.

`commands/runtime_capture.rs` normal `start_capture` / `stop_capture` now call the
capture owner directly. They no longer dispatch `capture_start/capture_stop`
migration helper stubs or cancel the canonical helper as a side effect.

Inherited capture/ASR handoff commands may remain registered for Developer
Diagnostics while their direct consumers still exist. They are explicitly marked
as diagnostic/migration surfaces with no product runtime claim. Pruning those
commands is separate from the completed normal-product execution fix.

## Important Remaining Gaps

Slice 1 intentionally did **not** solve:

- `runtime_profile` still reaches Text; caller-owned `Text -> Quality` and `Meeting ->
  Realtime` belongs to Slice 3;
- helper locking/scheduling and real cancellation belong to Slice 3;
- worker tokenization/output length correctness remains to be reconciled in a bounded
  worker/mode correctness slice; current source still must not be described as
  proven safe for large inputs;
- capability/readiness semantics remain conflicting and are the next slice;
- migration/professional/live readiness gates still exist until Slice 2 reconciles
  their product consumers;
- finalized utterance production and Meeting Live expansion remain deferred.

## Proof State

**CURRENT-PROJECT VERIFIED** at static-source level:

1. standalone Text has one persistent-helper/base-worker execution route;
2. retired manual/entry/accelerated translation owners are absent;
3. fake deterministic/preview adapter translation no longer returns successful model
   translation;
4. legacy capture no longer starts a separate ASR -> Translate -> TTS pipeline or
   cross-mode fallback;
5. normal capture commands no longer dispatch migration helper stubs before calling
   capture;
6. canonical source ownership documentation matches those boundaries.

No build/test/runtime command was executed through the current ChatGPT -> GitHub
channel. Therefore compilation, actual helper/model execution, response correctness,
performance, and device behavior remain `LOCAL PROOF REQUIRED`.

## Hold

- do not reintroduce any removed alternate worker/manual/rule fallback for
  compatibility;
- do not replace models to hide readiness contradictions;
- do not add another readiness gate, runtime manifest, or aggregate Ready boolean;
- do not redesign scheduler/cancellation/modes during Slice 2 unless a change is
  strictly required to eliminate a readiness contradiction;
- do not resume finalized-utterance or Meeting feature expansion yet;
- do not start local Windows acceptance yet.

## Next Step

Start **Engine Consolidation Slice 2 — capability/readiness truth**.

Reconcile only the bounded truth chain:

```text
model_manifest.json / static install evidence
-> runtime_inventory.rs
-> persistent worker status / capability + loaded state
-> helper status (`provider_ready` replacement/split)
-> MeetingSessionPreflight + Text capability
-> runtimeProductFacade
-> normal UI
```

Remove `RuntimeContracts/MODEL_RUNTIME_MANIFEST.json`, `realtime_stack_manifest.json`,
and internal/live/professional/migration readiness from **normal product readiness**
when their direct consumers prove they are stale. Preserve only uniquely useful
Diagnostics evidence under an explicitly diagnostic contract. Keep scheduler,
cancellation, mode migration, tooling adoption, and model replacement outside this
slice.
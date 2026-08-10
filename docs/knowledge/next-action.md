# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slice 1 and Slice 2 are source-aligned. Text has one persistent-worker execution route, fake/parallel translation paths are retired, and normal product readiness now follows scoped worker capability + canonical Meeting preflight instead of stale/legacy gates.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> bounded Slice 3 helper scheduler/mode owners + direct callers only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Static source establishes ownership and
wiring only. Rust compilation, helper/model execution, model quality, latency,
CPU/CUDA behavior, cancellation timing, Windows audio, and installed operation remain
`LOCAL PROOF REQUIRED`.

## Locked Engine Target

```text
Rust/Tauri product runtime
        |
        v
existing helper bridge / scheduler
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

Do not reintroduce alternate workers, fake translation fallback, duplicate readiness
owners, or silent cross-mode fallback.

Svelte remains a separate later frontend architecture decision after Engine contracts
stabilize; it is not part of Engine consolidation.

# Slice 1 — Closed

Canonical standalone Text execution:

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> commands/text_translate.rs
-> persistent helper
-> realtime_local_worker.py `translate`
-> one result
```

Closed source problems:

- manual Rust translation owners removed;
- standalone entry/accelerated Python workers removed;
- deterministic/dictionary/preview translation cannot report model success;
- legacy capture no longer starts one-shot ASR -> Translate -> TTS or switches
  Realtime <-> Quality;
- normal capture no longer dispatches migration helper stubs as product execution.

# Slice 2 — Closed Source Boundary

## A. Installation evidence

Canonical static inventory:

```text
WorkerRuntime/model_manifest.json
-> commands/runtime_inventory.rs
```

Inventory now reports installation semantics instead of runtime PASS:

```text
installed
missing_required
missing_optional
metadata incomplete
```

File presence is not model load/inference proof.

Model catalog is capability-scoped:

- Faster Whisper Medium is optional/deferred fallback rather than mandatory global
  readiness;
- NLLB Quality is capability-specific and does not block unrelated Meeting readiness;
- Piper is optional because current TTS capability may come from runtime-verified
  Windows SAPI.

Revision/checksum/reproducible acquisition metadata remains incomplete and belongs to
the later tooling/reproducibility slice.

## B. Stale runtime snapshot

Removed:

```text
EngineData/Backend/RuntimeContracts/MODEL_RUNTIME_MANIFEST.json
```

Previous-machine `ready`, SAPI, CUDA, and model-load values are no longer source-tree
runtime truth.

`local_worker_manifest_logic.rs` remains only a Diagnostics/static install report and
no longer reads that snapshot. SAPI/CUDA/load truth belongs to current persistent
worker status.

`realtime_stack_manifest.json` is still inherited declared profile/config evidence;
it is **not normal product readiness proof**. Merge/removal remains later work.

## C. Helper process health vs request result

`helper_bridge_runtime.rs` now separates process lifecycle from task outcome:

- process/I/O/deadline failure may block/terminate the helper;
- a successful/failed individual ASR/Translate/TTS request describes that request
  only;
- request failure does not demote the persistent process or overwrite cached overall
  capability status;
- helper `provider_ready` remains only a compatibility summary of the required
  outbound AI capability set, not universal readiness.

Scheduler locking/cancellation remains unchanged until Slice 3.

## D. Current worker capability truth

Normal product capability is derived from persistent worker `status`:

```text
readiness.asr
readiness.translation_realtime
readiness.translation_quality
readiness.tts
readiness.cuda_degraded
```

Text readiness now uses the translation capability for the mode the current Text
command will actually request. `canTranslateText` is no longer hardcoded `true`.

Slice 3 will replace the shared `runtime_profile` with explicit caller-owned mode:

```text
Meeting -> Realtime
Text    -> Quality
```

## E. Canonical Meeting readiness

`runtime_status_bundle_logic.rs` now exposes:

```text
meeting_session
-> MeetingSessionPreflight
```

Normal `runtimeProductFacade` maps Meeting readiness from this canonical preflight,
including required outbound AI, microphone, Meeting route, route execution guard,
and finalized/continuous outbound blockers.

Normal product readiness no longer treats these as authority:

```text
live_meeting_runtime_gate
runtime_readiness_bundle
internal_validation_gate
professional progress/readiness
local_worker_manifest runtime assumptions
native CT2 candidate validation
stale MODEL_RUNTIME_MANIFEST
```

Those may remain in Developer Diagnostics while they have a real diagnostic consumer.
They do not make Text or Meeting Ready.

## Proof State

**CURRENT-PROJECT VERIFIED** at static-source level:

1. model inventory language is installation-only, not runtime PASS;
2. stale `MODEL_RUNTIME_MANIFEST.json` is removed;
3. static worker-manifest diagnostics no longer depend on previous-machine load/CUDA/SAPI state;
4. individual helper task outcomes no longer redefine whole-worker/provider readiness;
5. Text readiness uses current worker translation capability rather than file presence or unconditional `true`;
6. canonical `MeetingSessionPreflight` is exposed to the existing product facade;
7. normal product readiness no longer consumes legacy live/internal/professional/migration gates as authority.

No build/typecheck/helper/model command was executed in this `ChatGPT -> GitHub`
channel. All actual runtime claims remain `LOCAL PROOF REQUIRED`.

## Hold

- do not add a second scheduler, worker, readiness service, or capability store;
- do not reintroduce `MODEL_RUNTIME_MANIFEST.json` or another source-tree runtime
  snapshot;
- do not use model presence as model-load/quality proof;
- do not use an individual request success/failure as universal provider health;
- do not adopt PyO3/maturin or a second Python process for cancellation/performance;
- do not start Finalized Utterance Producer or incoming Meeting work yet;
- do not start local Windows acceptance yet.

## Next Step

Start **Engine Consolidation Slice 3 — caller-owned modes + scheduler/cancellation**.

Bounded target:

```text
Meeting outbound request -> explicit Realtime
Text request             -> explicit Quality
        |
        v
ONE helper scheduler / stdin-stdout authority
        |
        +-- Meeting priority over Text
        +-- unique request identity
        +-- drop queued stale Meeting work
        +-- Stop revokes generation first
        +-- hard-cancel worker process when in-flight inference cannot be cancelled truthfully
```

Slice 3 must also remove silent tokenizer/input truncation from the canonical worker
path: large/unsupported input must be rejected or handled explicitly, never silently
cut to `max_length=256` while reporting successful translation.

Do **not** combine Slice 3 with Python dependency/tooling adoption, model replacement,
Finalized Utterance Producer, incoming Meeting Sound, or Svelte migration.

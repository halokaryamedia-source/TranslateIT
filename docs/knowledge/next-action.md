# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Plan drafted; runtime source changes are paused until this plan is approved.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> only the bounded engine owner required by the approved consolidation slice
```

## Current Mode

**Plan**.

Execution channel remains:

```text
ChatGPT -> GitHub
```

The previously planned finalized-utterance feature is **deferred, not cancelled**.
It must not be implemented on top of the current overlapping AI execution paths.

Local/Windows acceptance remains deferred until source-side consolidation work is
complete. Model quality, latency, CPU/CUDA usability, memory/VRAM behavior, real
cancellation timing, TTS/audio delivery, and installed operation remain
`LOCAL PROOF REQUIRED`.

# Engine Consolidation Target

The target is deliberately small:

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

Required ownership rules:

```text
one persistent worker process
one worker command protocol
one model inventory authority
one current capability-status path
one Meeting session/generation authority
one scheduling/cancellation policy
no fake translation fallback
no automatic cross-mode fallback
```

This plan does **not** replace the approved `Rust/Tauri + Python helper` architecture
and does not move Windows audio ownership into the AI worker.

# 1. Execution Path Classification

Every current Translate/AI execution path receives exactly one disposition.

| Current path | Decision | Consolidation rule |
|---|---|---|
| `commands/helper_bridge.rs` + `helper_bridge_runtime.rs` | **KEEP** | Remains the single Rust owner of the persistent Python process/protocol. Its internal locking/scheduling will be replaced, not duplicated. |
| `WorkerRuntime/realtime_local_worker.py` | **KEEP** | Becomes the only Python process entry and canonical implementation of `status / preload / transcribe / translate / synthesize`. |
| `WorkerRuntime/realtime_local_worker_entry.py` | **MERGE** | Only genuinely required behavior may be folded into the base worker; migration/dev handler registration is not product runtime. Delete the wrapper after callers switch. |
| `WorkerRuntime/realtime_local_worker_accelerated.py` | **REMOVE** | Do not keep a second worker merely for CT2 translation. If later profiling proves CT2 translation necessary, implement that backend inside the canonical worker using current official APIs. Git history preserves the old experiment. |
| `commands/text_translate.rs` | **KEEP** | Remains the product Text command, but it must call only the canonical persistent worker path. |
| `engine/manual_translation_accelerated.rs` | **REMOVE** | One-shot Python spawn and fallback chain are incompatible with the single persistent runtime. |
| `engine/manual_translation.rs` | **REMOVE** | No production fallback to alternate worker/planner. |
| `adapters/translation_logic.rs` deterministic/preview output | **REMOVE** | Rule/dictionary/preview text may not report successful product translation. Failure must stay truthful. |
| `engine/capture_lifecycle.rs` AI pipeline responsibilities | **REPLACE** | Preserve only required capture lifecycle behavior or move it to existing audio owners; remove one-shot ASR -> Translate -> TTS execution and Realtime<->Quality fallback. |
| `commands/runtime_capture.rs` capture/asr migration handoff paths | **REMOVE** | Remove migration preview/stub/helper dispatch ownership from product execution and registry after direct audio/Meeting owners cover required behavior. |
| `pipeline_handoff`, `asr_payload_boundary`, dev seed/smoke handoff commands as product path | **REMOVE** | Contract/migration scaffolds must not remain production AI execution/readiness authorities. Keep only genuinely used diagnostic evidence if a current consumer requires it. |
| `commands/meeting_session.rs` application Meeting authority + finalized-stage function | **KEEP** | Continue using `session_id + generation + utterance_id` and generation checks; route its AI calls through the single scheduler/worker. |
| `virtual_audio_route_runtime.rs` Meeting route | **KEEP** | Separate Windows-audio owner; generation-aware cancellation remains. It is not part of AI engine consolidation. |

## Canonical Text path after consolidation

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust translate_text
-> helper scheduler
-> persistent worker `translate`
-> one result
```

If the worker/model is unavailable, Text returns a truthful unavailable/setup/error
state. It does **not** spawn another worker or synthesize a rule-based translation.

## Canonical Meeting outbound AI path after consolidation

```text
finalized Indonesian utterance
-> Meeting generation authority
-> helper scheduler [Meeting priority]
-> persistent worker transcribe
-> generation check
-> persistent worker translate (Realtime)
-> generation check
-> persistent worker synthesize
-> generation check
-> TranslateIT Meeting Microphone route
```

The finalized utterance producer itself resumes only after this AI path is
source-canonical.

# 2. Realtime / Quality Ownership

Global `RuntimeSettings.runtime_profile` must stop deciding both Meeting and Text.

Target caller-owned behavior:

```text
Meeting outbound -> Realtime by default
Text             -> Quality by default
```

A request carries its mode explicitly into the worker.

Rules:

- no silent `Realtime -> Quality` or `Quality -> Realtime` fallback merely to obtain
  output;
- a requested mode that cannot run reports its real capability state;
- CPU fallback is a device fallback inside the same requested mode, not permission to
  switch model/profile silently;
- Text ID <-> EN must have one explicit bidirectional Quality path;
- Meeting outbound initial Realtime remains ID -> EN;
- incoming EN -> ID performance/model choice remains a later incoming-lane decision.

Existing `runtime_profile` may remain temporarily for settings-schema compatibility
while callers are migrated, but it must stop being canonical engine authority and is
removed/migrated when no real consumer remains.

# 3. Model / Provider Plan

Do not replace models merely because the audit found architecture problems. Current
models remain **candidates** until local evaluation.

| Capability | Current candidate | Plan |
|---|---|---|
| Meeting/primary ASR | Faster Whisper Large V3 Turbo | **KEEP candidate**. Validate Indonesian meeting quality and CPU/CUDA latency later. |
| ASR degraded fallback | Faster Whisper Medium | **DEFER required-status decision** until CPU fallback benchmarking shows whether it is needed. It should not block core installation merely because it is a backup. |
| Meeting Realtime ID -> EN translation | MarianMT ID-EN | **KEEP candidate** pending domain quality/latency proof. |
| Text Quality ID <-> EN | NLLB 200 distilled 600M | **KEEP candidate** pending bidirectional quality/latency proof. |
| Default English TTS | Piper and/or Windows SAPI inside one worker provider contract | **KEEP candidates**; require explicit English voice selection and evaluate quality/startup latency later. |
| custom `marcel` voice | inherited custom-voice settings/manifest | **DEFER** from core Meeting readiness; remains post-core/Audio Studio-related until separately approved/proven. |
| CT2 translation conversion/backend experiment | accelerated worker + `marianmt-id-en-ct2` setup | **DEFER**. Reconsider only from profiling/benchmark evidence, inside the canonical worker rather than as a second worker. |

# 4. Model / Dependency Truth Classification

| Current owner/input | Decision | New semantic meaning |
|---|---|---|
| `WorkerRuntime/model_manifest.json` | **KEEP** | One declarative install catalog. Harden model source/revision/license/checksum and required-vs-optional status; it does not claim load/inference success. |
| `commands/runtime_inventory.rs` | **REPLACE** | Static inventory reports `Installed / Missing / Metadata incomplete`, not inference `PASS`. Merge duplicate static inventory logic here if still needed. |
| `RuntimeContracts/MODEL_RUNTIME_MANIFEST.json` | **REMOVE** | Previous-machine snapshot must not be current runtime truth from the source tree. Runtime evidence belongs to runtime logs/evidence. |
| `realtime_stack_manifest.json` | **MERGE** | Fold only required mode/model defaults into the canonical worker/request contract, then remove the manifest as execution/readiness authority. Its current unproved latency targets/budgets are not release truth. |
| `local_worker_manifest_logic.rs` | **MERGE** | Any unique static asset checks move to the single inventory owner; remove it as a parallel readiness authority. |
| worker `status` | **KEEP** | Becomes current worker capability source, with explicit separation of dependency/asset presence, loaded state, device, and last verified inference where available. |
| helper `provider_ready` boolean | **REPLACE** | A request result must not mutate one coarse global “all providers ready” truth. Expose capability-scoped state instead. |
| Rust native CT2/CUDA candidate validation as product GPU truth | **REMOVE** | Active worker reports the backend/device it actually uses. A speculative native FFI candidate must not define product readiness. |
| `setup_models()` current report-only command | **REPLACE** | Do not call a presence check “setup”. Installed assets are release inputs; diagnostics may inspect them. Packaging owns actual installation/delivery. |

Required capability vocabulary:

```text
Installed
Loaded
Verified for this capability/run
Degraded
Unavailable / Setup Needed
```

Never collapse these into one `Ready` flag.

# 5. Readiness Authority Plan

After consolidation, product readiness flows in one direction:

```text
static install inventory
        |
        v
persistent worker capability status
        |
        v
MeetingSessionPreflight / Text capability check
        |
        v
runtimeProductFacade
        |
        v
normal UI
```

Decisions:

| Current readiness owner | Decision |
|---|---|
| `MeetingSessionPreflight` | **KEEP** as transactional Meeting Start authority. |
| `runtimeProductFacade` | **KEEP** only as product-level mapper/presentation boundary. It does not infer readiness from unrelated legacy gates. |
| worker status/capability report | **KEEP** as current AI runtime capability source. |
| static model inventory | **KEEP** only as install/setup evidence. |
| live/professional/internal/migration readiness gates used for product readiness | **REMOVE** from normal product truth; delete later if they have no unique current diagnostic consumer. |
| source-marker runtime-readiness validators | **REPLACE** with narrowly named source-contract checks or executable tests matching the actual claim. |

A successful `translate`, `transcribe`, or `synthesize` request updates evidence for
that capability/request only. It must not automatically make every provider Ready.

# 6. Scheduler / Cancellation Plan

Extend the existing helper bridge; do not add a second scheduler service.

Initial policy:

```text
priority 1 -> active Meeting outbound work
priority 2 -> later optional/incoming Meeting work
priority 3 -> standalone Text work
priority 4 -> diagnostics/preload work when not required by a higher priority start
```

Rules:

1. One canonical scheduler owns worker stdin/stdout and task ordering.
2. The general status/state lock must not be held for the entire blocking model
   inference/read operation.
3. Every task has a unique request identity. Meeting tasks additionally carry
   `session_id + generation + utterance_id`.
4. Queued stale/revoked Meeting tasks are dropped before execution.
5. Text remains usable while Meeting is live, but it waits when Meeting work is
   pending; Text never steals required realtime capacity.
6. `Stop Translation` revokes Meeting generation first. If a worker inference for
   that revoked generation is already blocking and the protocol cannot cancel it
   cooperatively, terminate that worker process rather than pretending token
   invalidation stopped compute. The worker can restart/preload on the next valid
   request.
7. No arbitrary sleep/retry loop is introduced to make cancellation look successful.
8. Result promotion always rechecks the request/session authority even if worker
   process cancellation later becomes more sophisticated.

This intentionally chooses a simple hard-cancel boundary before inventing an
embedded-Python, multi-process model farm, or complex cooperative-cancel protocol.

# 7. Python / Rust Tooling Decision

Tools remain development/proof mechanisms, not skills or product owners.

| Tool | Decision | When |
|---|---|---|
| `uv` | **ADOPT** | Canonical Python project/environment and lockfile owner once worker sources are consolidated. End users never run it. `uv.lock` generation requires the later local/tooling phase. |
| Ruff | **ADOPT** | One Python lint/format tool after the canonical Python source boundary is established. Do not stack Black/Flake8/isort equivalents. |
| pytest | **ADOPT** | Executable worker/protocol correctness tests; replace test theater/source-marker assertions where the claim is behavioral. |
| pytest-benchmark | **DEFER until measured stage exists** | Add only when there is a stable function/stage worth regression benchmarking. |
| py-spy | **ADOPT as local operator profiler** | First profiler for the actual persistent worker during local performance evaluation; not a packaged dependency. |
| Scalene | **DEFER** | Escalate only if py-spy/simple memory/device measurements cannot explain a real bottleneck. |
| `ty` / another Python type checker | **DEFER** | Re-evaluate after worker request/response types are stable; avoid a typing migration as cleanup theater. |
| PyO3 / maturin | **DEFER** | Reconsider only if profiling proves process/IPC overhead is material and FFI reduces total complexity. |
| Rust extra ecosystem crates/tools | **NO CHANGE by default** | Use existing Cargo fmt/clippy/test and discover an external crate only for a proved missing capability. |

# 8. Dependency / Runtime Reproducibility Target

Source-side target:

```text
WorkerRuntime/pyproject.toml     -> canonical Python project/dependency declarations
WorkerRuntime/uv.lock            -> generated later with uv in local/tooling phase
model_manifest.json              -> canonical model asset catalog
```

Current unpinned `requirements-realtime.txt` stops being dependency authority after
this migration. A generated/exported requirements file may exist only when packaging
needs one; it is derived output, not a second owner.

Development worker resolution target:

```text
explicit configured project environment
-> canonical worker
```

Automatic fallback across arbitrary `python`, `python3`, and `py -3` must not be a
production runtime contract. `release-packaging-development` later owns the bundled
Python/runtime layout for installed builds.

# 9. Minimum Proof Matrix

## Source-side consolidation proof — before returning to feature development

Must establish from current source:

1. Text and Meeting AI calls have one persistent-worker route.
2. No rule-based/preview/dev-seed result can become successful product translation.
3. No active one-shot AI worker or silent cross-mode fallback remains in product
   execution.
4. Product readiness no longer depends on stale runtime snapshots or migration/
   professional/source gates.
5. Meeting/Text mode ownership is explicit and scheduler priority/cancellation
   authority has one owner.
6. Production registry no longer exposes obsolete migration/dev AI controls unless a
   current Diagnostics consumer is proved.

These are source/ownership claims only; build/runtime proof remains local.

## Later local correctness proof

Use the **actual persistent worker process**, not direct one-shot scripts:

```text
worker start/ping/status
ASR preload + known audio -> non-empty transcript
Realtime ID -> EN translation -> non-empty model result
Quality ID -> EN and EN -> ID -> non-empty model result
English TTS -> valid output audio
Stop/restart and stale-request rejection
Meeting-priority vs Text scheduling behavior
```

## Later model-quality decision proof

Use a small fixed internal corpus that covers the risks rather than one “halo”
sample:

- Indonesian conversational Meeting speech;
- names/entities, numbers, dates, units, acronyms, and technical terms;
- short and longer natural utterances;
- ID -> EN Realtime translation;
- ID <-> EN Quality Text translation;
- noisy/ordinary microphone speech for ASR;
- English TTS intelligibility/naturalness.

Record raw per-case results and failure categories. Do not convert one aggregate score
into a fake “engine quality %”. Release thresholds are chosen only after baseline
measurement exists.

## Later performance proof

Measure separately:

```text
cold model start/preload
warm ASR
warm translation Realtime
warm translation Quality
warm TTS
memory / VRAM footprint
CPU fallback behavior
Meeting scheduler contention
official outbound latency:
utterance end -> translated audio begins
```

Use `py-spy` first for Python bottlenecks. A faster benchmark is not quality proof.

# 10. Proposed Source-Side Implementation Order After Approval

Do not combine these into one broad refactor.

### Slice 1 — Canonical worker and truthful Text execution

- make `realtime_local_worker.py` the single process entry;
- remove wrapper/one-shot/manual/fake translation execution from active Text;
- `translate_text` calls the persistent helper only;
- remove silent Realtime<->Quality fallback from legacy product execution;
- prune corresponding obsolete registry commands only when direct consumers are
  proved absent.

### Slice 2 — Capability/readiness truth

- remove stale runtime-manifest/gate inputs from product readiness;
- split static Installed state from worker Loaded/Verified capability state;
- make Meeting preflight and Text capability checks consume this canonical truth;
- fix coarse helper `provider_ready` semantics.

### Slice 3 — Request-scoped modes + scheduler/cancellation

- Meeting explicitly requests Realtime;
- Text explicitly defaults to Quality;
- add one helper task scheduler/identity contract;
- Meeting priority over Text;
- Stop generation revoke + hard worker cancellation when an in-flight revoked task
  cannot be interrupted cooperatively.

### Slice 4 — Dependency/tooling consolidation

- establish one Python project definition for the canonical worker;
- adopt Ruff + pytest configuration without duplicate tooling;
- prepare uv ownership; generate/verify lock only in the later local phase;
- harden the model catalog metadata and remove stale setup/readiness terminology.

### Slice 5 — Resume Meeting feature development

Only after Slices 1-4 are source-canonical, return to the deferred
**finalized outbound utterance producer**, then continue Meeting Live/incoming/turn
coordination in their own bounded slices.

# Hold

Until this plan is approved and Developing resumes:

- do not edit Engine runtime source;
- do not add another worker/service/readiness gate/model manifest;
- do not keep legacy paths `just in case`; Git history is the fallback;
- do not implement CT2/PyO3/another model from assumption;
- do not promote static or stale evidence into Ready;
- do not start local Windows acceptance yet.

# Proof State

**CURRENT-PROJECT VERIFIED** at source/ownership level:

- multiple AI execution paths currently compete;
- fake/non-model translation success exists in inherited product-reachable logic;
- current persistent helper locking/cancellation semantics are not sufficient to
  claim realtime cancellation;
- stale/static readiness inputs overlap the newer Meeting preflight;
- model/profile manifests do not match one unambiguous execution authority;
- `source-ownership.md` now reflects these conflicts instead of calling the current
  translation runtime canonical.

**LOCAL PROOF REQUIRED** for all model quality/performance/device/runtime claims.

# Next Step

**Approve this Engine Consolidation Plan, then transition back to Developing and
execute Slice 1 only: canonical persistent worker + truthful Text execution, with no
finalized-utterance feature work in the same slice.**
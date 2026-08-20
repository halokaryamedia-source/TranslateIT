# MiLMMT-1B Runtime Validation and Target-PC Workflow

This document is the detailed continuity owner for the selected MiLMMT translation target, its valid evidence, the closed latency-optimization result, the canonical WorkerRuntime compatibility gate, and the Windows/PowerShell target-PC workflow.

It does **not** replace:

- `docs/knowledge/decision-log.md` for durable decisions;
- `docs/knowledge/next-action.md` for current status and the single active next step;
- current source/runtime proof for actual implementation behavior.

If this document conflicts with current source or a newer explicit decision, follow repository precedence in `AGENTS.md` and reconcile the stale owner.

## 1. Selected Translation Target

```text
Model       xiaomi-research/MiLMMT-46-1B-v1.0
Revision    4fc480b6c58dec29c159dcdf9fde0f6d5c354995
Precision   BF16
Primary     CUDA on target Windows RTX 3070 8 GB
Prompt      official Xiaomi translation prompt
Generation  deterministic / do_sample=false
```

MiLMMT-46-4B-v1.0 is comparison evidence only. Do not reopen 4B or another translator unless the user explicitly changes the model decision.

The product keeps one canonical translator. When migration is accepted, MiLMMT-1B replaces the current production translator rather than becoming a router/fallback beside it.

Production source remains unchanged until the WorkerRuntime compatibility gate below is resolved.

## 2. Evidence Authority

### 2.1 Aggregate quality evidence

Authoritative local files:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_realtime_ab_report.json
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_realtime_ab_review.md
```

The representative run contains:

```text
12 Indonesian -> English
12 English -> Indonesian
24 total realistic Meeting/Text utterances
```

The selected 1B scenario completed 24/24. The model is not semantically perfect; its selection is an explicit realtime product tradeoff, not a claim that every translation is flawless.

The first 24-case run remains valid for deterministic translation-output review. Its original whole-device VRAM/latency values are retired because the GPU already had roughly 3.5 GB in use before model load.

### 2.2 Clean RTX 3070 performance authority

Authoritative performance file:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_clean_perf_rerun_report.json
```

Clean starting condition:

```text
whole-device VRAM   ~848 MiB
GPU utilization     ~6%
```

MiLMMT-1B BF16:

```text
cold load                 2271 ms
framework allocated       ~1907 MiB
whole-device after load   ~2930 MiB
wall p50                  689.11 ms
wall p90                  1139.34 ms
wall mean                 ~791 ms
wall max                  ~1157 ms
inference p50             ~654 ms
inference p90             ~1097 ms
18/18 samples successful
deterministic outputs     yes
```

For comparison only, clean MiLMMT-4B INT8 measured roughly 4516 ms p50 / 7036 ms p90 and ~4826 MiB framework allocation.

## 3. Closed Same-Model Latency Optimization

Authoritative optimization file:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_1b_latency_optimization_report.json
```

### 3.1 Selected runtime configuration

Keep:

```text
MiLMMT-46-1B-v1.0
BF16
PyTorch / Transformers
SDPA attention
normal/default dynamic generation cache
persistent loaded model
no benchmark-only nvidia-smi calls in normal per-request hot path
```

Do **not** add:

```text
StaticCache
torch.compile
INT8 / INT4 / FP16
FlashAttention package
vLLM
TensorRT
CTranslate2
speculative second model
alternate translator / router
output rewriting / phrase repair
```

### 3.2 Why optimization stops here

Production-like baseline after removing benchmark-only request instrumentation:

```text
p50  674.51 ms
p90  1133.81 ms
24/24 authoritative quality outputs exact-match
attention backend reports SDPA
```

Compared with clean authority:

```text
p50 improvement  ~2.1%
p90 improvement  ~0.5%
```

This is useful confirmation that production hot-path instrumentation should stay out of normal requests, but the gain is not large enough to justify a complex alternate runtime.

StaticCache without compile:

```text
p50  723.97 ms
p90  1169.84 ms
slower than baseline
changed output on meeting.en_id.12.scope
```

Observed changed text:

```text
baseline:
Untuk patch ini, ubahlah hanya logika checkpoint dan masalah regen. Biarkan seni lingkungan, dialog NPC, dan audio tetap utuh.

StaticCache:
Untuk patch ini, ubahlah hanya logika checkpoint dan masalah regen-nya saja. Biarkan seni lingkungan, dialog NPC, dan audio tetap utuh.
```

The wording change is not automatically a semantic failure, but it violates the preferred exact-output equivalence gate and brings no speed benefit. Therefore StaticCache is rejected. The compile variant is not pursued because its prerequisite cache path already failed the same-quality/speed gate.

**Do not continue latency tuning.** The chosen execution path is the simple default SDPA + default cache path.

## 4. Canonical WorkerRuntime Compatibility Gate

A concrete dependency difference exists before production migration:

```text
validated MiLMMT evaluation environment
→ transformers 4.57.6

canonical WorkerRuntime pyproject
→ transformers >=4.44.0, <=4.50.0
```

The selected model must be tested once inside the **current frozen canonical WorkerRuntime** before source migration. Do not change the dependency lock just because a newer test environment was used.

Implemented owners:

```text
tools/translation_quality/milmmt_1b_workerruntime_compatibility.py
tools/translation_quality/run_milmmt_1b_workerruntime_compatibility.ps1
```

The compatibility proof:

```text
uses existing cached MiLMMT-1B model only
verifies exact pinned revision
uses `uv run --frozen --no-dev` from canonical WorkerRuntime
uses the current WorkerRuntime Python/dependency lock
keeps model access offline
loads MiLMMT-1B BF16 on CUDA
runs all 24 representative cases once
compares every output against the authoritative MiLMMT-1B output
requires 24/24 success + 24/24 exact equality
records actual runtime versions from preload
writes one JSON report
```

Expected report:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_1b_workerruntime_compatibility_report.json
```

Decision:

```text
WORKERRUNTIME_COMPATIBLE
→ preserve current dependency lock
→ migrate canonical worker + model manifest

preload/model unsupported
→ diagnose exact Transformers/runtime capability gap
→ update dependency matrix only as required

24-case output changes
→ do not assume quality equivalence
→ identify whether version drift is responsible before migration
```

Do not create a second production Python environment to avoid the result.

## 5. Target-PC Testing Standard — Windows + One PowerShell Block

Target-Windows model/performance/audio claims must run on the actual target PC. GitHub/static inspection cannot substitute for target evidence.

### 5.1 Operator UX

When target-PC execution is required, give the user **one complete pasteable PowerShell block**.

The repository-owned wrapper should own, where relevant:

- repository/path checks;
- exact branch check;
- Python/dependency environment selection;
- CUDA/GPU capability checks;
- clean-GPU guard for performance-sensitive proof;
- cached model/revision validation;
- offline model flags when no download is required;
- actual test execution;
- report output path;
- safe STOP on failure.

Do not ask the user to share Hugging Face tokens or other secrets.

### 5.2 Standard execution shape

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT"

git fetch origin Local
git merge --ff-only origin/Local

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\<EXACT_RUNNER>.ps1
```

User-facing instructions must replace `<EXACT_RUNNER>` with the actual repository script. If the fast-forward merge fails, STOP and diagnose; do not reset/force/rewrite history as a convenience workaround.

### 5.3 Clean-GPU rule

For latency/VRAM-sensitive proof, close avoidable GPU-heavy applications such as:

```text
local AI / image generation / LLM workloads
games
3D/rendering workloads
video editing/encoding workloads
other CUDA-heavy processes
```

Current clean gate:

```text
whole-device VRAM <= 2048 MiB
GPU utilization   <= 10%
```

If the gate is not met, the wrapper should refuse to run the final proof rather than knowingly record contaminated evidence.

### 5.4 Current next PowerShell runner

```text
tools/translation_quality/run_milmmt_1b_workerruntime_compatibility.ps1
```

Normal user block:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT"

git fetch origin Local
git merge --ff-only origin/Local

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\run_milmmt_1b_workerruntime_compatibility.ps1
```

### 5.5 What the user returns

Normal success/failure evidence flow:

```text
run one PowerShell block
→ wrapper writes JSON report under UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB
→ user uploads the requested JSON
→ review exact state
→ execute the next repository step
```

Prefer the JSON report over copying a large terminal transcript. Terminal output is only needed if the wrapper fails before producing a useful report.

## 6. Sequence After Compatibility Proof

Do not skip ahead:

```text
1. run canonical WorkerRuntime compatibility proof
2. if compatible, preserve dependency lock
3. migrate realtime_local_worker.py to MiLMMT-1B causal translation
4. update model_manifest.json to the exact MiLMMT repo/revision/license/assets
5. stage existing cached model into RuntimeAssets for target proof; do not redownload it
6. verify canonical translation preload + 24 representative outputs
7. retire M2M100 from normal production path; do not retain fallback/router
8. run target-PC end-to-end proof:
   ASR -> MiLMMT-1B -> GPT-SoVITS MyVoice
9. measure stage timing, whole-pipeline behavior, and VRAM
10. after runtime scope is stable, continue release/installer packaging proof
```

If compatibility requires a dependency change, resolve that one dependency boundary before steps 3–10.

## 7. Session-Recovery Entry Point

If a chat/session ends, recover this work in this order:

```text
AGENTS.md
→ GITHUB_RULES.md Core Rules
→ CONTEXT.md
→ docs/knowledge/next-action.md
→ docs/knowledge/milmmt-1b-runtime-validation.md
→ smallest exact runtime/test owner needed for the recorded Next Step
```

Expected recovered truth at this milestone:

```text
selected model       MiLMMT-46-1B-v1.0 BF16
selected revision    4fc480b6c58dec29c159dcdf9fde0f6d5c354995
4B role              comparison evidence only
latency tuning        closed
selected cache        default/dynamic
selected attention    SDPA
StaticCache           rejected
production source     still M2M100 until compatibility + migration
current blocker       WorkerRuntime Transformers-version compatibility unknown
next objective        one frozen-WorkerRuntime 24/24 compatibility proof
operator method       one repository-owned PowerShell block on target Windows PC
```

## 8. Chat-Limit Handoff Checkpoint

This section exists specifically so a new chat can resume without reconstructing the recent model-selection/testing session from conversation history.

### 8.1 Local workspace and cached selected model

```text
Repository root
D:\Work\AI Stuff\TranslateIT

Selected cached model
UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB\models\milmmt_1b_model

Selected revision pin
UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB\models\milmmt_1b_revision.txt
```

The model is already downloaded. The current compatibility proof and the next migration work must reuse the existing exact-revision cache; do not redownload it merely to continue the session.

### 8.2 Important completed reports

```text
24-case 1B vs 4B quality/performance run
UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB\milmmt_realtime_ab_report.json
UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB\milmmt_realtime_ab_review.md

clean-GPU performance authority
UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB\milmmt_clean_perf_rerun_report.json

closed same-model latency optimization
UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB\milmmt_1b_latency_optimization_report.json
```

These reports are evidence, not runtime owners. Do not rerun them unless a later runtime/configuration change invalidates the claim they support.

### 8.3 Why 1B was selected despite 4B quality advantage

Observed evidence showed 4B has stronger aggregate translation metrics and often more natural/contextually precise wording. The user nevertheless explicitly selected 1B for the realtime product boundary because the clean RTX 3070 result showed a large practical latency and VRAM gap:

```text
MiLMMT-1B BF16
p50 ~689 ms
p90 ~1139 ms
framework model allocation ~1907 MiB

MiLMMT-4B INT8
p50 ~4516 ms
p90 ~7036 ms
framework model allocation ~4826 MiB
```

Do not reinterpret the selection as "1B has better translation quality." The actual decision is that 1B is the approved realtime tradeoff.

### 8.4 Known selected-model quality caveat

The 24-case review showed MiLMMT-1B is not perfect. One representative EN -> ID recommendation translated `should` too strongly as `harus` instead of recommendation-like `sebaiknya`. This is a known semantic-quality finding, not permission to add a phrase rule/postprocessor.

The current process explicitly rejects:

```text
one isolated error = reject whole model
one known fixture = patch output
should -> sebaiknya hard-coded rule
must/must-not phrase repair
fixture-targeted dictionary/postprocessor
```

The model decision was made from aggregate realistic-use evidence. Preserve that standard.

### 8.5 Things already decided — do not repeat automatically

```text
do not search/download another translator
do not reopen TranslateGemma, LMT, Marian, M2M100-1.2B or MiLMMT-4B as active challengers
do not rerun the 24-case model-selection suite for reassurance
do not rerun the clean 1B-vs-4B benchmark for reassurance
do not continue StaticCache / torch.compile tuning
do not quantize MiLMMT-1B merely to chase speed
do not create Realtime/Quality model profiles
do not create a production fallback/router with M2M100
do not change WorkerRuntime dependency versions before the compatibility proof says they are required
```

### 8.6 Exact active task when resuming

The only active translation task is:

```text
prove MiLMMT-46-1B-v1.0 BF16 under the CURRENT FROZEN canonical WorkerRuntime
```

Reason:

```text
validated evaluation runtime used transformers 4.57.6
canonical WorkerRuntime constrains transformers >=4.44.0, <=4.50.0
```

The test already exists. Do not redesign it before running it unless current source shows a concrete defect.

Exact PowerShell to give/run on the target PC:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT"

git fetch origin Local
git merge --ff-only origin/Local

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\run_milmmt_1b_workerruntime_compatibility.ps1
```

Before running, close avoidable GPU-heavy applications. The wrapper owns the clean-GPU gate and should refuse contaminated evidence.

Expected returned file:

```text
UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB\milmmt_1b_workerruntime_compatibility_report.json
```

### 8.7 What happens immediately after that report

```text
WORKERRUNTIME_COMPATIBLE + 24/24 exact equality
→ do not change dependency lock
→ migrate canonical realtime_local_worker.py to MiLMMT-1B
→ update model_manifest.json
→ stage cached exact-revision model into RuntimeAssets
→ canonical translation proof
→ retire M2M100 production path
→ ASR -> MiLMMT-1B -> GPT-SoVITS MyVoice target-PC end-to-end proof

incompatible preload/model support
→ inspect exact frozen WorkerRuntime dependency gap
→ change only the minimum dependency boundary actually required
→ rerun compatibility proof

24-case output drift
→ inspect changed outputs and version/runtime cause
→ do not claim quality equivalence and do not patch phrases
```

### 8.8 Minimal new-session instruction

If a new chat has no usable conversation context, the user can simply say:

```text
Amati repo TranslateIT branch Local, ikuti AGENTS/GITHUB_RULES, baca next-action dan MiLMMT runtime validation, lalu lanjutkan exact Next Step. Jangan mengulang model search atau benchmark yang sudah closed.
```

The repository must provide enough information to continue from that instruction without asking the user to reconstruct this session manually.

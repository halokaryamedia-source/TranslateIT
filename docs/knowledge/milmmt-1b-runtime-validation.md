# MiLMMT-1B Runtime Validation and Target-PC Workflow

This document is the detailed continuity owner for the selected MiLMMT translation candidate, its valid evidence, the bounded latency-optimization plan, and the Windows/PowerShell target-PC proof workflow.

It does **not** replace:

- `docs/knowledge/decision-log.md` for durable decisions;
- `docs/knowledge/next-action.md` for current status and the single active next step;
- current source/runtime proof for actual implementation behavior.

If this document conflicts with current source or a newer explicit decision, follow repository precedence in `AGENTS.md` and reconcile the stale owner.

## 1. Selected Translation Target

The selected migration target is:

```text
Model       xiaomi-research/MiLMMT-46-1B-v1.0
Revision    4fc480b6c58dec29c159dcdf9fde0f6d5c354995
Precision   BF16
Device      CUDA on target Windows RTX 3070 8 GB
Prompt      official Xiaomi translation prompt
Generation  deterministic / do_sample=false
```

MiLMMT-46-4B-v1.0 is comparison evidence only. Do not reopen 4B as the active production candidate unless the user explicitly changes the model decision.

Do not automatically introduce another translation model. The product still has one canonical translator; if MiLMMT-1B is accepted, it replaces the current production translator rather than becoming a router/fallback beside it.

Production remains unchanged until migration and end-to-end target proof are complete.

## 2. Evidence Authority

### 2.1 Aggregate quality evidence

The representative quality run used 24 realistic Meeting/Text utterances:

```text
12 Indonesian -> English
12 English -> Indonesian
```

Coverage included status updates, deadlines, clarification/correction, disagreement, conditional planning, technical handoff, numbers/IP/version facts, schedule, branch instructions, code switching, questions, scope constraints, and recommendation/prohibition in normal context.

Local evidence paths:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_realtime_ab_report.json
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_realtime_ab_review.md
```

The 1B scenario completed 24/24 cases. The model is not semantically perfect; the selection is a product/runtime tradeoff, not a claim that all translations are flawless.

The first 24-case run remains valid for translation-output/quality review because generation is deterministic. Its original whole-device VRAM and latency observations are **not** final hardware authority because the GPU already had roughly 3.5 GB in use before model load.

### 2.2 Clean RTX 3070 performance authority

The clean rerun is the active performance/VRAM authority:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_clean_perf_rerun_report.json
```

Clean starting condition:

```text
whole-device VRAM   ~848 MiB
GPU utilization     ~6%
```

Selected MiLMMT-1B BF16 result:

```text
cold load                 2271 ms
framework allocated       ~1907 MiB
whole-device after load   ~2930 MiB
wall p50                  689 ms
wall p90                  1139 ms
wall mean                 791 ms
wall max                  1157 ms
inference p50             654 ms
inference p90             1097 ms
18/18 measured samples    successful
deterministic outputs     yes
```

The roughly 35–42 ms wall-vs-inference gap shows some avoidable harness/runtime instrumentation overhead, but most remaining time is model generation compute.

For historical comparison only, the clean MiLMMT-4B INT8 run measured roughly 4516 ms p50 / 7036 ms p90 and ~4826 MiB framework allocation. This is why 4B was not selected for the realtime product boundary despite stronger aggregate translation metrics.

## 3. Retired / Non-Authoritative Evidence

Do not use these as current decision authority:

- the first run's GPU-contaminated MiLMMT latency/whole-device VRAM numbers;
- old LMT, M2M100-1.2B, TranslateGemma, or retired Marian candidate reports for choosing the active model;
- one isolated sentence as a whole-model rejection rule;
- model release date alone as promotion evidence.

Historical reports may remain for provenance, but they do not reopen model search.

## 4. Immediate Next Work — Same-Model Latency Optimization

The next engineering objective is **not** another model search and **not** production migration yet.

First run one bounded optimization pass on the selected MiLMMT-1B while protecting translation quality.

### 4.1 Fixed quality contract

Every optimization candidate must keep:

```text
same MiLMMT-46-1B-v1.0 revision
same BF16 weights/compute
same official Xiaomi translation prompt
same source text and language direction
same deterministic generation intent
no phrase-specific correction
no output rewriting/post-processing
no alternate translator/fallback/router
```

The first optimization pass must not introduce INT8/INT4, FP16, FlashAttention packages, vLLM, TensorRT, CTranslate2, a speculative second model, or another model checkpoint.

### 4.2 Optimization order

Keep the experiment small and attributable:

```text
A. BASELINE PRODUCTION-LIKE
   selected MiLMMT-1B BF16
   persistent model
   remove benchmark-only per-request diagnostics from hot path

B. ATTENTION / CACHE VERIFICATION
   verify actual attention backend
   retain/use native PyTorch SDPA when equivalent
   verify normal KV cache behavior

C. STATIC-CACHE / COMPILE CANDIDATE
   only if Windows + CUDA capability probe succeeds
   evaluate Static KV Cache
   evaluate torch.compile(mode="reduce-overhead") only when stable/supported
   avoid a compile/recompile matrix
```

Do not create multiple permanent runtime profiles. The benchmark may compare candidates, but the product must end with one selected execution configuration.

### 4.3 Quality-equivalence gate

Use the existing 24 representative cases as the behavior-protection set after any execution change.

Preferred acceptance:

```text
24/24 optimized outputs == baseline outputs exactly
```

If any output changes:

```text
changed outputs
→ manual semantic/factual/naturalness review
→ accept only if no quality regression is found
```

BLEU/chrF++ alone cannot prove equivalence. A speedup is not accepted when translation quality changes for the worse.

### 4.4 Performance acceptance

Compare against clean authority:

```text
wall p50 = 689 ms
wall p90 = 1139 ms
```

Adopt an optimization only when the improvement is repeatable and materially useful on the target RTX 3070. If the gain is marginal, unstable, adds disproportionate runtime complexity, or weakens quality, keep the simpler baseline configuration.

There is no requirement to optimize merely because an optimization exists.

## 5. Current Latency-Optimization Owners

The bounded optimization proof is now implemented by:

```text
tools/translation_quality/milmmt_1b_latency_optimization.py
tools/translation_quality/run_milmmt_1b_latency_optimization.ps1
```

The Python owner runs only the selected cached MiLMMT-1B revision in BF16. It compares a production-like baseline against low-risk execution variants, verifies the actual attention backend, and evaluates StaticCache with compilation disabled and with Transformers automatic compile configured for `reduce-overhead` only when that runtime path can execute.

The benchmark is staged to avoid unnecessary work:

```text
baseline
→ prove 24/24 exact equality against existing quality authority
→ measure 6 representative cases x 3 repeats after warmup

candidate variant
→ measure representative subset first
→ require exact subset output equality
→ require >=5% p50 improvement with <=5% p90 regression
→ only then spend time on full 24-case exact-equality proof
```

If the default baseline already reports SDPA, the explicit-SDPA duplicate run is skipped. If StaticCache is unsupported or changes output, the dependent compile path is skipped or marked unsupported rather than forcing a fallback.

The benchmark reuses the already downloaded selected checkpoint and existing quality/performance authority. It runs offline, downloads no model, and does not modify production.

## 6. Target-PC Testing Standard — Windows + One PowerShell Block

Target-Windows model/performance/audio claims must run on the user's actual PC. GitHub/static inspection cannot substitute for this proof.

### 6.1 Operator UX rule

Whenever target-PC execution is required, give the user **one complete pasteable PowerShell block**.

Do not ask the user to execute scattered commands one by one when a repository-owned wrapper can own the procedure.

The repository wrapper should own, where relevant:

- environment/path checks;
- CUDA/GPU capability checks;
- clean-GPU guard for performance tests;
- cached model/path validation;
- offline flags when downloads are not required;
- actual test execution;
- report output path;
- safe STOP on failure.

Do not ask the user to paste or share Hugging Face tokens/secrets.

### 6.2 Standard PowerShell execution shape

For a repository-owned target-PC runner, the normal user-facing block is:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT"

git fetch origin Local
git merge --ff-only origin/Local

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\<EXACT_RUNNER>.ps1
```

Important: user-facing instructions must replace `<EXACT_RUNNER>` with the exact current repository script. Do not leave a placeholder in instructions given for execution.

If `git merge --ff-only` fails, STOP and inspect the cause. Do not use reset/force/history rewrite as a convenience workaround.

### 6.3 Clean-GPU rule for performance proof

Before a latency/VRAM performance run, close avoidable GPU-heavy applications such as:

```text
local AI/LLM/image-generation workloads
games
3D/rendering workloads
video editing/encoding workloads
other CUDA-heavy processes
```

Normal lightweight desktop/browser usage does not need to be closed unless it materially consumes GPU resources.

Performance wrappers should automatically probe the GPU. Reuse the clean-test gate proven by the MiLMMT rerun unless later evidence justifies changing it:

```text
whole-device VRAM <= 2048 MiB
GPU utilization   <= 10%
```

If the gate is not met, the wrapper should refuse to benchmark and tell the user to close GPU-heavy apps. Do not collect a knowingly contaminated final benchmark.

### 6.4 Current completed target-PC runner

The clean performance runner already used successfully is:

```text
tools/translation_quality/run_milmmt_clean_perf_rerun.ps1
```

Its result is already authoritative. Do **not** rerun it merely for reassurance. Rerun only when the measured runtime/hardware configuration materially changes or the evidence itself is invalidated.

### 6.5 Current latency-optimization target-PC runner

The latency-optimization runner now exists on `Local`. The user flow is one block of this exact shape:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT"

git fetch origin Local
git merge --ff-only origin/Local

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\run_milmmt_1b_latency_optimization.ps1
```

This runner validates the existing MiLMMT evaluation environment, selected cached 1B model, prior quality report, and clean performance report. It enforces the clean-GPU gate, forces Hugging Face/Transformers offline mode, runs the optimization proof, and writes:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_1b_latency_optimization_report.json
```

### 6.6 What the user returns after a local run

Normal success flow:

```text
run one PowerShell block
→ wrapper writes JSON/Markdown evidence under UserData/CacheData/TranslationQuality
→ user uploads the requested report file
→ review evidence
→ make the next decision
```

Prefer the report artifact over large terminal transcripts. Ask for terminal output only when the wrapper fails before producing useful evidence.

## 7. Sequence After Latency Optimization

Do not skip ahead. The intended sequence is:

```text
1. isolated MiLMMT-1B latency benchmark implemented
2. run clean target-PC benchmark via one PowerShell block
3. enforce quality-equivalence gate
4. choose one fastest safe MiLMMT-1B execution configuration
5. migrate selected MiLMMT-1B into the canonical production translation owner
6. retire M2M100 from normal production path; do not retain fallback/router
7. run one target-PC end-to-end proof:
   ASR -> MiLMMT-1B -> GPT-SoVITS MyVoice
8. measure stage timing + whole pipeline behavior/VRAM
9. only after runtime scope stabilizes, continue release/installer packaging proof
```

If the optimization pass produces no worthwhile safe gain, use the clean baseline MiLMMT-1B BF16 configuration and continue to migration/end-to-end proof. Do not delay the project indefinitely for micro-optimizations.

## 8. Session-Recovery Entry Point

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
selected model      MiLMMT-46-1B-v1.0 BF16
selected revision   4fc480b6c58dec29c159dcdf9fde0f6d5c354995
4B role              comparison evidence only
production           still unchanged until migration proof
performance baseline clean 689 ms p50 / 1139 ms p90
next objective       run the implemented same-model latency optimization on target PC
operator method      one repository-owned PowerShell block on target Windows PC
```

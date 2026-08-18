# TranslateIT — Next Action

## Current Status

`TRANSLATION QUALITY PLAN FINALIZED / LMT-60-1.7B APPROVED REPLACEMENT TARGET / STABLE CUDA ACCELERATION STRATEGY FROZEN / BENCHMARK CONTRACT FREEZE NEXT / NO PRODUCTION SWITCH YET / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, advance to microphone / VoiceLab / Meeting acceptance, or resume installer work until the benchmark contract is frozen and the approved replacement path passes target-Windows quality, latency, and memory gates.

Durable decisions: D-025 and D-026 in `docs/knowledge/decision-log.md`.

## Non-Negotiable Final Architecture

Normal product operation has exactly **one canonical translation model**.

If the approved migration passes:

```text
Standalone Text           ID ↔ EN
Meeting outbound          ID → EN
Optional Meeting incoming EN → ID
            │
            └──── ONE LMT-60-1.7B translator
```

ASR and GPT-SoVITS remain separate speech stages and are not translation engines.

M2M100 may exist only as the current pre-migration baseline and as a sequential evaluation reference. It must not survive the accepted migration as fallback, router member, alternate mode, secondary provider, or release asset.

## Current Evidence / Why Migration Is Still Blocked

Current M2M100 target acceptance:

```text
STEP 1    application / worker startup              PASS
STEP 2A   ID → EN representative Text               PASS correctness / quality findings
STEP 2B   EN → ID representative Text               PASS correctness / quality findings
STEP 2C-A long multi-paragraph ID → EN              PASS correctness / quality findings
STEP 2C-B long multi-paragraph EN → ID              FAIL semantic correctness
```

Blocking example:

```text
must not
→ tidak harus
```

This reverses prohibition into approximately `does not have to`; it is a semantic correctness failure, not a grammar-only issue.

## Approved Replacement Target

```text
repo       NiuTrans/LMT-60-1.7B
revision   2ff175e2a450d2f2458b33234bfb74953468b3a2
license    Apache-2.0
family     Qwen3 causal LM, translation-specialized
weights    model.safetensors ≈ 4.06 GB / BF16
reference  official prompt + chat template
           deterministic generation
           num_beams=5
           do_sample=False
```

The reviewed model artifacts are Qwen3 and declare Transformers 4.51.3-era generation metadata. Current WorkerRuntime caps Transformers at 4.50.0, so compatibility must first be proven in an isolated evaluation environment. Do not jump to Transformers v5 and do not update production `uv.lock` before that proof.

The candidate must not enter production `model_manifest.json`, RuntimeAssets, or the canonical worker before D-025 passes.

## Pre-Development Technical Audit

### 1. LMT is not an M2M model-path swap

Current M2M100 is encoder-decoder (`AutoModelForSeq2SeqLM`, target language ID / forced BOS). LMT is a causal LM (`AutoModelForCausalLM`) using an explicit translation prompt, chat template, autoregressive continuation, and continuation-only decode.

Migration therefore requires one bounded translation-adapter replacement, not compatibility glue and not a second engine.

### 2. Prompt-aware input accounting is required

LMT context consumption includes the rendered chat/translation prompt. Any safe input limit must account for:

```text
prompt tokens + source tokens + bounded generated tokens <= model context
```

No tokenizer truncation and no incomplete output promoted as complete.

### 3. Causal completion accounting must use continuation tokens only

The worker must record prompt length, slice generated continuation before decode, and evaluate EOS / generation budget against the continuation rather than the prompt+continuation sequence.

### 4. Existing Text / Meeting ownership is already correct

Current Meeting outbound and optional incoming both call the canonical worker `translate` command. Preserve that owner. Do not create a voice translator, second worker, or model router.

### 5. Segmentation is model evidence, not permanent policy

Current Standalone sentence segmentation repaired M2M omissions. After LMT quality passes, compare only:

```text
A. whole paragraph / natural source unit
B. current semantic-unit segmentation
```

Prefer the simpler whole-paragraph path if it remains complete and semantically correct. Meeting stays one finalized utterance at a time unless Meeting-specific evidence says otherwise.

## Final Stable Latency Strategy

The previous idea of stacking KV cache + FlashAttention2 + `torch.compile` + CTranslate2 together is **rejected**. It changes too many variables, is harder to diagnose, and is not the most stable Windows path.

### Reference profile — quality truth first

Run the pinned model exactly through the reviewed Hugging Face/PyTorch inference shape:

```text
PyTorch CUDA
BF16
beam 5
do_sample=False
upstream prompt/chat template
upstream model config (`use_cache=false`)
model resident after preload
model.eval()
torch.inference_mode()
```

This establishes reference quality and latency before acceleration.

### Acceleration A — preferred production candidate

If reference quality passes, change **one performance behavior first**:

```text
same model / weights / BF16 / prompt / beam 5
+ dynamic KV cache (`use_cache=true`)
+ persistent loaded model
+ native PyTorch attention backend
```

Why this is preferred:

- KV cache removes repeated key/value recomputation during causal decoding without changing the model weights, prompt, or beam policy.
- Dynamic cache grows with actual sequence length instead of reserving the model's full 32k context.
- On LMT-1.7B (28 layers, 8 KV heads, head dim 128, BF16), a rough theoretical KV footprint at beam 5 is about 0.27 GiB for 512 cached tokens and about 0.55 GiB for 1024 cached tokens; this is practical enough to test on 8 GB, but must still be measured with the complete Meeting stack.
- Quality parity is not assumed: the exact frozen quality gate is rerun after enabling cache.

### Attention backend — use native SDPA, not external FlashAttention2

Do **not** add `flash-attn` as a Windows dependency. Upstream FlashAttention states that Windows compilation still needs more testing and official Windows wheel support is not a stable release assumption.

Instead:

1. inspect the actual attention implementation selected by the compatible Transformers/PyTorch build;
2. if Qwen3 already uses SDPA, keep it — no experiment is needed;
3. only if it falls back to eager attention, test explicit `attn_implementation="sdpa"` as a separate one-variable change.

PyTorch SDPA can dispatch to optimized CUDA attention kernels automatically when supported. Do not enable reduced-precision SDPA reduction flags merely for speed.

### Static KV cache + torch.compile — deferred, not normal plan

Do not use full-context static cache on the RTX 3070. With beam 5, reserving the complete 32k context would be grossly disproportionate to the 8 GB target and is unnecessary for short/medium translation utterances.

`torch.compile` also introduces compile/warmup and shape-specialization complexity. It is deferred unless optimized eager PyTorch and the bounded CTranslate2 option below both fail a measured latency requirement. It is not part of the initial production migration.

### CTranslate2 BF16 — bounded fallback optimization only

CTranslate2 4.8.1 officially supports Qwen3 through `ctranslate2.Generator`, including beam search and prompt forwarding. TranslateIT already depends on CTranslate2 for ASR infrastructure, so this is a valid fallback execution backend **for the same LMT model**, not a second translation engine.

Evaluate it only if the PyTorch BF16 + dynamic-cache path still needs material improvement:

```text
convert the same pinned LMT revision
keep BF16 when target `get_supported_compute_types("cuda")` reports efficient BF16 support
beam_size=5
include_prompt_in_result=False
same tokenizer/chat prompt
same frozen quality suite
```

RTX 3070-class compute capability 8.6 supports BF16 and FP16 Tensor Core inputs, but runtime support is still checked on the actual target. Never force `CT2_CUDA_ALLOW_BF16`; that flag explicitly permits BF16 even when the device/runtime considers it inefficient.

If CTranslate2 BF16 is both quality-safe and materially faster / lower-memory, it may become the single production execution backend. Otherwise keep the simpler PyTorch path.

### Explicitly rejected initial optimizations

```text
NO external FlashAttention2 Windows dependency
NO static full-context KV cache
NO torch.compile in the first optimization round
NO beam 5 → beam 1 quality tradeoff
NO INT8 / INT4 before BF16 paths are exhausted
NO speculative decoding / draft model
NO second translation model
NO throughput batching that intentionally delays one Meeting utterance
NO arbitrary environment-variable tuning
```

FP16 or int8_float16 may be opened only if BF16 paths cannot meet measured constraints, and each numeric-format change must rerun the full frozen quality gate.

## Quality Benchmark Contract To Freeze

Freeze all evaluation material **before candidate output is inspected**:

```text
1. known-failure regression set
2. pinned EN/ID external reference pillar
3. 72-example semantic stress set
   (12 categories × 3 examples × 2 directions)
4. 48-example sealed unseen holdout
   (12 categories × 2 unseen variants × 2 directions)
5. semantic severity rubric
6. chrF++ / BLEU / COMET supporting metrics
7. factual diagnostics for names/numbers/dates/versions/IP/URL
8. blind naturalness review after semantic safety passes
9. exact target latency / VRAM measurement procedure
```

Required semantic categories include negation/modality, conditionals, logical scope, tense/aspect, quantifiers, comparison/ordering, reference/coreference, voice, questions/commands, multi-clause coordination, conversational/code-switching, and cross-sentence discourse.

Promotion gate:

```text
sealed CRITICAL semantic errors = 0
no incomplete/truncated result promoted
fewer MAJOR semantic errors than M2M100 in BOTH directions
no repeated category-level semantic regression
no material external-metric regression in either direction
naturalness favors or clearly matches LMT after semantic safety
```

Metrics never override a demonstrated critical semantic error.

## Latency / VRAM Measurement Contract

For every quality-surviving profile, use a fresh process so allocator/cache state from another implementation cannot contaminate the comparison.

Measure:

```text
cold model load
5 unmeasured warmups per input class
30 measured warm runs per input class
short / medium / long finalized-utterance classes
Standalone long-text case
p50 / p90 / max wall latency
prompt tokens / generated tokens
GPU VRAM steady loaded / peak
repeated-run memory stability
```

For PyTorch CUDA timing, synchronize CUDA around the measured inference interval so asynchronous GPU work is not undercounted. Reset peak-memory statistics before each measurement block and also capture whole-device VRAM separately from framework allocator statistics.

Use identical inputs, beam policy, prompt policy, and run counts across profiles. Do not compare a cold run against a warm run.

After the canonical translation runtime is selected, separately measure the real Meeting pipeline from finalized utterance end to first translated audio playback with ASR + the SAME LMT + approved My Voice loaded together.

## Approved Execution Sequence

### Phase 0 — Audit / plan freeze

`DONE`

### Phase 1 — Freeze benchmark contract

`NEXT — ONLY ACTIVE STEP`

Freeze regression, external/reference data + revision/provenance, 72 semantic stress cases, 48 sealed holdout cases, scoring rubric, and exact latency/VRAM procedure. Review the frozen contract before running LMT.

### Phase 2 — Isolated LMT reference compatibility proof

After Phase 1:

```text
acquire pinned LMT into evaluation cache only
use isolated Transformers 4.x environment (start from the model's 4.51.3-era compatibility boundary)
prove tokenizer/chat template/CausalLM on CUDA BF16
prove prompt-aware token budget / continuation slicing / EOS accounting
record actual selected attention backend
measure reference quality / cold load / first warm VRAM
```

No production manifest or `uv.lock` change.

### Phase 3 — Sequential M2M baseline vs LMT reference

```text
M2M100 process → benchmark → terminate
LMT reference process → benchmark → terminate
```

If LMT has any sealed CRITICAL error: **STOP**. No phrase patch.

### Phase 4 — Stable acceleration decision

Only after LMT reference passes quality:

```text
A. same PyTorch BF16 + dynamic KV cache
   → full frozen quality + latency/VRAM rerun

B. only if attention was eager:
   explicit native SDPA
   → rerun

If A/B meet target evidence:
   STOP optimization and choose the simplest passing profile.

Only if still materially too slow / memory-heavy:
   C. same LMT through CTranslate2 BF16
      → beam 5 / include_prompt_in_result=False
      → full quality + latency/VRAM rerun
```

Do not test torch.compile, static cache, FP16, or quantization unless all simpler BF16 paths fail a measured requirement and a new bounded plan is approved.

### Phase 5 — Envelope decision

On the winning LMT execution profile, compare whole-paragraph vs current semantic segmentation on context-sensitive cases. Keep only the simpler safe strategy.

### Phase 6 — Atomic one-engine production migration

One logical migration must replace M2M production ownership with the proven LMT profile across:

```text
model_manifest.json / acquisition contract
realtime_local_worker.py
translation_envelope.py only as proven necessary
tests
minimum compatible Transformers 4.x dependency update
readiness/diagnostics/docs
```

M2M100 must not remain in production manifest, fallback logic, release inventory, or modes after migration.

### Phase 7 — Target Windows Standalone acceptance

Acquire only the new canonical LMT asset, run focused source tests, launch Tauri, confirm CUDA, then repeat Text 2A / 2B / 2C both directions. Stop at first correctness failure.

### Phase 8 — Combined Meeting runtime proof

Preload/warm ASR + the SAME LMT + approved My Voice, then verify combined 8 GB VRAM stability, outbound ID→EN, incoming EN→ID, translation latency, and finalized-utterance-end → first-playback latency.

### Phase 9 — Resume product acceptance

Only after translation and combined-runtime proof pass: Mic Test → VoiceLab → Meeting → lifecycle → real meeting-app reception. Installer remains deferred until the canonical runtime is stable.

## Stop Conditions

Stop and return to diagnosis if:

```text
benchmark/holdout provenance is not trustworthy
LMT produces a sealed CRITICAL semantic error
compatible Transformers 4.x breaks canonical ASR/VoiceLab without bounded resolution
dynamic KV cache causes correctness regression / OOM / unstable memory
optimized profile does not materially improve latency or memory
combined Meeting stack OOMs or grows memory unstably
a proposed fix needs phrase-specific correction or a second translation model
```

## Next Step

**PHASE 1 ONLY: freeze and critically review the Translation Quality Benchmark contract and exact measurement procedure before any LMT download, dependency change, cache/attention experiment, model integration, or production source modification. Preserve this file as the continuation owner if the chat/session ends.**

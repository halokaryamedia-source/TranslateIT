# TranslateIT — Next Action

## Current Status

`TRANSLATION QUALITY PLAN FINALIZED / SINGLE LMT RUNTIME CONFIG FROZEN / BENCHMARK CONTRACT FREEZE NEXT / NO PRODUCTION SWITCH YET / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, advance to microphone / VoiceLab / Meeting acceptance, or resume installer work until the benchmark contract is frozen and the approved LMT replacement path passes target-Windows quality, latency, and memory gates.

Durable decisions: D-025, D-026, and D-027 in `docs/knowledge/decision-log.md`.

## Non-Negotiable Final Architecture

TranslateIT normal product operation has exactly **one canonical translation model and one runtime configuration**.

If the migration passes:

```text
Standalone Text           ID ↔ EN
Meeting outbound          ID → EN
Optional Meeting incoming EN → ID
            │
            └──── ONE LMT-60-1.7B translator
```

ASR and GPT-SoVITS remain separate speech stages and are not translation engines.

M2M100 may exist only as the current pre-migration baseline and as a sequential evaluation reference. It must not survive the accepted migration as fallback, router member, alternate mode, secondary provider, or release asset.

There are **no user-facing translation profiles** and no internal production profile menu. If the single approved LMT runtime cannot satisfy quality, latency, or VRAM on the target PC, **STOP and reassess the model/runtime decision** rather than accumulating a second execution profile.

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
```

The candidate must not enter production `model_manifest.json`, RuntimeAssets, or the canonical worker before D-025 passes.

## Single Approved LMT Runtime Configuration

This is the only LMT execution configuration to implement and validate:

```text
backend               PyTorch / Transformers 4.x
execution             CUDA on target RTX 3070
model dtype           BF16
model                  AutoModelForCausalLM
prompt                 upstream LMT translation prompt + chat template
generation             num_beams=5, do_sample=False
cache                  use_cache=True / DynamicCache
attention              native PyTorch SDPA
lifecycle              model remains resident after preload
inference state        model.eval() + torch.inference_mode()
```

### Why this one configuration

- It keeps the selected LMT weights, BF16 precision, official translation prompt, and beam-5 policy intact.
- Qwen3 supports cached `past_key_values`; with `use_cache=True`, Transformers uses cache state to avoid repeated key/value recomputation during autoregressive decoding.
- Dynamic cache grows with actual sequence length instead of reserving the full 32k context, which is materially safer for an 8 GB GPU.
- Native PyTorch SDPA provides optimized CUDA attention dispatch without adding an external Windows-specific attention package.
- The model stays loaded so normal Text/Meeting utterances do not repeatedly pay model-load cost.
- This keeps the runtime debuggable: one model, one backend, one numeric format, one generation policy.

Quality parity is **not assumed** merely because cache/SDPA are computational optimizations. The exact frozen quality gate evaluates this final configuration directly.

## Explicitly Rejected Runtime Alternatives

These are not active fallback profiles and are not part of the implementation plan:

```text
NO CTranslate2 translation backend
NO external FlashAttention2 dependency
NO torch.compile path
NO static full-context KV cache
NO beam 5 → beam 1 speed mode
NO FP16 alternate profile
NO INT8 / INT4 quantized profile
NO speculative decoding / draft model
NO second translation model
NO user-facing Realtime / Quality selector
NO throughput batching that intentionally delays one Meeting utterance
NO arbitrary CUDA environment-variable tuning
```

If the single approved configuration cannot meet the measured target, stop and reopen the decision with evidence. Do not silently add one of the alternatives above.

## Pre-Development Technical Audit

### 1. LMT is not an M2M model-path swap

Current M2M100 is encoder-decoder (`AutoModelForSeq2SeqLM`, target language ID / forced BOS). LMT is a causal LM (`AutoModelForCausalLM`) using an explicit translation prompt, chat template, autoregressive continuation, and continuation-only decode.

Migration therefore requires one bounded translation-adapter replacement, not compatibility glue and not a second engine.

### 2. Prompt-aware input accounting is required

LMT context consumption includes the rendered translation/chat prompt. Safe input acceptance must enforce:

```text
prompt tokens + source tokens + bounded generated tokens <= model context
```

No tokenizer truncation and no incomplete output promoted as complete.

### 3. Causal completion accounting must use continuation tokens only

The worker must record prompt length, slice generated continuation before decode, and evaluate EOS / generation budget against continuation tokens rather than the prompt+continuation sequence.

### 4. Dependency compatibility is a gate

Current WorkerRuntime caps Transformers at 4.50.0 while Qwen3 support is in the 4.51-series and later. First prove the pinned LMT revision in an isolated Transformers 4.x environment, then choose the minimum compatible 4.x update that also preserves current Faster-Whisper and GPT-SoVITS/VoiceLab imports/contracts. Do not jump to Transformers v5 without evidence.

### 5. Existing Text / Meeting ownership is already correct

Current Meeting outbound and optional incoming both call the canonical worker `translate` command. Preserve that owner. Do not create a voice translator, second worker, or model router.

### 6. Standalone envelope remains an implementation decision, not a user mode

Current sentence segmentation was introduced to repair M2M omissions. During LMT acceptance, use context-sensitive evidence to select the **single safest envelope behavior**. Prefer whole-paragraph/natural-unit translation if it remains complete and semantically correct; retain semantic-unit splitting only if LMT evidence proves it necessary. The final product exposes no segmentation mode.

## Quality Benchmark Contract To Freeze

Freeze all evaluation material **before LMT output is inspected**:

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

Compare only the current M2M100 baseline against the **single approved LMT runtime configuration**. This is model replacement evidence, not a profile competition.

For each model use a fresh process and identical source inputs:

```text
cold model load
5 unmeasured warmups per input class
30 measured warm runs per input class
short / medium / long finalized-utterance classes
Standalone long-text case
p50 / p90 / max wall latency
prompt/source tokens / generated tokens as applicable
GPU VRAM steady loaded / peak
repeated-run memory stability
```

For PyTorch CUDA timing, synchronize CUDA around the measured inference interval so asynchronous GPU work is not undercounted. Reset peak-memory statistics before each measurement block and also capture whole-device VRAM separately from framework allocator statistics.

After the canonical LMT runtime passes Standalone acceptance, separately measure the real Meeting pipeline with ASR + the SAME LMT + approved My Voice loaded together, including finalized-utterance-end → first translated audio playback latency.

## Approved Execution Sequence

### Phase 0 — Audit / plan freeze

`DONE`

### Phase 1 — Freeze benchmark contract

`NEXT — ONLY ACTIVE STEP`

Freeze regression data, external/reference data + revision/provenance, 72 semantic stress cases, 48 sealed holdout cases, scoring rubric, and exact latency/VRAM procedure. Critically review the frozen contract before running LMT.

### Phase 2 — Isolated single-config LMT compatibility proof

After Phase 1:

```text
acquire pinned LMT into evaluation cache only
use isolated compatible Transformers 4.x environment
load LMT on CUDA BF16
use DynamicCache + native SDPA
use official prompt/chat template + beam 5
prove prompt-aware token budget / continuation slicing / EOS accounting
record cold load / warm latency / VRAM
```

No production manifest or `uv.lock` change.

### Phase 3 — Sequential M2M baseline vs single LMT configuration

```text
M2M100 process → frozen benchmark → terminate
LMT process    → same frozen benchmark → terminate
```

If LMT has any sealed CRITICAL error, unacceptable latency, or unstable/OOM memory: **STOP**. Do not patch the phrase and do not introduce another runtime profile automatically.

### Phase 4 — Final envelope decision

On the passing LMT configuration, use the context-sensitive benchmark subset to select one final Standalone envelope behavior. No user-facing or runtime-selectable envelope mode is created.

### Phase 5 — Atomic one-engine production migration

One logical migration replaces M2M production ownership with the proven LMT configuration across:

```text
model_manifest.json / acquisition contract
realtime_local_worker.py
translation_envelope.py only as proven necessary
tests
minimum compatible Transformers 4.x dependency update
readiness/diagnostics/docs
```

M2M100 must not remain in production manifest, fallback logic, release inventory, or modes after migration.

### Phase 6 — Target Windows Standalone acceptance

Acquire only the new canonical LMT asset, run focused source tests, launch Tauri, confirm CUDA, then repeat Text 2A / 2B / 2C both directions. Stop at first correctness failure.

### Phase 7 — Combined Meeting runtime proof

Preload/warm ASR + the SAME LMT + approved My Voice, then verify combined 8 GB VRAM stability, outbound ID→EN, incoming EN→ID, translation latency, and finalized-utterance-end → first-playback latency.

### Phase 8 — Resume product acceptance

Only after translation and combined-runtime proof pass: Mic Test → VoiceLab → Meeting → lifecycle → real meeting-app reception. Installer remains deferred until the canonical runtime is stable.

## Stop Conditions

Stop and return to diagnosis if:

```text
benchmark/holdout provenance is not trustworthy
LMT produces a sealed CRITICAL semantic error
compatible Transformers 4.x breaks canonical ASR/VoiceLab without bounded resolution
single LMT runtime OOMs / grows memory unstably
single LMT runtime latency is not practical on target PC
dynamic cache or SDPA causes a correctness regression
a proposed fix needs phrase-specific correction, second translation model, or alternate production profile
```

## Next Step

**PHASE 1 ONLY: freeze and critically review the Translation Quality Benchmark contract and exact measurement procedure before any LMT download, dependency change, model integration, or production source modification. Preserve this file as the continuation owner if the chat/session ends.**

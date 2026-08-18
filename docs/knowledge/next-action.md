# TranslateIT — Next Action

## Current Status

`TRANSLATION QUALITY PLAN FINALIZED / D-025 QUALITY GATE CONTROLS / D-026 LMT-60-1.7B APPROVED REPLACEMENT TARGET / BENCHMARK CONTRACT FREEZE NEXT / NO PRODUCTION SWITCH YET / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Target checkout:

```text
D:\Work\AI Stuff\TranslateIT
```

Do **not** modify the production translator, advance to microphone / VoiceLab / Meeting acceptance, or resume installer work until the translation benchmark contract is frozen and the approved replacement path has passed the required target-Windows gates.

## Non-Negotiable Final Architecture

TranslateIT has exactly **one canonical translation model** in normal product operation.

If the approved replacement passes its gates:

```text
ASR / final transcript
        ↓
ONE canonical LMT-60-1.7B translator
        ↓
translated text
        ↓
Text UI OR approved My Voice / Meeting output
```

The same translator must serve:

```text
Standalone Text          ID ↔ EN
Meeting outbound         ID → EN
Optional Meeting incoming EN → ID
```

ASR and GPT-SoVITS remain separate speech stages; they are not translation engines.

M2M100 may exist only as the **current baseline before migration** and as a sequential evaluation reference. It must not survive the accepted production migration as fallback, router member, secondary provider, alternate mode, or release asset. After the LMT migration is accepted, M2M100 is retired from the product path and stale target model bytes may be cleaned only after LMT acquisition/runtime validation succeeds.

Durable decisions: D-025 and D-026 in `docs/knowledge/decision-log.md`.

## Target Windows Evidence

```text
GPU       NVIDIA GeForce RTX 3070
Driver    610.62
VRAM      8192 MiB
Python    3.12.10
AI path   CUDA
```

Current translation acceptance boundary:

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

This changes prohibition into approximately `does not have to / is not required to`; therefore it is a semantic correctness failure, not a grammar-only/naturalness finding.

## Approved Replacement Target

```text
repo       NiuTrans/LMT-60-1.7B
revision   2ff175e2a450d2f2458b33234bfb74953468b3a2
license    Apache-2.0
family     Qwen3 causal LM, translation-specialized
languages  Indonesian and English supported
weights    model.safetensors ≈ 4.06 GB, BF16
reference  deterministic generation, num_beams=5, do_sample=False
```

The pinned revision is the reviewed `grpo version` model-content commit. The later current-main commit is README-only and is not required to make evaluation depend on moving `main`.

This target is approved for evaluation and intended canonical replacement, but **must not enter `model_manifest.json`, RuntimeAssets, or the production worker before the D-025 quality/performance gate passes.**

## Pre-Development Audit — Critical Findings

### A. This is not a model-path swap

Current M2M100 worker code is encoder-decoder shaped:

```text
AutoModelForSeq2SeqLM
source-language tokenizer state
get_lang_id(target)
forced_bos_token_id
sequence decoded directly
```

Official LMT inference is causal-LM shaped:

```text
AutoModelForCausalLM
explicit English-language translation prompt
apply_chat_template(... add_generation_prompt=True)
model.generate(... num_beams=5, do_sample=False)
decode generated continuation only
```

Production migration therefore requires one bounded translation-adapter change; pretending LMT is API-compatible with M2M100 would be incorrect.

### B. Prompt-aware context accounting is required

Current `translation_envelope.py` measures raw source-text tokens. LMT consumes a rendered translation prompt + chat-template tokens before source content and also needs output-token headroom. The accepted implementation must enforce:

```text
rendered_prompt_tokens + requested_generation_budget <= model context envelope
```

No silent truncation is allowed. Current 2000-character product boundary remains unchanged unless independent evidence later justifies changing product capacity.

### C. Causal completion accounting must exclude prompt tokens

Current non-encoder-decoder accounting is not sufficient for LMT because a causal generated sequence includes the prompt. The migrated worker must:

```text
record prompt length
slice continuation before decode
count generation ceiling against continuation only
verify completion/EOS on generated continuation semantics
```

Do not weaken the existing complete-output-or-explicit-failure contract merely to accommodate the new architecture.

### D. Dependency compatibility is a real gate

Current WorkerRuntime pins:

```text
transformers >=4.44.0, <=4.50.0
```

The reviewed LMT revision declares Qwen3 and `transformers_version: 4.57.3`; Qwen3 support exists in Transformers 4.51-series and later. Therefore the production dependency graph cannot be changed blindly.

First prove LMT in an **isolated evaluation environment** with a justified Transformers 4.x version compatible with the pinned revision. Before changing the production `uv.lock`, verify that the same candidate dependency set does not break current Faster-Whisper / ASR imports, GPT-SoVITS / VoiceLab imports, worker startup, or deterministic source tests. Do not jump to Transformers v5 without necessity.

### E. The existing shared Text/Meeting translation owner is correct and must remain

Current Rust Meeting flow already sends both outbound and incoming work through the same worker `translate` command used by the canonical local worker. Preserve that ownership; do not create a voice-specific translator or a second worker.

Current Meeting outbound remains:

```text
final Indonesian transcript
→ translate ID→EN
→ approved My Voice synthesis
```

Optional incoming remains:

```text
final English transcript
→ translate EN→ID
```

### F. Meeting generation budget must be measured, not guessed

Meeting currently supplies a bounded `max_new_tokens` hint. Do not increase it speculatively. Benchmark finalized-utterance length/completeness with LMT first, then let measured source/output distributions justify any bounded worker-owned adjustment.

### G. Segmentation is not automatically preserved

Current Standalone Text always uses semantic/sentence units because that repaired M2M100 omission behavior. LMT has a much larger context envelope and may benefit from whole-paragraph context.

After LMT reference quality passes, compare only two justified envelope strategies on context-sensitive material:

```text
A. whole paragraph / natural source unit
B. current semantic-unit segmentation
```

Prefer the simpler whole-paragraph path if completeness and semantic fidelity remain safe. Keep sentence segmentation only if evidence proves it is still necessary. Meeting remains one finalized utterance at a time unless Meeting-specific evidence proves otherwise.

### H. Raw BF16 quality comes before optimization

Do not start with quantization, CTranslate2, custom cache toggles, or decoder tuning. First measure the reviewed upstream/reference LMT behavior. The model config currently has `use_cache: false`; do not silently override that during the reference-quality round.

If quality passes but target performance requires improvement, allow only one bounded optimization stage at a time and rerun the exact same frozen quality gate.

### I. Combined Meeting memory is separate proof

A ~4.06 GB translation weight file fitting on disk or translation-only CUDA success does not prove the complete Meeting stack fits an 8 GB GPU. Before Meeting acceptance, measure the combined loaded state of:

```text
ASR + LMT + approved My Voice + runtime overhead
```

Reject OOM, unstable memory growth, or a runtime configuration that cannot sustain repeated finalized utterances.

### J. Production retirement must be atomic

When the migration is finally authorized, one logical production delivery must both add LMT and remove M2M100 production ownership. There must be no landed normal-runtime state containing two required translation models.

## Frozen Quality Evaluation Contract To Build

The benchmark contract is frozen **before candidate output is inspected**.

### 1. Known-failure regression set

Contains historical failures only, including omission, date/numeric corruption, technical-name corruption, URL/IP/version preservation, and the current modality failure. It answers “did an old defect return?” and is **not** the decisive model-ranking set.

### 2. External/reference pillar

Use the English/Indonesian FLORES+ `devtest` reference set as the standardized external pillar (1012 sentences per language in the current dataset release). Pin the exact dataset version/revision used for the run.

FLORES is public and LMT has already been reported on FLORES-family evaluation, so this score is supporting comparative evidence only; it is not the sealed product-acceptance holdout.

Report both directions with:

```text
chrF++  primary surface/reference metric
BLEU    secondary comparable metric
COMET   supplementary semantic metric
```

Metrics never override a demonstrated critical meaning error.

### 3. Product semantic stress set

Freeze 72 examples before candidate evaluation:

```text
12 semantic/linguistic categories
× 3 examples
× 2 directions
= 72
```

Required categories:

```text
negation + modality
conditionals
cause / contrast / logical scope
tense + aspect
quantifiers
comparison / ordering
pronoun + reference
active / passive voice
questions + commands
coordination / multi-clause meaning
conversational + Indonesian/English code-switch
cross-sentence / paragraph discourse
```

Names, money, dates, units, versions, acronyms, IPs and URLs are cross-cutting factual stressors rather than substitutes for semantic testing.

### 4. Sealed unseen holdout

Freeze a separate 48-example set:

```text
12 categories
× 2 unseen lexical/context variants
× 2 directions
= 48
```

The known `must not` sentence and other debugging fixtures do not belong here. Holdout text/reference/severity expectations are frozen before LMT output is seen and are not rewritten because a candidate fails.

### 5. Severity rubric

```text
CRITICAL
- reversed negation / modality / obligation
- key clause omitted or invented
- material factual relation reversed
- unsafe/incompatible meaning change

MAJOR
- substantial semantic distortion
- wrong reference / quantifier / tense that changes interpretation
- important information weakened or materially mistranslated

MINOR
- awkward but recoverable grammar
- unnatural lexical/register choice
- punctuation/style issue without meaning change
```

Promotion gate:

```text
sealed holdout CRITICAL errors = 0
no incomplete/truncated generation promoted as success
LMT has fewer MAJOR semantic errors than M2M100 in both directions
no repeated category-level semantic regression versus baseline
external reference metrics show no material direction-specific regression
blind naturalness review favors or clearly matches LMT after semantic safety passes
```

Exact wording equality is never the definition of translation correctness.

## Performance Measurement Contract

Do not invent a release SLA before target evidence; product requirement PR-052 says the final outbound latency threshold must be derived from target-PC evidence.

For every quality-surviving implementation record:

```text
cold model load time
translation-only warm latency: p50 / p90 / max
short / medium / long finalized-utterance classes
Standalone long-text latency
GPU VRAM before load / steady loaded / observed peak
repeated-run memory stability
```

Use the same inputs and run counts across implementations. First warm the model, then measure repeat runs; do not compare one cold run with one warm run.

After the canonical LMT runtime is selected, separately measure the real Meeting pipeline from finalized utterance end through translation and ultimately to first translated audio playback. That full-pipeline evidence sets the release latency threshold.

## Approved Execution Sequence

### Phase 0 — Audit / plan freeze

`DONE`

No production source changes. D-025/D-026 plus this `next-action.md` own the decision and active sequence.

### Phase 1 — Freeze benchmark contract

`NEXT — ONLY ACTIVE STEP`

Create/freeze the regression set, pinned external/reference set, 72-example semantic stress set, 48-example sealed holdout, scoring rubric, provenance/license notes, and exact latency/VRAM measurement procedure.

Do not download/integrate LMT or tune M2M100 before this freeze is complete.

### Phase 2 — Isolated LMT compatibility proof

After Phase 1 passes:

```text
pin LMT revision 2ff175e2a450d2f2458b33234bfb74953468b3a2
acquire candidate into evaluation cache, not RuntimeAssets production path
create isolated evaluation dependency environment
prove Qwen3 tokenizer/chat template/CausalLM generation on CUDA
prove continuation slicing + EOS/generation accounting
record cold load / first warm VRAM
```

No `model_manifest.json` or production `uv.lock` change yet.

### Phase 3 — Sequential baseline vs candidate evaluation

Never keep two production engines.

```text
run current M2M100 baseline
save outputs/metrics/timing
unload/terminate baseline evaluation process

run pinned LMT-60-1.7B reference behavior
save outputs/metrics/timing
unload/terminate candidate process
```

Evaluate regression, external/reference, semantic stress, sealed holdout, factual diagnostics, and blind naturalness under the same contract.

If LMT has any sealed critical semantic failure: **STOP**. Do not patch the phrase; reopen the model decision only with new evidence.

### Phase 4 — Envelope + performance decision

Only if LMT passes semantic quality:

1. compare whole-paragraph versus current semantic-unit segmentation on the context-sensitive subset;
2. choose the simplest envelope that preserves completeness and meaning;
3. measure target RTX 3070 latency/VRAM;
4. if raw/reference performance is already suitable, stop optimization;
5. only if measured need exists, evaluate one CTranslate2 FP16 path and rerun the full frozen quality gate;
6. only if memory still requires it, evaluate one `int8_float16` path and rerun the full gate.

No arbitrary beam/temperature/length-penalty sweep.

### Phase 5 — Atomic one-engine production migration

Only after Phases 1–4 pass.

One logical migration must cover the smallest complete owner set:

```text
model_manifest.json
- remove M2M100 translation entry
- add only pinned LMT-60-1.7B translation entry
- runtime allowlist for safetensors + tokenizer/chat-template/config assets

prepare_model_assets.py/tests
- preserve pinned atomic acquisition
- validate new LMT asset contract

realtime_local_worker.py
- one bidirectional loaded LMT runtime
- AutoModelForCausalLM / approved optimized runtime only
- official translation prompt + chat template
- direction names English / Indonesian
- prompt-aware input/context budgeting
- continuation-only decode
- causal EOS/completion accounting
- no M2M fallback/router

translation_envelope.py
- implement only the envelope strategy proven in Phase 4
- preserve paragraphs / complete-output-or-failure contract

tests
- one model reused for both directions
- prompt construction / continuation slicing
- prompt-aware context budget
- completion/EOS behavior
- no M2M-specific get_lang_id/forced-BOS assumptions
- no phrase-specific expected translations

pyproject.toml + uv.lock
- only the minimum justified Transformers 4.x compatibility change
- prove ASR + GPT-SoVITS/VoiceLab imports/contracts remain healthy

readiness / diagnostics / docs
- one LMT translation model identity
- Text + outbound Meeting + incoming Meeting all point to the same canonical worker model
```

M2M100 must not remain in production manifest, worker fallback logic, release inventory, or user-visible modes after this migration.

### Phase 6 — Target Windows Standalone acceptance

Fast-forward `Local`, acquire only the new canonical LMT asset, run focused source tests, start the Tauri app, confirm CUDA readiness, then repeat:

```text
2A ID → EN
2B EN → ID
2C long / multi-paragraph both directions
```

Stop at first correctness failure.

### Phase 7 — Combined Meeting runtime proof

Before resuming broader Meeting acceptance:

```text
preload/warm ASR
preload/warm the SAME LMT translator
preflight/warm approved My Voice
measure combined VRAM and stability
verify outbound ID→EN uses LMT
verify optional incoming EN→ID uses the SAME LMT
measure translation stage and real outbound pipeline latency
```

No second voice-specific translator is permitted.

### Phase 8 — Resume product acceptance

Only after Standalone translation and combined Meeting runtime proof pass:

```text
Microphone selection + Mic Test
VoiceLab guided recording / training / approval
Meeting Start
outbound translated voice
optional incoming text
stop/restart/minimize/long session
sleep/wake
real meeting-app microphone reception
```

Installer/package work remains deferred until the canonical runtime/model stack is stable.

## Explicit Non-Goals

```text
NO two translation engines in production
NO M2M100 fallback after accepted LMT migration
NO provider/model selector
NO phrase-specific grammar correction
NO Malay→Indonesian rewrite dictionary
NO date/number fixer
NO back-translation correction loop
NO cloud translation
NO LLM post-editor
NO arbitrary decoder sweep
NO ASR/TTS/audio/scheduler redesign as part of translation migration
NO release/package redesign before runtime stability
```

## Stop Conditions

Stop and return to diagnosis if any of the following occurs:

```text
benchmark/holdout provenance is not trustworthy
LMT produces a sealed CRITICAL semantic error
LMT dependency requirement breaks canonical ASR/VoiceLab without a bounded compatible pin
translation-only or combined Meeting runtime OOMs / grows memory unstably
one bounded performance optimization cannot preserve the frozen quality gate
a proposed fix requires a phrase-specific patch or a second production translator
```

## Next Step

**PHASE 1 ONLY: freeze the Translation Quality Benchmark contract and its inputs before any LMT download, dependency change, model integration, decoder change, or production source modification. Once the benchmark artifacts and scoring/provenance procedure are frozen, stop and review them critically before starting the isolated LMT compatibility/evaluation run.**

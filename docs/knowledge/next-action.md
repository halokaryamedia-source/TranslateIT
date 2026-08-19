# TranslateIT — Next Action

## Current Status

`TRANSLATION QUALITY BENCHMARK FROZEN / PHASE 1 COMPLETE / CRITICAL BENCHMARK REVIEW NEXT / NO LMT INFERENCE YET / NO PRODUCTION SWITCH / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / RTX 3070 8 GB / CUDA
```

Do **not** download/run LMT, change production dependencies, modify the canonical translator, advance Meeting/VoiceLab acceptance, or resume installer work until the frozen benchmark artifacts below have received one critical review.

Durable decisions remain D-025, D-026, and D-027 in `docs/knowledge/decision-log.md`.

## Frozen Phase 1 Artifacts

```text
tools/translation_quality/benchmark_contract.json
tools/translation_quality/benchmark_cases.json
```

The benchmark was frozen **before any LMT-60-1.7B output was inspected or generated**. Candidate failures must not be used to rewrite the current stress/holdout cases. A material change after candidate inference requires a new benchmark contract version and new unseen holdout material.

### Product set

```text
Historical regression       7 directional cases
Semantic stress            36 bilingual pairs
                           = 72 directional cases
Sealed holdout             24 distinct bilingual pairs
                           = 48 directional cases
Product semantic total     = 120 directional cases
```

Every one of the 12 semantic categories has exactly:

```text
3 stress pairs   → 6 directional cases
2 holdout pairs  → 4 directional cases
```

Categories:

```text
negation / modality
conditionals
cause / contrast / logical scope
tense / aspect
quantifiers
comparison / ordering
pronoun / reference
active / passive
questions / commands
coordination / multi-clause meaning
conversational / code-switching
cross-sentence discourse
```

Stress and holdout use separate bilingual pairs. Known failures such as `must not → tidak harus`, historical Marian omission/date/numeric defects, and technical literal failures exist only in the regression set, not the sealed holdout.

The set also contains quoted instruction-like source text so the causal LMT prompt path must translate user content rather than follow content as a new instruction.

## External Reference Pillar

Frozen external source:

```text
dataset       openlanguagedata/flores_plus
version       4.6
split         devtest
English       eng_Latn
Indonesian    ind_Latn
rows          1012 per language
license       CC-BY-SA-4.0
```

FLORES+ text is **not committed to this repository**. The dataset is gated and asks users to protect evaluation integrity. Before first inference, acquire it locally after accepting its terms, resolve the exact Hugging Face dataset commit SHA, verify that the dataset card still declares version 4.6, and verify both configs contain 1012 aligned devtest rows. Any mismatch = STOP.

FLORES+ is supporting standardized evidence, not the sealed product holdout, because it is public and the LMT family has already published FLORES-family evaluation results.

## Frozen Evaluation Metrics

```text
Primary external metric
→ SacreBLEU 2.6.0 chrF++ / word_order=2

Secondary external metric
→ SacreBLEU 2.6.0 BLEU / tokenizer=13a

Supplementary semantic metric
→ unbabel-comet 2.2.7
→ Unbabel/wmt22-comet-da
→ revision 2760a223ac957f30acfb18c8aa649b01cf1d75f2
```

Record SacreBLEU signatures. Use paired bootstrap or paired approximate-randomization support for baseline-vs-candidate comparison. COMET is supporting evidence only and never overrides a demonstrated human-reviewed critical semantic error.

COMET runs in an isolated evaluation process after translation model processes terminate so the evaluator does not contaminate translation VRAM/latency measurements.

## Frozen Semantic Severity Gate

### Critical

Examples include:

```text
negation / prohibition / obligation reversed or materially weakened
key clause omitted or invented
material factual relation reversed
protected critical literal changed so meaning changes
incomplete output promoted as complete
instruction-like source followed rather than translated
```

### Major

Substantial meaning distortion, including wrong reference/coreference, quantifier, tense/aspect, comparison, agent/patient role, or logical scope.

### Minor

Awkward grammar, unnatural lexical/register choice, or punctuation/style issue without material meaning change.

Promotion gate:

```text
sealed holdout CRITICAL errors = 0
no incomplete/truncated success
per direction: LMT major-or-worse <= M2M100
combined: LMT major-or-worse must be lower unless both are zero
no category with an LMT critical error
no category-level major regression averaged away
no statistically supported direction-specific chrF++ regression
blind naturalness must not favor M2M100 by majority in either direction
```

Exact reference-string equality is not translation correctness.

## Frozen Latency / VRAM Procedure

Comparison is only:

```text
current M2M100 baseline
vs
single approved LMT-60-1.7B runtime configuration
```

There is no profile competition.

For each model:

```text
fresh process
cold model-load measurement
short / medium / long fixed cases
5 unmeasured warmups per case
30 measured warm runs per case
p50 / p90 / max wall latency
CUDA synchronize immediately before + after timed inference
record prompt/source/generated token counts
record whole-device VRAM before load / steady / observed peak
reset framework peak-memory stats per measurement block
repeat short/medium/long cycles and reject unstable memory growth
```

A controlled three-paragraph long-text pair is frozen in `benchmark_contract.json` for Standalone testing.

Translation-only timing is not the release Meeting latency metric. After a canonical LMT migration, the product separately measures finalized-utterance end → first translated audio playback with ASR + the SAME LMT + approved My Voice loaded together.

## Single Approved Candidate Runtime

If evaluation proceeds, D-027 remains the only candidate execution shape:

```text
NiuTrans/LMT-60-1.7B
revision 2ff175e2a450d2f2458b33234bfb74953468b3a2
PyTorch / compatible Transformers 4.x
CUDA / RTX 3070
BF16
AutoModelForCausalLM
official LMT prompt + chat template
num_beams=5
do_sample=False
DynamicCache / use_cache=True
native PyTorch SDPA
resident model
model.eval() + torch.inference_mode()
```

No CTranslate2 translation backend, external FlashAttention2, `torch.compile`, static full-context cache, FP16/INT8 profile, beam-1 speed mode, speculative decoding, second translator, or user-facing quality/speed mode is active.

## Production Boundary

M2M100 remains the current production translator only until LMT is proven. Evaluation later runs the two models **sequentially in separate processes**; this is not a dual-engine product architecture.

If LMT eventually passes all gates, one atomic production migration replaces M2M100 ownership. M2M100 must not remain as fallback/router member/release model afterward.

No production source, model manifest, RuntimeAssets, `pyproject.toml`, `uv.lock`, Tauri, ASR, TTS, Meeting, or installer code changed during Phase 1.

## Next Step

**Critically audit the two frozen benchmark artifacts for semantic coverage, Indonesian/English reference quality, hidden leakage/overlap, severity correctness, metric/provenance validity, and measurement fairness. Do not run or download LMT during that review. If the frozen contract survives the audit without a material defect, STOP and then advance separately to the isolated LMT compatibility proof.**

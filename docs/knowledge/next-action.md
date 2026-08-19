# TranslateIT — Next Action

## Current Status

`TRANSLATION BENCHMARK CRITICAL REVIEW COMPLETE / FINAL PRE-INFERENCE LOCK / PHASE 2 ISOLATED LMT COMPATIBILITY NEXT / NO LMT OUTPUT GENERATED YET / NO PRODUCTION SWITCH / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, production `model_manifest.json`, production `uv.lock`, Meeting/VoiceLab behavior, or installer during the next step.

Durable decisions remain D-025, D-026, and D-027 in `docs/knowledge/decision-log.md`.

## Final Translation Direction

Normal product operation must have exactly one canonical translation model and one runtime configuration:

```text
Standalone Text           ID ↔ EN
Meeting outbound          ID → EN
Optional Meeting incoming EN → ID
            │
            └──── ONE NiuTrans/LMT-60-1.7B translator
```

Approved candidate:

```text
repo       NiuTrans/LMT-60-1.7B
revision   2ff175e2a450d2f2458b33234bfb74953468b3a2
license    Apache-2.0
family     Qwen3 causal LM, translation-specialized
weights    ~4.06 GB BF16
```

Single approved runtime configuration:

```text
PyTorch / compatible Transformers 4.x
CUDA on RTX 3070
BF16
AutoModelForCausalLM
upstream LMT translation prompt + chat template
num_beams=5
do_sample=False
use_cache=True / DynamicCache
native PyTorch SDPA
resident model after preload
model.eval()
torch.inference_mode()
```

No CTranslate2 translation profile, FlashAttention2 dependency, `torch.compile`, static full-context cache, FP16/INT8/INT4 alternate profile, beam-reduced mode, speculative decoding, second translator, or user-facing translation mode is approved. If the single configuration fails quality, latency, or stable VRAM, STOP and reassess rather than adding profiles.

M2M100 remains only the current pre-migration baseline and sequential benchmark reference. If LMT is accepted, M2M100 is retired from the production manifest/runtime/release path rather than retained as fallback.

## Current Blocking Evidence

M2M100 target acceptance remains:

```text
STEP 1    application / worker startup              PASS
STEP 2A   ID → EN representative Text               PASS correctness / quality findings
STEP 2B   EN → ID representative Text               PASS correctness / quality findings
STEP 2C-A long multi-paragraph ID → EN              PASS correctness / quality findings
STEP 2C-B long multi-paragraph EN → ID              FAIL semantic correctness
```

Known critical example:

```text
must not
→ tidak harus
```

This weakens prohibition into lack of obligation.

## Final Frozen Benchmark

Canonical artifacts:

```text
tools/translation_quality/benchmark_cases.json
Git blob: e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob: 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

The critical review and all corrections were completed **before any LMT inference/output was generated**. From the first LMT output onward these stress/holdout sources, references, semantic requirements, counts, and promotion rules are immutable. Any later material benchmark change invalidates the comparison and requires a new contract version plus new unseen holdout material.

Final product evaluation:

```text
historical regression        7 directional cases

semantic stress             36 bilingual pairs
                            = 72 directional cases

sealed holdout              24 distinct bilingual pairs
                            = 48 directional cases

product semantic total      = 120 directional cases
```

Every semantic category has:

```text
3 stress pairs
2 separate holdout pairs
both directions evaluated
```

Categories:

```text
negation / modality
conditionals
cause / contrast / logical scope
tense / aspect
quantifiers
comparison / ordering
pronoun / demonstrative / reference
active / passive roles
questions / commands
coordination / multi-clause meaning
conversational / technical code-switching
cross-sentence discourse
```

## Critical Review Findings Already Corrected

The pre-inference review found and fixed material benchmark defects rather than accepting the first draft:

1. **Holdout modality diversity** — a holdout prohibition that still used the already-known `must not` surface form was replaced by `is prohibited from` / `dilarang`, reducing the chance that a phrase-specific correction could masquerade as general quality.
2. **Ambiguous coreference** — ambiguous `it` holdout cases were replaced with references whose antecedents are semantically explicit enough to score reliably.
3. **Reference modal strength** — references that strengthened English `should` into Indonesian `harus`, or weakened it into permission, were corrected to preserve modality.
4. **Reference role leakage** — an Indonesian reference that added a possessive relation between manager/assistant was corrected.
5. **Natural conversational reference** — one holdout code-switch reference was normalized to natural Indonesian without changing its required meaning.
6. **Regression severity consistency** — date corruption is classified as critical when it materially changes a protected fact.
7. **Holdout isolation from performance tuning** — translation latency cases now use stress/dedicated inputs only; sealed holdout is not used to choose/tune runtime behavior.
8. **Metric authority corrected** — chrF++/BLEU/COMET remain supporting evidence. A statistically supported external-score regression triggers review but does not automatically overrule semantic holdout judgment.
9. **Reproducible case identity** — directional case-ID format and the exact benchmark case Git blob are now part of the contract.
10. **Review scope fixed** — semantic review covers all 120 product directional cases; blind naturalness uses all 48 sealed-holdout directional cases after semantic safety passes.

Stress↔holdout exact pair overlap was reviewed and is disallowed by contract. The final holdout remains lexical/context material distinct from the 36 stress pairs.

## External Reference / Metric Validation

FLORES+ remains a supporting standardized pillar, not the sealed acceptance set:

```text
dataset     openlanguagedata/flores_plus
version     4.6
configs     eng_Latn / ind_Latn
split       devtest
rows        1012 per language
license     CC-BY-SA-4.0
access      gated to protect evaluation integrity
```

Do not commit FLORES+ sentence text. Before the first model inference, resolve and record the exact accepted Hugging Face dataset commit SHA and verify both configs expose 1012 aligned devtest rows.

External metrics are fixed as:

```text
SacreBLEU 2.6.0
- chrF++ / word_order=2 / mixed case / signature required
- BLEU / 13a / mixed case / signature required
- paired bootstrap: 1000 resamples, fixed seed 12345

unbabel-comet 2.2.7
- Unbabel/wmt22-comet-da
- revision 2760a223ac957f30acfb18c8aa649b01cf1d75f2
- supplementary/non-blocking
```

Human semantic severity remains the primary product correctness gate:

```text
CRITICAL  meaning reversal/weakening, key clause omission/invention,
          critical fact corruption, incomplete output promoted,
          instruction-like source followed instead of translated

MAJOR     interpretation-changing reference/quantifier/tense/scope/role error

MINOR     awkward but understandable grammar/register/style
```

Promotion requires:

```text
sealed holdout CRITICAL = 0
no incomplete output promoted
LMT major-or-worse count <= M2M100 in each direction
LMT combined major-or-worse strictly lower unless both are zero
no category with an LMT critical error
blind holdout naturalness does not lose majority in either direction
```

## Frozen Performance Procedure

Compare only:

```text
current M2M100 baseline
vs
single approved LMT runtime
```

Sequential fresh processes only.

For translation-only timing:

```text
short / medium / long stress cases
5 warmups per case
30 measured warm runs per case
CUDA synchronize immediately before/after measured inference
report p50 / p90 / max
report source/prompt/generated tokens
record whole-device VRAM before load / steady / peak
reset framework peak-memory stats per block
repeat cycles to detect unstable growth
```

A separate dedicated multi-paragraph case measures Standalone Text behavior.

Translation-only latency is **not** Meeting release latency. After canonical migration, combined ASR + SAME LMT + approved My Voice must be measured from finalized utterance end to first translated audio playback.

## Execution Sequence

```text
Phase 0  architecture/model/runtime audit                    DONE
Phase 1  benchmark creation                                 DONE
Phase 1R critical pre-inference benchmark review            DONE
Phase 2  isolated single-config LMT compatibility proof     NEXT
Phase 3  sequential M2M100 vs LMT frozen benchmark
Phase 4  one final Standalone envelope decision
Phase 5  atomic one-engine M2M100 → LMT production migration
Phase 6  target Windows Text 2A / 2B / 2C acceptance
Phase 7  combined ASR + SAME LMT + My Voice proof
Phase 8  resume Mic / VoiceLab / Meeting acceptance
```

Installer remains deferred until the canonical runtime stack is stable.

## Stop Conditions

Stop and return to diagnosis if:

```text
FLORES+ exact accepted revision/config/alignment cannot be verified
pinned LMT cannot load in an isolated compatible Transformers 4.x environment
single LMT configuration cannot run correctly on target CUDA/BF16
prompt/context accounting or continuation/EOS completion cannot be proven
LMT produces a sealed critical semantic error
single LMT runtime is impractically slow or unstable/OOM on target RTX 3070
a proposed fix requires phrase-specific rewriting, a second translator, or alternate production profile
```

## Next Step

**PHASE 2 ONLY: on the target Windows PC, resolve/pin the exact accepted FLORES+ 4.6 snapshot first, then acquire `NiuTrans/LMT-60-1.7B@2ff175e2a450d2f2458b33234bfb74953468b3a2` into an evaluation cache (not RuntimeAssets), create an isolated compatible Transformers 4.x evaluation environment, and prove the one approved CUDA/BF16/DynamicCache/SDPA inference contract: tokenizer/chat prompt, prompt-aware context accounting, continuation-only decode, EOS/completion handling, cold load, first warm latency, and VRAM. Do not change production manifest, worker, or lockfile. Stop after this compatibility proof and record the evidence before running the full benchmark.**

# TranslateIT — Next Action

## Current Status

`ROUND 1 LMT REJECTED / ROUND 2 M2M100-1.2B REJECTED AND LOCAL MODEL BYTES CLEANED / TRANSLATEGEMMA 4B LLM.INT8 PRESCREEN TOOLING READY / TARGET-WINDOWS RUN NEXT / PRODUCTION M2M100-418M UNCHANGED / FROZEN D-025 BENCHMARK UNCHANGED / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, production `model_manifest.json`, production `uv.lock`, Meeting/VoiceLab behavior, or installer during candidate evaluation.

## Durable Translation Constraints

D-025–D-027 remain controlling:

- meaning/correctness outranks latency and metric cosmetics;
- no phrase-specific patch, dictionary repair, prompt patch derived from failed fixtures, or output rewriting;
- at most two serious challengers per evaluation round;
- an accepted translator replaces the canonical model rather than becoming a router/fallback;
- target-Windows evidence is required before production adoption;
- the frozen D-025 benchmark remains the only promotion evidence.

Production remains:

```text
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
```

## Rejected Candidates

### Round 1 — LMT-60-1.7B

Rejected after the target Phase 3 comparison because semantic review found meaning-changing ID→EN modality failures, including sealed-holdout weakening of strong obligation/prohibition into `should` / `should not`.

Do not repair LMT from the observed failed phrases.

### Round 2 Candidate 1 — M2M100-1.2B

The target CUDA/BF16 runtime loaded successfully, but the rejection-only semantic prescreen found an exact EN→ID modality collapse:

```text
must / wajib        → harus
should / sebaiknya  → harus
```

This strengthens recommendation into obligation and erases the intended distinction. The candidate was therefore rejected before manual 32-case review, FLORES, repeated latency, COMET, or the frozen benchmark.

The user has completed local cleanup of the rejected M2M100-1.2B model bytes. Preserve its JSON report/review evidence.

## Frozen D-025 Benchmark

Still immutable:

```text
tools/translation_quality/benchmark_cases.json
Git blob e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

The full benchmark is **never** the first runtime filter for a challenger.

## Round 2 Candidate 2 — Google TranslateGemma 4B — ACTIVE

Candidate:

```text
repo          google/translategemma-4b-it
family        TranslateGemma / Gemma 3
license       Gemma Terms of Use
task          translation-specialized
input         official TranslateGemma source/target language chat template
directions    Indonesian ↔ English using ISO alpha-2 `id` / `en`
```

The official model repository is gated by Gemma terms. The target user/account must accept access for `google/translategemma-4b-it` on Hugging Face before weights can be downloaded.

The raw official BF16 shards total about 8.6 GB, so raw BF16 is not a viable RTX 3070 8 GB execution configuration. Round 2 evaluates exactly one compressed runtime configuration:

```text
official google/translategemma-4b-it weights
isolated Python 3.12 evaluation environment
PyTorch 2.11.0+cu126
Transformers 4.57.6
Accelerate 1.14.0
bitsandbytes 0.50.0
huggingface-hub 0.36.2
Windows CUDA / RTX 3070
bitsandbytes LLM.int8()
non-quantized compute dtype BF16
all model modules forced to CUDA; CPU/disk offload rejected
official TranslateGemma chat template
source_lang_code / target_lang_code = id / en
max_new_tokens = 200
do_sample = false
model.eval() + torch.inference_mode()
```

Do **not** add a Q4/GGUF/community checkpoint, 4-bit fallback, BF16 fallback, CPU-offload path, beam matrix, second backend, or output repair if this configuration fails. A failure returns to model/runtime reassessment rather than multiplying profiles.

## Exact Revision / Provenance Rule

The model is gated, so the evaluation tool resolves authenticated official `main` once on the target machine, records the returned exact Hugging Face commit SHA, writes it to:

```text
UserData/CacheData/TranslationQuality/Round2/TranslateGemma/translategemma_revision.txt
```

and downloads using that **exact resolved SHA**, not moving `main`.

Subsequent reruns reuse the pinned SHA. The report also records required-file metadata and local sizes for the official model shards/config/tokenizer files.

If Gemma access is not accepted/authenticated, the run stops as:

```text
BLOCKED_GEMMA_ACCESS
```

This is an external access prerequisite, not a model-quality/runtime failure.

## TranslateGemma Kill-Fast Tooling

Dev-only files:

```text
tools/translation_quality/round2_translategemma_worker.py
tools/translation_quality/round2_translategemma_prescreen.py
tools/translation_quality/run_round2_translategemma_prescreen.ps1
```

Output root:

```text
UserData/CacheData/TranslationQuality/Round2/TranslateGemma/
├─ .venv/
├─ translategemma_4b_model/
├─ translategemma_revision.txt
├─ translategemma_prescreen_report.json
├─ translategemma_semantic_review_pack.jsonl
└─ translategemma_worker_stderr.log
```

Evaluation order is intentionally cheap-first:

```text
1. isolated dependency compatibility
2. CUDA / BF16 / LLM.int8 module probe
3. gated access + exact revision resolution
4. official model acquisition
5. full-GPU LLM.int8 preload + VRAM accounting
6. two official-template ID↔EN smoke translations
7. rejection-only semantic cases
8. STOP
```

The same 16 bilingual / 32 directional generic rejection fixture remains unchanged:

```text
tools/translation_quality/round2_rejection_prescreen.json
Git blob eb59c2f1456e75a2d0c61dc1ae4d94c04cb40b07
```

### Additional time-waste guard

Unlike the M2M100-1.2B runner, TranslateGemma does **not** force all 32 semantic cases after a hard automatic rejection.

After every translated case it checks for:

```text
generation/completion failure
protected opaque-literal loss
completed exact semantic minimal-pair collapse
```

The run stops immediately on the first hard rejection. Because the modality obligation/recommendation pairs are first, a repeated `must`/`should` collapse can terminate after only the required first few semantic translations rather than completing all 32.

If no automatic rejection occurs, all 32 outputs are written for manual semantic review. A clean automatic result still cannot promote the model.

## Terminal States

```text
BLOCKED_GEMMA_ACCESS
→ accept Gemma model access/authentication and rerun the same command

REJECTED_RUNTIME
→ Windows LLM.int8 load/smoke failed; STOP; no alternate runtime profile

REJECTED_AUTOMATIC
→ hard runtime/literal/semantic-collapse diagnostic; STOP immediately

AWAITING_MANUAL_SEMANTIC_REVIEW
→ all 32 automatic cases completed; return report/review pack
```

None of these stages runs FLORES 1012×2, COMET, repeated performance benchmarking, the frozen full benchmark, or production migration.

## Execution Sequence

```text
Round 1 / Phase 2   LMT compatibility                         PASS
Round 1 / Phase 3   M2M100-418M vs LMT frozen run            DONE
Round 1             LMT semantic promotion gate               FAIL / REJECTED

Round 2A            source/license/size triage                 DONE
Round 2B            M2M100-1.2B kill-fast prescreen           FAIL / REJECTED
Round 2 cleanup     rejected M2M100-1.2B model bytes          DONE
Round 2C            TranslateGemma INT8 tooling               DONE
Round 2D            target Windows compatibility + kill-fast  NEXT
Round 2E            manual semantic review                    ONLY IF 2D AUTOMATIC CLEAN
Round 2F            small external + latency/VRAM              ONLY AFTER 2E PASS
Round 2G            frozen full D-025 benchmark                ONLY AFTER 2F PASS
Production migration                                            BLOCKED
```

Installer and combined ASR + translator + MyVoice proof remain deferred until one translator passes the full quality gate.

## Next Step

**ROUND 2D ONLY: fast-forward `Local`, close TranslateIT/other avoidable GPU AI workloads, then run `tools/translation_quality/run_round2_translategemma_prescreen.ps1` once on the RTX 3070. If the report says `BLOCKED_GEMMA_ACCESS`, accept the Gemma terms for `google/translategemma-4b-it` using the same Hugging Face account and rerun the same command. Otherwise return `UserData/CacheData/TranslationQuality/Round2/TranslateGemma/translategemma_prescreen_report.json`. Do not run external sampling, the frozen benchmark, or production migration.**

# TranslateIT — Next Action

## Current Status

`ROUND 1 LMT REJECTED / ROUND 2 M2M100-1.2B REJECTED + CLEANED / TRANSLATEGEMMA 4B LLM.INT8 REJECTED_AUTOMATIC AFTER 3/32 / EXISTING REPORT IS AUTHORITY / WRAPPER STATE-CAPTURE BUG FIXED / NO REPEAT INFERENCE / PRODUCTION M2M100-418M UNCHANGED`

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
- an accepted translator replaces the canonical model rather than becoming a router/fallback;
- target-Windows evidence is required before production adoption;
- the frozen D-025 benchmark remains promotion evidence;
- expensive evaluation is never the first filter for a new challenger.

Production remains:

```text
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
```

## Rejected Candidates

### LMT-60-1.7B

Rejected after the full target Phase 3 comparison because semantic review found meaning-changing ID→EN modality failures, including sealed-holdout weakening of strong obligation/prohibition.

### M2M100-1.2B

Rejected by the 32-direction rejection-only prescreen before expensive evaluation. EN→ID collapsed strong obligation and recommendation:

```text
must / wajib        → harus
should / sebaiknya  → harus
```

Its local model bytes have been cleaned; preserve its JSON report evidence.

### Google TranslateGemma 4B LLM.int8

Evaluation configuration:

```text
official google/translategemma-4b-it
isolated Python 3.12 evaluation environment
PyTorch 2.11.0+cu126
Transformers 4.57.6
Accelerate 1.14.0
bitsandbytes 0.50.0
Windows CUDA / RTX 3070
LLM.int8()
non-quantized compute dtype BF16
official TranslateGemma chat template
source_lang_code / target_lang_code = id / en
max_new_tokens = 200
do_sample = false
model.eval() + torch.inference_mode()
```

Target environment probe passed CUDA/BF16/LLM.int8 availability. Gated Hugging Face access was subsequently resolved and the model reached semantic inference.

The kill-fast run stopped after:

```text
semantic_completed_cases = 3
semantic_planned_cases   = 32
prescreen_state          = REJECTED_AUTOMATIC
```

This means a hard rejection-only diagnostic fired before the remaining semantic cases. The exact first hard-rejection detail is already stored in:

```text
UserData/CacheData/TranslationQuality/Round2/TranslateGemma/translategemma_prescreen_report.json
```

Do **not** rerun model inference merely to inspect it.

The PowerShell wrapper initially misreported the terminal state because native Python progress stdout was captured together with the returned state string. That was a wrapper presentation/state-handling bug, not a model/runtime result. The wrapper now:

```text
keeps Python progress on-screen without returning it as state
uses the existing terminal report as authority
skips repeated model inference for terminal states
prints the first hard rejection detail directly from the existing report
```

## Frozen D-025 Benchmark

Still immutable:

```text
tools/translation_quality/benchmark_cases.json
Git blob e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

No FLORES 1012×2, COMET, repeated performance benchmark, or frozen full benchmark is warranted for TranslateGemma unless the existing report is shown to contain a harness/diagnostic defect rather than a valid model rejection.

## Execution Sequence

```text
Round 1 / Phase 2   LMT compatibility                         PASS
Round 1 / Phase 3   M2M100-418M vs LMT frozen run            DONE
Round 1             LMT semantic promotion gate               FAIL / REJECTED

Round 2A            source/license/size triage                 DONE
Round 2B            M2M100-1.2B kill-fast prescreen           FAIL / REJECTED
Round 2 cleanup     rejected M2M100-1.2B model bytes          DONE
Round 2C            TranslateGemma INT8 tooling               DONE
Round 2D            TranslateGemma target kill-fast           FAIL / REJECTED_AUTOMATIC AT 3/32
Round 2D evidence   extract exact hard-rejection detail       NEXT / NO INFERENCE
Further model work                                             BLOCKED ON EVIDENCE REVIEW
Production migration                                           BLOCKED
```

Installer and combined ASR + translator + MyVoice proof remain deferred until one translator actually passes the translation quality gate.

## Next Step

**EVIDENCE REVIEW ONLY: fast-forward `Local`, run `tools/translation_quality/run_round2_translategemma_prescreen.ps1` once. The wrapper must detect the existing `REJECTED_AUTOMATIC` report, perform no model inference, and print the exact first hard rejection. Return that terminal summary. Do not run external sampling, the frozen benchmark, another model, or production migration before this evidence is classified.**

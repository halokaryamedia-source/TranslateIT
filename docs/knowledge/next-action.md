# TranslateIT — Next Action

## Current Status

`ROUND 1 LMT REJECTED / ROUND 2 M2M100-1.2B REJECTED BY KILL-FAST SEMANTIC GATE / TRANSLATEGEMMA 4B INT8 SELECTED FOR FINAL ROUND-2 CHALLENGER TRIAGE / PRODUCTION M2M100-418M UNCHANGED / FROZEN D-025 BENCHMARK UNCHANGED / INSTALLER DEFERRED`

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
- no phrase-specific patch, dictionary repair, or output rewriting;
- maximum two serious challengers per round;
- one accepted translator replaces the canonical model rather than becoming a router/fallback;
- target-Windows evidence is required before production adoption;
- the frozen D-025 benchmark remains the only promotion evidence.

Production remains:

```text
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
```

## Round 1 — LMT-60-1.7B — REJECTED

Target Phase 3 completed, but semantic review exposed meaning-changing ID→EN modality failures, including sealed-holdout weakening of strong obligation/prohibition into `should` / `should not`. Do not repair LMT from observed phrases.

## Round 2 Candidate 1 — M2M100-1.2B — REJECTED

Target prescreen runtime itself passed:

```text
CUDA              PASS
BF16              PASS
Transformers      4.50.0
PyTorch           2.11.0+cu126
num_beams         5
do_sample         false
context           1024
cold load         4670.13 ms
```

The reported whole-device VRAM baseline is not used as a candidate decision because the GPU was concurrently occupied during that run.

The candidate was rejected before external sampling/full benchmark because the generic semantic minimal-pair prescreen found an exact modality collapse in EN→ID:

```text
source contrast:
  must / wajib       = strong obligation
  should / sebaiknya = recommendation

M2M100-1.2B output for both:
  layanan harus menyimpan salinan pemulihan lokal sampai upload dikonfirmasi
```

This strengthens a recommendation into a mandatory requirement and erases the intended semantic distinction. The prescreen was explicitly defined to reject exact semantic contrast collapse, so no 32-case manual review, FLORES sweep, repeated performance run, COMET, or frozen full benchmark is warranted for M2M100-1.2B.

Preserve the report/review pack as evidence. Remove only the rejected model bytes with:

```text
tools/translation_quality/cleanup_rejected_m2m12b_model.ps1
```

Do not delete production `m2m100-418m`.

## Frozen D-025 Benchmark

Still immutable:

```text
tools/translation_quality/benchmark_cases.json
Git blob e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

The full benchmark is never the first filter for a challenger.

## Round 2 Candidate 2 — Google TranslateGemma 4B — SELECTED FOR PRESCREEN TOOLING

Source-level triage prefers TranslateGemma over MADLAD-400 3B for the final Round-2 challenger because it has newer translation-specific evidence and direct English–Indonesian training coverage.

Candidate:

```text
repo          google/translategemma-4b-it
family        TranslateGemma / Gemma 3
nominal size  4B family; Hugging Face reports ~5B total parameters
license       Gemma Terms of Use
input         text translation with official source/target language chat template
Indonesian    explicitly present in TranslateGemma SFT and RL English–Indonesian mixture
```

Published TranslateGemma evaluation reports consistent gains over Gemma 3 at the 4B size on WMT24++ overall. This is source-level candidate evidence only, not TranslateIT ID↔EN acceptance.

### Why not raw BF16

The official model repository contains two BF16 safetensors shards totaling about 8.6 GB. That is not a practical raw-weight configuration for an RTX 3070 8 GB before runtime/KV/other Meeting-stage memory.

### Single approved evaluation configuration

Use exactly one candidate configuration:

```text
Official google/translategemma-4b-it weights
isolated current compatible Transformers 4.x evaluation environment
Windows CUDA on RTX 3070
bitsandbytes LLM.int8()
official TranslateGemma chat template
source_lang_code / target_lang_code = id / en as required
do_sample=False
model.eval() + torch.inference_mode()
```

Do not create Q4/GGUF/community-quantized alternatives, 4-bit fallback, BF16 alternate profile, beam matrix, second backend, or output repair. Current bitsandbytes documentation supports LLM.int8 on Windows NVIDIA, including CUDA 12.6-class environments and Turing-or-newer GPUs; RTX 3070 satisfies that hardware boundary.

Gemma redistribution is permitted only subject to the current Gemma Terms, including downstream use restrictions, copy of the terms, and required notice. Packaging/release compliance remains a later release gate if the model is ever accepted.

## TranslateGemma Evaluation Order

Do **not** repeat the expensive LMT sequence. The next tooling must enforce:

```text
1. gated-model access + exact revision/file provenance
2. isolated Transformers/bitsandbytes Windows compatibility
3. LLM.int8 load + CUDA + whole-device/framework VRAM
4. official chat-template ID↔EN smoke translations
5. only if runtime viable: same 32-direction rejection-only semantic prescreen
6. STOP for manual review
7. only after zero-CRITICAL prescreen: small external + latency/VRAM proof
8. only after that passes: frozen full D-025 benchmark
```

A compatibility/prescreen pass cannot promote TranslateGemma. Any critical semantic error, incomplete generation, unstable Windows INT8 runtime, or impractical target memory/latency stops the candidate immediately.

MADLAD-400 3B is no longer the active reserve for this round. Its official full checkpoint is ~11.8 GB and would also require a new compressed runtime configuration, while TranslateGemma has stronger direct translation-specific evidence for the current quality-first objective.

## Execution Sequence

```text
Round 1 / Phase 2   LMT compatibility                         PASS
Round 1 / Phase 3   M2M100-418M vs LMT frozen run            DONE
Round 1             LMT semantic promotion gate               FAIL / REJECTED

Round 2A            source/license/size triage                 DONE
Round 2B            M2M100-1.2B kill-fast prescreen           FAIL / REJECTED
Round 2 cleanup     rejected M2M100-1.2B model bytes          READY
Round 2C            TranslateGemma INT8 tooling               NEXT
Round 2D            target Windows compatibility + 32 cases   BLOCKED ON 2C
Round 2E            small external + latency/VRAM              ONLY AFTER 2D PASS
Round 2F            frozen full D-025 benchmark                ONLY AFTER 2E PASS
Production migration                                            BLOCKED
```

Installer and combined ASR + translator + MyVoice proof remain deferred until one translator passes the full quality gate.

## Next Step

**ROUND 2C ONLY: prepare the isolated TranslateGemma 4B LLM.int8 Windows compatibility + kill-fast semantic prescreen tooling. Do not download/run MADLAD, do not run the frozen benchmark, and do not modify the production translator. On the target PC, the rejected M2M100-1.2B model bytes may be removed first with `cleanup_rejected_m2m12b_model.ps1`; preserve its report.**

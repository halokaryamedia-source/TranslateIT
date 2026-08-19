# TranslateIT — Next Action

## Current Status

`ROUND 1 LMT REJECTED / ROUND 2 CANDIDATE FLOOR REVISED TO >=1B / M2M100-1.2B KILL-FAST PRESCREEN READY / PRODUCTION M2M100-418M UNCHANGED / FROZEN D-025 BENCHMARK UNCHANGED / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, production `model_manifest.json`, production `uv.lock`, Meeting/VoiceLab behavior, or installer during Round 2 candidate rejection work.

## Durable Translation Constraints

D-025–D-027 continue to control the work:

- meaning/correctness outranks benchmark cosmetics and latency;
- no phrase-specific correction, dictionary patch, or output rewriting;
- maximum two serious challengers per round;
- one accepted translator replaces the canonical model rather than becoming a router/fallback;
- target-Windows evidence is required before production adoption;
- full frozen benchmark remains promotion evidence.

## Round 1 — LMT-60-1.7B Rejected

The target-Windows Phase 3 run completed, but LMT produced meaning-changing ID→EN modality failures, including sealed-holdout weakening of strong obligation/prohibition into `should` / `should not`. The frozen contract requires zero sealed-holdout CRITICAL semantic failures, so LMT is not eligible for production migration.

Do not repair LMT from observed failed phrases.

Production remains:

```text
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
```

## Frozen D-025 Benchmark — Still Immutable

```text
tools/translation_quality/benchmark_cases.json
Git blob e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

The expensive full benchmark is not the first filter for new candidates anymore.

## Round 2 Candidate Policy

The user rejected undersized translation candidates after reviewing SMaLL-100's 330M scale. Round 2 therefore uses a practical candidate floor of approximately **1B parameters or larger**. Parameter count is not treated as proof of quality, but sub-1B candidates are no longer worth runtime evaluation for this product round.

SMaLL-100 is removed from active Round 2 tooling and must not be run.

Evaluation order:

```text
source/license/platform/size rejection
→ 32-direction semantic kill-fast prescreen
→ manual semantic review
→ only if clean: small external + practical latency/VRAM prescreen
→ only if still clean: frozen full D-025 benchmark
→ only after full PASS: production migration work
```

The kill-fast prescreen can reject early but **cannot promote** a model.

## Candidate 1 — M2M100-1.2B

Active candidate:

```text
repo       facebook/m2m100_1.2B
revision   7b36184180524c1a1bbfa37f120a608046250b98
license    MIT
parameters ~1.2B
weights    pytorch_model.bin
size       ~4.96 GB source checkpoint
SHA256     a58ef8f42362ef12adeddc600b3425f1e2bbd019cfa6aae6b0051e2e3e055cd4
```

One evaluation runtime is frozen for the prescreen:

```text
PyTorch / current canonical Transformers 4.x
CUDA on target RTX 3070
BF16 model dtype
AutoModelForSeq2SeqLM
M2M100 language-token contract
num_beams=5
do_sample=False
model.eval() + torch.inference_mode()
```

BF16 is used as the single evaluation configuration because the source checkpoint is FP32-sized while the target GPU is 8 GB. This is not a user-facing profile or fallback. If BF16 causes a semantic/runtime problem, stop rather than adding alternate numeric modes during the same candidate pass.

## Candidate 2 — MADLAD-400 3B — Reserve Only

Reserve candidate:

```text
repo       google/madlad400-3b-mt
license    Apache-2.0
parameters ~3B
full safetensors checkpoint ~11.8 GB
```

Do **not** download or run MADLAD while M2M100-1.2B is under review. Its full checkpoint is materially larger than target VRAM, so it requires a separate memory/runtime feasibility decision before any inference. Do not automatically solve this with quantization merely to force it into the GPU.

NLLB-200 1.3B is not an active candidate because its official model card uses a non-commercial CC-BY-NC license.

## Kill-Fast Semantic Prescreen

Generic rejection fixture remains:

```text
tools/translation_quality/round2_rejection_prescreen.json
Git blob eb59c2f1456e75a2d0c61dc1ae4d94c04cb40b07
```

M2M100-1.2B dev-only tooling:

```text
tools/translation_quality/round2_m2m12b_worker.py
tools/translation_quality/round2_m2m12b_prescreen.py
tools/translation_quality/run_round2_m2m12b_prescreen.ps1
```

The first stage runs exactly **16 bilingual semantic pairs / 32 directional translations**, covering:

```text
strong obligation vs recommendation
prohibition vs no-requirement
permission
exact / minimum / maximum quantifiers
unless / even-if conditions
neither/nor and only scope
temporal ordering / already-completed aspect
opaque date/version/network facts
```

Automatic rejection catches only generation/completion failure, protected opaque-literal loss, and exact semantic minimal-pair collapse. A clean automatic result is **not** a semantic pass. All 32 outputs still require manual severity review; one CRITICAL meaning error rejects the candidate immediately.

This stage does **not** run FLORES 1012×2, repeated latency benchmark, COMET, the full frozen product benchmark, MADLAD, or production migration.

## Target-Windows Command

From:

```text
D:\Work\AI Stuff\TranslateIT
```

run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\run_round2_m2m12b_prescreen.ps1
```

The first run downloads the exact ~4.96 GB M2M100-1.2B checkpoint into evaluation cache only:

```text
UserData/CacheData/TranslationQuality/Round2/m2m100_1_2b_model/
```

Expected report:

```text
UserData/CacheData/TranslationQuality/Round2/m2m12b_prescreen_report.json
```

Possible terminal states:

```text
REJECTED_AUTOMATIC
→ STOP and review; do not run Candidate 2/full benchmark

AWAITING_MANUAL_SEMANTIC_REVIEW
→ STOP and return report; review all 32 outputs before further inference
```

## Execution Sequence

```text
Round 1 / Phase 2   LMT compatibility                         PASS
Round 1 / Phase 3   M2M100-418M vs LMT frozen run            DONE
Round 1             LMT semantic promotion gate               FAIL / REJECTED

Round 2A            candidate-size policy + source triage      DONE
Round 2B            M2M100-1.2B 32-direction prescreen        NEXT
Round 2C            manual semantic review                     BLOCKED ON 2B
Round 2D            small external + latency/VRAM prescreen    ONLY AFTER 2C PASS
Round 2E            frozen full D-025 benchmark                ONLY AFTER 2D PASS
Round 2 reserve      MADLAD-400 3B feasibility                 ONLY IF M2M100-1.2B REJECTED
Production migration                                            BLOCKED
```

Installer and combined ASR + translator + MyVoice proof remain deferred until one translation candidate passes the full quality gate.

## Next Step

**ROUND 2B ONLY: fast-forward `Local`, run `tools/translation_quality/run_round2_m2m12b_prescreen.ps1` once on the target RTX 3070, then return `m2m12b_prescreen_report.json`. Do not run MADLAD, external sampling, the full benchmark, or production migration before the 32 outputs are reviewed.**

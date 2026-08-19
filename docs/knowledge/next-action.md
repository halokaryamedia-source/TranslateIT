# TranslateIT — Next Action

## Current Status

`ROUND 1 LMT REJECTED / ROUND 2 ACTIVE CANDIDATE M2M100-1.2B / LMT CACHE CLEANED / RETIRED MARIAN CLEANUP CONFIRMED / PRESCREEN HARNESS QUOTING BUG FIXED / NO M2M100-1.2B INFERENCE YET / PRODUCTION M2M100-418M UNCHANGED / FROZEN D-025 BENCHMARK UNCHANGED / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, production `model_manifest.json`, production `uv.lock`, Meeting/VoiceLab behavior, or installer during Round 2 candidate rejection work.

## Durable Translation Constraints

D-025–D-027 remain controlling:

- meaning/correctness outranks latency and metric cosmetics;
- no phrase-specific patch, dictionary repair, or output rewriting;
- maximum two serious challengers per round;
- one accepted translator replaces the canonical model rather than becoming a router/fallback;
- target-Windows evidence is required before production adoption;
- the frozen D-025 benchmark remains promotion evidence.

Production remains:

```text
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
```

## Round 1 Result

LMT-60-1.7B is rejected for production migration. The target Phase 3 run completed, but semantic review exposed meaning-changing ID→EN modality failures, including sealed-holdout weakening of strong obligation/prohibition. Do not repair LMT from those observed phrases.

## Local Cleanup Evidence

Target-Windows cleanup already removed:

```text
UserData/CacheData/TranslationQuality/Phase2/lmt_model
≈ 3.8 GiB reclaimed in the reported cleanup run
```

SMaLL-100 was not present locally.

The cleanup run also discovered:

```text
EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-en-id
EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en
```

Current production manifest has no Marian translation entry and the repository contains no active reference to either exact directory. Marian was already retired when M2M100 became canonical. These two exact directories are therefore now approved cleanup targets.

Cleanup owner:

```text
tools/translation_quality/cleanup_rejected_translation_models.ps1
```

The cleanup owner must preserve:

```text
EngineData/Backend/RuntimeAssets/Translation/ModelData/m2m100-418m
UserData/CacheData/TranslationQuality/Round2/m2m100_1_2b_model
UserData/CacheData/TranslationQuality/Phase2/.venv
Phase 2 / Phase 3 JSON reports and review evidence
```

No broad model wildcard deletion is approved.

## Frozen D-025 Benchmark

Still immutable:

```text
tools/translation_quality/benchmark_cases.json
Git blob e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

The full benchmark is not the first filter for a new challenger.

## Round 2 Candidate Policy

Use a practical floor of approximately **1B parameters or larger** for this round. Parameter count is not proof of quality, but sub-1B candidates are not worth runtime evaluation for the current quality-first target.

SMaLL-100 is not an active candidate.

Evaluation sequence:

```text
source/license/platform/size triage
→ 32-direction semantic kill-fast prescreen
→ manual semantic review
→ only if clean: small external + practical latency/VRAM prescreen
→ only if still clean: frozen full D-025 benchmark
→ only after full PASS: production migration
```

The kill-fast prescreen may reject a candidate but cannot promote it.

## Candidate 1 — M2M100-1.2B — ACTIVE

```text
repo       facebook/m2m100_1.2B
revision   7b36184180524c1a1bbfa37f120a608046250b98
license    MIT
parameters ~1.2B
weights    pytorch_model.bin
size       ~4.96 GB source checkpoint
SHA256     a58ef8f42362ef12adeddc600b3425f1e2bbd019cfa6aae6b0051e2e3e055cd4
```

Single prescreen runtime:

```text
PyTorch / canonical Transformers 4.x
CUDA on target RTX 3070
BF16
AutoModelForSeq2SeqLM
M2M100 language-token contract
num_beams=5
do_sample=False
model.eval() + torch.inference_mode()
```

No alternate numeric profile, quantization, beam reduction, second backend, or output repair is approved during this candidate pass.

## Candidate 2 — MADLAD-400 3B — Reserve Only

```text
repo       google/madlad400-3b-mt
license    Apache-2.0
parameters ~3B
full safetensors checkpoint ~11.8 GB
```

Do not download/run MADLAD while M2M100-1.2B is under review. It requires a separate memory/runtime feasibility decision if Candidate 1 is rejected.

## M2M100-1.2B Prescreen

Generic rejection fixture:

```text
tools/translation_quality/round2_rejection_prescreen.json
Git blob eb59c2f1456e75a2d0c61dc1ae4d94c04cb40b07
```

Active tooling:

```text
tools/translation_quality/round2_m2m12b_worker.py
tools/translation_quality/round2_m2m12b_prescreen.py
tools/translation_quality/run_round2_m2m12b_prescreen.ps1
```

The first attempt stopped before model acquisition/inference because PowerShell-native argument handling stripped quotes from embedded Python `-c` acquisition code. Evidence:

```text
SyntaxError: invalid decimal literal
repo_id=facebook/m2m100_1.2B
```

Classification:

```text
M2M100-1.2B downloaded   NO
M2M100-1.2B inference    NO
semantic result          NOT TESTED
CUDA/BF16 preflight      PASS
production modified      NO
```

This was a harness defect, not a model/runtime failure.

The fix removes acquisition source code from PowerShell entirely. `round2_m2m12b_prescreen.py` now owns pinned `snapshot_download()`, exact revision acquisition, required-file checks, and SHA256 verification before launching the candidate worker. This removes the PowerShell → `python -c` quoting boundary from model acquisition.

The prescreen still runs only **16 bilingual semantic pairs / 32 directional translations** and then stops for manual review. It does not run FLORES 1012×2, repeated performance, COMET, MADLAD, the full benchmark, or production migration.

Expected report:

```text
UserData/CacheData/TranslationQuality/Round2/m2m12b_prescreen_report.json
```

## Execution Sequence

```text
Round 1 / Phase 2   LMT compatibility                         PASS
Round 1 / Phase 3   M2M100-418M vs LMT frozen run            DONE
Round 1             LMT semantic promotion gate               FAIL / REJECTED

Round 2A            candidate-size policy + source triage      DONE
Round 2 cleanup     LMT cache removal                          DONE (3.8 GiB reported)
Round 2 cleanup     retired Marian exact directories           NEXT RERUN
Round 2 harness     acquisition quoting defect                 FIXED IN SOURCE / TARGET RERUN REQUIRED
Round 2B            M2M100-1.2B 32-direction prescreen        NEXT
Round 2C            manual semantic review                     BLOCKED ON 2B
Round 2D            small external + latency/VRAM prescreen    ONLY AFTER 2C PASS
Round 2E            frozen full D-025 benchmark                ONLY AFTER 2D PASS
Round 2 reserve      MADLAD-400 3B feasibility                 ONLY IF M2M100-1.2B REJECTED
Production migration                                            BLOCKED
```

Installer and combined ASR + translator + MyVoice proof remain deferred until one translation candidate passes the full quality gate.

## Next Step

**ROUND 2 ONLY: fast-forward `Local`, rerun `cleanup_rejected_translation_models.ps1` once so the two retired Marian directories are removed, then run `run_round2_m2m12b_prescreen.ps1` once on the RTX 3070. Return `m2m12b_prescreen_report.json`. Do not run MADLAD, external sampling, the full benchmark, or production migration before the 32 outputs are reviewed.**

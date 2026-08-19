# TranslateIT — Next Action

## Current Status

`ROUND 1 LMT REJECTED / ROUND 2 KILL-FAST SEMANTIC PRESCREEN READY / PRODUCTION M2M100-418M UNCHANGED / FROZEN D-025 BENCHMARK UNCHANGED / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, production `model_manifest.json`, production `uv.lock`, Meeting/VoiceLab behavior, or installer during Round 2 candidate rejection work.

Durable constraints D-025–D-027 still control the translation boundary:

- quality/meaning outranks benchmark cosmetics and latency;
- no phrase-specific correction or output postprocessor;
- maximum two serious challengers in one round;
- one accepted model replaces the canonical translator rather than becoming a router/fallback;
- target-Windows evidence is required before production adoption.

## Round 1 — LMT-60-1.7B Rejected

The target-Windows Phase 3 automatic run completed successfully, so the LMT rejection is **not** a load/CUDA/completion failure.

Round 1 evidence exposed meaning-changing ID → EN modality weakness, including sealed-holdout outputs that weakened strong obligation/prohibition into `should` / `should not`. The frozen benchmark requires zero sealed-holdout CRITICAL semantic failures, therefore LMT-60-1.7B is not eligible for production migration in this round.

Do not repair LMT from those observed phrases. In particular, do not add `harus → must`, `tidak boleh → must not`, prompt patches, dictionaries, or output rewriting derived from the failed examples.

Production remains:

```text
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
```

This remains a baseline, not final quality acceptance.

## Frozen D-025 Benchmark — Still Immutable

```text
tools/translation_quality/benchmark_cases.json
Git blob e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

Do not edit these artifacts based on Round 1 output.

The expensive full benchmark remains the **promotion evidence**, but it is no longer the first runtime filter for a new challenger.

## Round 2 Evaluation Strategy — Reject Cheaply First

The previous sequence spent thousands of translations before exposing a basic semantic defect. Round 2 reverses the cost order:

```text
source/license/platform/size rejection
→ 32-direction semantic kill-fast prescreen
→ manual semantic review
→ only if clean: small external + practical latency/VRAM prescreen
→ only if still clean: frozen full D-025 benchmark
→ only after full PASS: production migration work
```

The kill-fast prescreen is **one-sided**:

```text
may reject a candidate early      YES
may promote a candidate           NO
may replace the frozen benchmark  NO
```

It was created after Round 1 and therefore must never be presented as unseen promotion evidence. Its only purpose is to avoid another expensive full benchmark for a candidate with an obvious semantic/runtime defect.

Once the first SMaLL-100 output has been generated, `round2_rejection_prescreen.json` is immutable for this prescreen version.

## Round 2 Shortlist

### Candidate 1 — SMaLL-100

Evaluate first:

```text
repo      alirezamsh/small100
revision  8ab680e26a596d2e3d2d17ae0f68df1037328c
license   MIT
weights   model.safetensors
SHA256    dd3b845a36ea4ed90437fd0b9b477e30c21f144d3658679fd5c945e3c96b0fbc
```

Round 2 starts with full-precision SMaLL-100 only as a semantic upper-bound prescreen. No quantization, alternate backend, beam reduction, output repair, or production integration is introduced.

### Candidate 2 — M2M100-1.2B

Reserve only:

```text
repo      facebook/m2m100_1.2B
license   MIT
```

Do **not** download or run it while SMaLL-100 is still under review. It becomes active only if SMaLL-100 is rejected or later fails a Round 2 gate.

Larger candidates rejected during source-level triage are not reopened by adding quantization/runtime variants merely to force them into the 8 GB target.

## Kill-Fast Semantic Prescreen

Dev-only files:

```text
tools/translation_quality/round2_rejection_prescreen.json
tools/translation_quality/round2_small100_worker.py
tools/translation_quality/round2_small100_prescreen.py
tools/translation_quality/run_round2_small100_prescreen.ps1
```

The first stage runs exactly **16 bilingual semantic pairs / 32 directional translations** covering:

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

Automatic rejection catches only:

```text
generation/completion failure
protected opaque-literal loss
exact semantic minimal-pair output collapse
```

A clean automatic result is **not** a semantic pass. All 32 directional outputs must then receive manual meaning/severity review. One CRITICAL meaning error rejects SMaLL-100 immediately.

This stage intentionally does **not** run:

```text
1012 × 2 FLORES sweep
repeated 30-run performance benchmark
COMET
full frozen product benchmark
M2M100-1.2B
production migration
```

## Target-Windows Command

From:

```text
D:\Work\AI Stuff\TranslateIT
```

run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\run_round2_small100_prescreen.ps1
```

The first run may download the pinned ~1.33 GB SMaLL-100 safetensors asset into evaluation cache only:

```text
UserData/CacheData/TranslationQuality/Round2/small100_model/
```

Expected report:

```text
UserData/CacheData/TranslationQuality/Round2/small100_prescreen_report.json
```

Possible terminal states:

```text
REJECTED_AUTOMATIC
→ STOP; review reason; do not run Candidate 2 yet

AWAITING_MANUAL_SEMANTIC_REVIEW
→ STOP; return report; review all 32 outputs before any further inference
```

## Execution Sequence

```text
Round 1 / Phase 2   LMT compatibility                         PASS
Round 1 / Phase 3   M2M100 vs LMT frozen run                 DONE
Round 1             LMT semantic promotion gate               FAIL / REJECTED

Round 2A            source/license/platform/size triage        DONE
Round 2B            SMaLL-100 32-direction semantic prescreen NEXT
Round 2C            manual semantic review                     BLOCKED ON 2B
Round 2D            small external + latency/VRAM prescreen    ONLY AFTER 2C PASS
Round 2E            frozen full D-025 benchmark                ONLY AFTER 2D PASS
Round 2 reserve      M2M100-1.2B                               ONLY IF SMaLL-100 REJECTED
Production migration                                            BLOCKED
```

Installer and combined ASR + translator + MyVoice proof remain deferred until one translation candidate actually passes the full quality gate.

## Next Step

**ROUND 2B ONLY: fast-forward `Local`, run `tools/translation_quality/run_round2_small100_prescreen.ps1` once on the target RTX 3070, then return `small100_prescreen_report.json`. Do not run M2M100-1.2B, external sampling, the full benchmark, or production migration before the 32 semantic outputs are reviewed.**

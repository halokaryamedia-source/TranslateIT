# TranslateIT — Next Action

## Current Status

`TRANSLATION QUALITY REVIEW ACTIVE / QUALITY PLAN APPROVED / LMT-60-1.7B PREFERRED TARGET / GENERAL BENCHMARK PROOF NEXT / NO PRODUCTION SWITCH YET / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Target checkout:

```text
D:\Work\AI Stuff\TranslateIT
```

Do **not** advance to microphone / VoiceLab / Meeting acceptance and do **not** modify the production translator until the approved general quality gate has compared the current baseline with the selected challenger on the target Windows PC.

## Target Windows Evidence

```text
GPU       NVIDIA GeForce RTX 3070
Driver    610.62
VRAM      8192 MiB
Python    3.12.10
AI path   CUDA
```

## Current Production Baseline

Current source still implements D-024:

```text
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
one shared bidirectional runtime
Standalone Text semantic/sentence segmentation
blank-line paragraph preservation
model-default beam profile
target-language forced BOS
padding-aware EOS verification
no Marian fallback/router
```

This remains the current implementation only. It is not accepted as final translation quality.

## Acceptance Evidence Preserved

```text
STEP 1   Application / worker startup              PASS
STEP 2A  ID → EN representative Text               PASS correctness / quality findings
STEP 2B  EN → ID representative Text               PASS correctness / quality findings
STEP 2C-A long multi-paragraph ID → EN             PASS correctness / quality findings
STEP 2C-B long multi-paragraph EN → ID             FAIL semantic correctness
```

The blocking STEP 2C-B defect is meaning-changing modality:

```text
must not
→ tidak harus
```

This changes prohibition into approximately `does not have to / is not required to`. It is a semantic correctness failure even though the sentence, paragraph, and factual literals remain present.

Other observed M2M100 naturalness findings include wording such as `Tarikh`, `rakaman`, `ujian`, `slowest delivery target`, and awkward literal phrasing. These are evidence that the next decision must evaluate semantic fidelity and target-language naturalness generally rather than patch individual phrases.

## Quality Review Governance

Durable gate: `docs/knowledge/decision-log.md` D-025.

The approved quality-improvement method is:

```text
known-failure regression set
+
external/reference MT benchmark
+
general product semantic stress set
+
sealed unseen holdout
+
semantic severity review
+
chrF++ / BLEU / COMET as supporting metrics
+
opaque fact-preservation diagnostics
+
blind naturalness review for finalists
+
target RTX 3070 cold-load / warm p50-p90 latency / whole-device VRAM
+
license / offline / Windows / packaging review
```

Exact-output natural-language unit tests, phrase-specific grammar patches, date fixers, output rewrite dictionaries, back-translation correction loops, model routers/fallback stacks, cloud fallback, and arbitrary decoding sweeps remain rejected.

## Final Model-Family Audit — Preferred Target

### Preferred challenger / intended canonical target

```text
NiuTrans/LMT-60-1.7B
Apache-2.0
Qwen3-based translation-specialized model
Indonesian explicitly supported
raw model payload approximately 4.06 GB
recommended upstream decoding: deterministic beam search, num_beams=5
```

This is the model TranslateIT should attempt to adopt **if** the frozen local benchmark/holdout confirms the expected quality and target latency. It is not yet written into production `model_manifest.json` or the worker.

### Why 1.7B instead of 0.6B

The ACL 2026 LMT paper reports Indonesian FLORES-200 devtest results by model size.

```text
EN → ID
                 COMET-22   SacreBLEU
LMT 0.6B          90.62       43.23
LMT 1.7B          91.93       45.00
LMT 4B            92.38       45.71
LMT 8B            92.47       47.10

ID → EN
                 COMET-22   SacreBLEU
LMT 0.6B          88.61       41.19
LMT 1.7B          89.72       44.60
LMT 4B            89.93       45.69
LMT 8B            89.95       45.56
```

The 1.7B model captures most of the Indonesian quality gain available when scaling beyond 0.6B. Moving from 1.7B to 4B produces only a small additional COMET gain for both directions while more than doubling model payload/parameter scale.

Because the product priority is **quality first with low latency**, the 0.6B model is not the preferred target: it gives away a material amount of ID↔EN benchmark quality for a speed/size benefit that has not been shown necessary on the RTX 3070.

### Why not 4B / 8B

The LMT 4B raw model payload is approximately 8.84 GB, already larger than the target RTX 3070's 8 GB VRAM before runtime activations, beam-search state, ASR, or My Voice are considered. It would therefore require quantization/offload/runtime changes before it could even be evaluated as the normal full-precision target, while its Indonesian quality improvement over 1.7B is comparatively small.

The 8B model adds still more compute/memory for very small COMET gains over 4B on ID↔EN and is rejected for the low-latency target.

### Why not MADLAD-400 3B in Round 1

MADLAD-400 3B is Apache-2.0 and supports Indonesian, but its published full model weight is approximately 11.8 GB. On the target 8 GB GPU it would force quantization/offload from the beginning, mixing model-quality selection with compression/runtime engineering. It remains a later fallback research candidate only if LMT-1.7B fails the approved quality gate.

### Current baseline M2M100

M2M100-418M stays only as the benchmark baseline because it is already integrated and measured on the target PC. Its STEP 2C-B semantic failure means it cannot be declared the final translator without beating the same general quality gate.

## Important Benchmark Caveat

The LMT authors state that their SFT data includes FLORES-200 **dev**, NTREX-128, SMol, WMT14–23 test sets, and IWSLT17–24 test sets. Their paper reports the per-language numbers above on FLORES-200 **devtest**. Therefore those published scores are useful for comparing the relative 0.6B / 1.7B / 4B / 8B scaling behavior inside the same model family, but they are **not sufficient product acceptance evidence** for TranslateIT.

TranslateIT must still use a frozen external/reference benchmark plus a separate sealed holdout that is not tuned against candidate outputs.

## Runtime Direction If 1.7B Wins Quality

Do not optimize before the full-precision/reference implementation passes semantic quality.

If LMT-1.7B wins the quality gate:

```text
LMT-1.7B reference implementation
→ measure real RTX 3070 latency / VRAM
→ only if performance needs improvement, evaluate CTranslate2 FP16
→ rerun the same frozen quality gate
→ only if VRAM still requires it, evaluate one int8_float16 path
→ rerun the same frozen quality gate
```

CTranslate2 currently supports Qwen3 conversion and GPU FP16 / int8-family compute types, so a bounded optimized runtime path exists without choosing a different product model. Quantization is not assumed to be quality-free.

Segmentation is also re-opened only after the model winner is known: compare whole-paragraph versus semantic-unit translation on context-sensitive holdout cases, and keep sentence segmentation only if it remains necessary for completeness/reliability.

## Acceptance Order

```text
1. Application / local worker startup                         PASS
2A. Standalone Text ID → EN                                  PASS correctness / quality finding
2B. Standalone Text EN → ID                                  PASS correctness / quality finding
2C-A. Long / multi-paragraph ID → EN                         PASS correctness / quality finding
2C-B. Long / multi-paragraph EN → ID                         FAIL semantic correctness
3. Microphone selection + Mic Test                            BLOCKED
4. VoiceLab guided recording / coverage readiness             BLOCKED
5. Full VoiceLab training + held-out review                   BLOCKED
6. Approve My Voice + restart persistence                     BLOCKED
7. Meeting Start transaction / combined runtime load          BLOCKED
8. Outbound ID speech → EN My Voice delivery                  BLOCKED
9. Optional incoming Meeting Sound EN → ID text               BLOCKED
10. Stop / restart / minimize / long-session behavior         BLOCKED
11. Sleep / wake + explicit fresh Start                       BLOCKED
12. Real meeting-app microphone reception                     BLOCKED
```

## Next Step

**Build and freeze the general Translation Quality Benchmark contract before downloading or integrating LMT-60-1.7B: regression set, external/reference set, product semantic stress categories, sealed unseen holdout, scoring/severity rubric, and target latency/VRAM measurement procedure. Then run the current M2M100 baseline and LMT-60-1.7B candidate through the exact same frozen evaluation using a local PowerShell-driven harness. Do not change production source/model manifest until the candidate passes semantic safety, general quality, naturalness, and RTX 3070 latency/VRAM gates.**

# TranslateIT — Next Action

## Current Status

`TRANSLATION QUALITY REVIEW ACTIVE / STEP 2C-B SEMANTIC FAIL / NO FURTHER RUNTIME DEVELOPMENT / QUALITY PLAN NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Target checkout:

```text
D:\Work\AI Stuff\TranslateIT
```

Do **not** advance to microphone / VoiceLab / Meeting acceptance and do **not** make another translation runtime/model/decoding/segmentation change until the quality-improvement plan is researched, critiqued, and explicitly approved.

## Target Windows Evidence

```text
GPU       NVIDIA GeForce RTX 3070
Driver    610.62
VRAM      8192 MiB
Python    3.12.10
AI path   CUDA
```

## Current Translation Implementation

Current source implements D-024:

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

This remains the **current implementation**, not final translation-quality acceptance.

## Acceptance Evidence Preserved

```text
STEP 1   Application / worker startup              PASS
STEP 2A  ID → EN representative Text               PASS correctness / quality findings
STEP 2B  EN → ID representative Text               PASS correctness / quality findings
STEP 2C-A long multi-paragraph ID → EN             PASS correctness / quality findings
STEP 2C-B long multi-paragraph EN → ID             FAIL semantic correctness
```

### STEP 2A / 2B

The M2M100 migration removed the prior Marian sentence/date corruption in the representative samples. Both translation directions loaded on CUDA with zero recent command errors.

Observed wording findings included examples such as:

```text
"Target pengiriman paling lambat" → "The slowest delivery target"
"final delivery deadline" → "Tarikh akhir pengiriman"
```

These were initially treated as naturalness findings because the tested meaning/facts remained recoverable.

### STEP 2C-A — ID → EN

Three paragraphs, names, dates, budget contrast, version/IP/URL/decimal/CUDA facts, local-only rule, no-cloud rule, and failure/no-truncated-result meaning were retained.

Quality findings included awkward wording such as `records` for recordings and `cut results` for truncated results.

### STEP 2C-B — EN → ID

Paragraphs and factual literals were retained, but two prohibitions materially changed modality:

```text
source
"The system must not automatically send text, recordings, or translation results to a cloud service."

observed
"Sistem tidak harus secara otomatis mengirimkan teks, rakaman, atau hasil terjemahan ke layanan cloud."
```

and:

```text
source
"... must not present a truncated result as a completed translation."

observed
"... tidak harus menyajikan hasil yang dipotong sebagai terjemahan selesai."
```

`must not` means prohibition; `tidak harus` means approximately `does not have to / is not required to`. This is a meaning-changing semantic correctness failure.

Other EN → ID wording such as `ujian`, `kelulusan resmi`, `rakaman`, and `Tarikh` also shows that natural Indonesian quality needs broader evaluation even where literal completeness is preserved.

## Critical Audit Of Previous Translation Work

The current quality review explicitly corrects weaknesses in the previous process:

1. **Model adoption was too sample-driven.** Marian was replaced after a bounded hand-picked fixture set showed clear defects, but the replacement was promoted before a general translation-quality benchmark existed.
2. **Completeness was over-weighted.** Semantic segmentation successfully reduced full-sentence omission, but preserving every source unit does not prove correct grammar, modality, negation, tense, reference, or natural target-language usage.
3. **Literal preservation was treated as too strong a proxy for quality.** Names, dates, versions, IPs, URLs, and numbers are necessary checks, but they do not detect meaning changes such as `must not` → `tidak harus`.
4. **The evaluation set was not broad enough to justify general claims.** It covered useful stress cases but did not systematically measure negation, modality, tense/aspect, conditionals, quantifiers, pronoun/reference, voice, questions, commands, coordination, conversational register, and general-domain translation.
5. **No frozen external benchmark + holdout methodology preceded development.** This creates a risk of repeatedly optimizing against examples already seen during debugging.
6. **Latency evidence is useful but incomplete.** Warm translation samples were generally sub-second on the RTX 3070, but there is no quality-versus-latency comparison across properly selected candidate models / decoding profiles, nor combined Meeting VRAM proof.
7. **Phrase-specific grammar patches are rejected.** Do not implement rules such as `must not` → `tidak boleh`, hard-coded date repairs, phrase dictionaries, output rewriting, or tests that only prove known fixtures.

## Quality Review Governance

Durable gate: `docs/knowledge/decision-log.md` D-025.

Until that gate is satisfied:

```text
NO targeted grammar patch
NO fixture-specific post-correction
NO model-router/fallback stack
NO new canonical model adoption
NO arbitrary decoder sweep
NO further acceptance progression
```

The next plan must first establish a **general, reproducible evaluation boundary** for both Indonesian → English and English → Indonesian.

Required dimensions for the plan:

```text
external/reference translation benchmark
+
product-domain semantic stress suite
+
unseen holdout set
+
meaning / grammar / naturalness rubric
+
opaque fact preservation checks
+
quality metrics appropriate to MT
+
human severity review for meaning-changing errors
+
p50 / p90 warm latency
+
cold model load
+
whole-device VRAM
+
license / offline / Windows / packaging constraints
```

Candidate evaluation must remain bounded: current baseline plus at most two serious challengers in one round. A replacement, if justified, replaces the canonical model rather than creating a normal runtime router/fallback system.

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

**Do not modify production translation source. Research and critically design the complete Translation Quality Improvement Plan first. The plan must review the current M2M100/semantic-segmentation approach, define a general benchmark and holdout methodology, shortlist only license/runtime-appropriate model/decoder candidates, specify quality-versus-latency/VRAM acceptance gates for the RTX 3070 target, and identify what must remain unchanged. Present the plan for explicit approval before any new implementation or benchmark harness is added to the repository.**

# TranslateIT — Next Action

## Current Status

`LOCAL WINDOWS ACCEPTANCE ACTIVE / M2M100 STEP 2C-B CORRECTNESS FAIL / MODAL-NEGATION ISOLATION NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Target checkout:

```text
D:\Work\AI Stuff\TranslateIT
```

Do not advance to microphone / VoiceLab / Meeting acceptance. Stop at the current Standalone Text correctness boundary and isolate the EN → ID modal-negation defect first.

## Target Windows

```text
GPU       NVIDIA GeForce RTX 3070
Driver    610.62
VRAM      8192 MiB
Python    3.12.10
AI path   CUDA
```

## Current Translation Direction

Durable decision remains `docs/knowledge/decision-log.md` D-024 while the newly observed semantic defect is isolated. Do not restart broad model evaluation or add a fallback/router before identifying the first wrong owner.

```text
ONE canonical translator
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636

Standalone Text
→ blank-line paragraph preservation
→ conservative semantic/sentence units
→ same canonical M2M100 runtime for every unit
→ ordered reassembly
→ any required-unit runtime/incomplete failure = whole Text request failure
```

## Source State

Relevant deliveries on `Local`:

```text
954e51b9263544ffa53485cdc040986cc0bc0b2e
fix(translation): migrate canonical runtime to M2M100

f0b2a2d12f30fe6f8f1e7291b420c0d5851f711d
test(worker): expose WorkerRuntime imports under pytest
```

Target Windows regression passed and the Tauri app opened normally.

## Acceptance Evidence

### STEP 1 — Application / local worker startup

`PASS`

### STEP 2A — M2M100 Standalone Text ID → EN

`PASS correctness / QUALITY FINDING`

All source sentences and required names/dates/CUDA/local-data facts were retained. Minor unnatural wording only.

### STEP 2B — M2M100 Standalone Text EN → ID

`PASS correctness / QUALITY FINDING`

The previous Marian sentence omission did not recur. Diagnostics confirmed:

```text
Worker                  ready
Execution device        CUDA
Translation loaded      en->id, id->en • cuda
Recent command errors   0
```

### STEP 2C-A — Long / Multi-Paragraph ID → EN

`PASS correctness / QUALITY FINDING`

All 3 paragraph boundaries and monitored names, dates, version/IP/URL/decimal/CUDA, budget contrast, local-only rule, no-cloud rule, and explicit-failure/no-truncated-result meaning were retained.

### STEP 2C-B — Long / Multi-Paragraph EN → ID

`FAIL correctness`

Paragraph structure and factual literals were retained, but two source prohibitions changed modality:

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

In Indonesian, `tidak harus` means approximately `does not have to / is not required to`, not the required prohibition `must not / tidak boleh`. This materially weakens the policy and is therefore a semantic correctness failure, not a wording-only quality finding.

Other wording such as `ujian`, `kelulusan resmi`, and `rakaman` is a quality/naturalness finding only and is not the current blocker.

## Acceptance Order

```text
1. Application / local worker startup                         PASS
2A. Standalone Text ID → EN                                  PASS correctness / quality finding
2B. Standalone Text EN → ID                                  PASS correctness / quality finding
2C-A. Long / multi-paragraph ID → EN                         PASS correctness / quality finding
2C-B. Long / multi-paragraph EN → ID                         FAIL correctness — modal negation
3. Microphone selection + Mic Test                            BLOCKED
4. VoiceLab guided recording / coverage readiness             BLOCKED
5. Full VoiceLab training + multi-candidate held-out review   BLOCKED
6. Approve My Voice + restart persistence                     BLOCKED
7. Meeting Start transaction / combined runtime load          BLOCKED
8. Outbound ID speech → EN My Voice delivery                  BLOCKED
9. Optional incoming Meeting Sound EN → ID text                BLOCKED
10. Stop / restart / minimize / long-session behavior          BLOCKED
11. Sleep / wake + explicit fresh Start                        BLOCKED
12. Real meeting-app microphone reception                      BLOCKED
```

Test rule remains: wrong-but-complete wording is a quality finding; omission, truncation, paragraph loss, or meaning-changing negation/modality is a correctness failure.

## Next Step

**Run one bounded EN → ID modal-negation isolation on the already-loaded target Windows runtime using the exact two failing prohibition sentences separately plus simple `must not`, `do not`, and `must` controls. Record the exact output for each. Do not edit production source or evaluate another model until this determines whether the defect is the M2M100 translation behavior itself or surrounding orchestration.**

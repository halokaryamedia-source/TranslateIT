# TranslateIT — Next Action

## Current Status

`LOCAL WINDOWS ACCEPTANCE ACTIVE / D-024 TRANSLATION SOURCE MIGRATION COMPLETE / TARGET STEP 2 RETEST NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Target checkout:

```text
D:\Work\AI Stuff\TranslateIT
```

Do not restart broad architecture/model evaluation, resume installer work, or advance to microphone/VoiceLab/Meeting acceptance until the migrated translation path passes STEP 2A → 2B → 2C through the Tauri application.

## Target Windows Evidence Preserved

Target PC used for the current evidence:

```text
GPU       NVIDIA GeForce RTX 3070
Driver    610.62
VRAM      8192 MiB
Python    3.12.10
AI path   CUDA
```

### STEP 1 — Application / local worker startup

`PASS`

```text
Tauri application              opens normally
Advanced → Diagnostics         opens normally
worker                         not_started → ready
selected execution device      CUDA
recent command errors          0
repository dev interpreter     WorkerRuntime/.venv
```

### STEP 2A — Old Marian ID → EN

`PASS correctness / QUALITY FINDING`

Representative multi-sentence translation completed, but date material duplicated (`20 Agustus 2026` → variants such as `August 20, 20, 2026`).

### STEP 2B — Old Marian EN → ID

`FAIL correctness`

The application omitted a complete first sentence. Direct raw-worker reproduction proved the loss occurred inside the canonical translation worker/model path, not Svelte/Rust presentation.

STEP 2C and all later acceptance were stopped at this failure boundary.

## Root-Cause / Model Viability Evidence

Restoring each Marian model's stored beam profile fixed one EN→ID omission but did not make Marian reliable. Target evaluation reproduced material issues including:

```text
date duplication / date-order corruption
2100 → 200
technical-fact omission
TranslateIT/version corruption
IP punctuation corruption
multi-sentence question omission
```

The final candidate evaluation used:

```text
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
model-default beams 5
```

Whole-vs-semantic-unit evaluation covered both directions with original omission, negation/numbers, date/time/version/IP/CUDA facts, cross-sentence context, Dr./URL/decimal, and multi-paragraph fixtures.

M2M100 materially outperformed Marian. One whole-text EN→ID fixture still omitted the second question; semantic-unit translation restored it. Segmented M2M100 preserved every monitored literal across the final fixture set in both directions, preserved blank-line paragraph structure, and stayed in the same practical sub-second warm range on the tested RTX 3070. Natural wording findings such as occasional `Tarikh` remain quality observations rather than justification for post-correction rules or a second translator.

## Frozen Translation Direction

Durable decision: `docs/knowledge/decision-log.md` D-024.

```text
ONE canonical translator
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636

Standalone Text
→ preserve blank-line paragraphs
→ conservative semantic/sentence units
→ protect common abbreviations / versions / URLs / IPs / decimals from false boundaries
→ oversized semantic unit may use bounded token-safe splitting
→ translate every required unit through the same M2M100 runtime
→ use pinned model generation profile
→ target-language forced BOS
→ padding-aware EOS verification
→ ordered paragraph-preserving reassembly
→ any required-unit failure = whole Text request failure

Meeting
→ one finalized utterance at a time
→ same canonical M2M100 runtime
→ no lifecycle/audio redesign in this migration
```

Marian is retired from the production path and is not retained as a runtime fallback/router.

## Source Migration Implemented In Current `Local`

The current source delivery changes only the proven translation boundary and its direct contracts:

```text
realtime_local_worker.py
→ one shared bidirectional M2M100 model instance
→ both ID→EN and EN→ID reuse that loaded model
→ source language set explicitly per request
→ target language forced BOS
→ model-default generation profile; no hard-coded num_beams=1
→ trailing PAD ignored only when verifying final effective EOS

translation_envelope.py
→ semantic/sentence-first Standalone planning
→ blank-line paragraph preservation
→ conservative protection for abbreviation / initial / version / URL / IP / decimal periods
→ token splitting only when one semantic unit exceeds the model envelope
→ existing bounded 32-unit ceiling retained

model_manifest.json
→ Marian entries removed
→ exact M2M100 revision pinned
→ one required bidirectional translation asset
→ developer acquisition allowlist excludes the duplicate unused Rust-framework weight

prepare_model_assets.py
→ optional manifest-owned Hugging Face allowlist used during atomic staged acquisition

targeted tests
→ bidirectional one-model routing/readiness
→ shared loaded model reuse
→ semantic segmentation contracts
→ pad-aware EOS
→ model-default beam contract
→ pinned acquisition/allowlist
```

No ASR, Meeting lifecycle/audio, VoiceLab, scheduler, cloud, fallback-router, generic fact-checker, glossary, or installer behavior was added.

## Source Proof Boundary

Before repository delivery, the changed worker/envelope and focused deterministic tests were exercised in a repo-shaped local harness:

```text
Python syntax compile       PASS
translation/worker tests    22 PASS
```

This is source-contract proof only. It does not replace the required target Windows application/model retest.

## Acceptance Order

```text
1. Application / local worker startup                         PASS on pre-migration source
2A. Standalone Text ID → EN                                  RETEST REQUIRED on M2M100 source
2B. Standalone Text EN → ID                                  RETEST REQUIRED on M2M100 source
2C. Standalone long / multi-paragraph                        BLOCKED until 2A/2B PASS
3. Microphone selection + Mic Test                            NOT STARTED
4. VoiceLab guided recording / coverage readiness             NOT STARTED
5. Full VoiceLab training + multi-candidate held-out review   NOT STARTED
6. Approve My Voice + restart persistence                     NOT STARTED
7. Meeting Start transaction / combined runtime load          NOT STARTED
8. Outbound ID speech → EN My Voice delivery                  NOT STARTED
9. Optional incoming Meeting Sound EN → ID text                NOT STARTED
10. Stop / restart / minimize / long-session behavior          NOT STARTED
11. Sleep / wake + explicit fresh Start                        NOT STARTED
12. Real meeting-app microphone reception                      NOT STARTED
```

## Next Step

**On the target Windows checkout, fast-forward `Local`, acquire only the pinned `m2m100-418m` model through the canonical `prepare_model_assets.py --model-id m2m100-418m` path, start the Tauri application, confirm Diagnostics reports the migrated M2M100 translation runtime on CUDA, and retest STEP 2A then STEP 2B with the previously failing representative samples. Continue to STEP 2C only if both pass correctness. Do not advance to microphone/VoiceLab/Meeting acceptance before STEP 2 completes.**

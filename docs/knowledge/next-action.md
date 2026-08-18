# TranslateIT — Next Action

## Current Status

`LOCAL WINDOWS ACCEPTANCE ACTIVE / STEP 2 TRANSLATION ROOT CAUSE RESOLVED / FINAL TRANSLATION DESIGN FROZEN / SOURCE MIGRATION NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Target checkout used for current Windows evidence:

```text
D:\Work\AI Stuff\TranslateIT
```

Do not restart broad architecture audit, resume installer work, or advance to microphone/VoiceLab/Meeting acceptance until the translation migration below is implemented and STEP 2 is retested through the Tauri application.

## Target Windows Evidence

Target PC:

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

ASR and My Voice were intentionally not loaded at this boundary.

### STEP 2A — Standalone Text ID → EN

`PASS correctness / QUALITY FINDING`

The current Marian path completed the first product translation but duplicated date material in representative multi-sentence input, including `20 Agustus 2026` becoming `August 20, 20, 2026`.

### STEP 2B — Standalone Text EN → ID

`FAIL correctness`

The application omitted the complete first sentence from a representative three-sentence source. Direct raw-worker reproduction proved the omission was produced inside the canonical translation worker/model path, not by Svelte/Rust presentation.

STEP 2C and all later acceptance remain blocked until the migration below is retested.

## Marian Root-Cause Evidence

Current source hard-codes `num_beams=1`. Target A/B testing compared that behavior with each pinned Marian model's stored generation profile.

```text
EN → ID
beam 1  → original first sentence omitted
beam 4  → first sentence restored, but date remained "20, 2026 Agustus"

ID → EN
beam 1  → date became "August 20, 20, 20, 2026"
beam 6  → improved but still "August 20, 20, 2026"
```

Further representative Marian testing showed additional correctness/quality failures, including:

```text
2100 → 200
TranslateIT/version corruption
technical-fact omission
IP punctuation corruption
multi-sentence question omission
recurring date duplication/order errors
```

Restoring Marian default beams is therefore insufficient as the long-term fix.

## M2M100 Candidate Identity And Runtime Evidence

Final candidate evaluated:

```text
repository  facebook/m2m100_418M
revision    55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636
beams       5
license     MIT (upstream model metadata)
```

Observed isolated target runtime:

```text
GPU                  NVIDIA GeForce RTX 3070
model load           ~1.3 s
loaded GPU used      ~2.7–3.6 GiB whole-device during evaluation context
warm translation     generally ~0.09–0.52 s for tested samples
post-test VRAM       returned near baseline
```

These figures are evaluation-specific. They do not establish combined Meeting ASR + translation + My Voice VRAM or final Meeting latency.

## Whole-vs-Segmented Final Evaluation

The final test compared model-default Marian and M2M100 using whole text versus hand-defined semantic units. Fixtures covered:

```text
original omission case
negation + 1800/2100
version / IP / time / date / CUDA facts
cross-sentence context
Dr. / version / URL / decimal
multi-paragraph input
both EN→ID and ID→EN
```

### Marian

Segmentation repaired some omissions and date duplication but did not make Marian reliable. Material failures remained, including numeric corruption, technical/name corruption, weak EN→ID date wording, and missing technical source material.

### M2M100 whole text

M2M100 substantially outperformed Marian and preserved the original failing three-sentence sample, dates, names, versions, IP addresses, URLs, decimals, and CUDA terminology. However one EN→ID fixture still omitted the second question when both sentences were translated as one unit.

### M2M100 semantic segmentation

Semantic-unit translation restored that omitted question and preserved all monitored literals across the final fixture set in both directions. It also preserved blank-line paragraph structure and often improved sentence capitalization/spacing. Warm total latency remained in the same practical sub-second range on the tested RTX 3070; segmentation overhead was generally tens of milliseconds to roughly one extra hundred milliseconds for the tested inputs.

Natural-language quality findings remain, especially occasional Indonesian wording such as `Tarikh`; these are quality observations, not source-content loss. Do not hide them with post-correction rules or a second translator.

## Completion-Verifier Finding

The evaluation also exposed a source-contract issue independent of model choice: several beam-search results decoded as complete natural text while the simple diagnostic reported `EOS=False`.

Current source only treats the final raw token as EOS. The migration must make completion verification padding-aware:

```text
sequence
→ ignore trailing PAD tokens only
→ require the last effective token to be a recognized EOS
→ reject output with no verifiable EOS
```

Do not weaken the complete-output contract or accept generation merely because decoded text looks plausible.

## Final Translation Design — FROZEN

Durable decision is recorded in `docs/knowledge/decision-log.md` D-024.

Production direction:

```text
ONE canonical translator
facebook/m2m100_418M
revision 55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636

Standalone Text
→ preserve blank-line paragraphs
→ conservative semantic/sentence units
→ protect abbreviations / versions / URLs / IPs / decimals from false boundaries
→ oversized unit uses existing token-safe fallback
→ translate every required unit through M2M100
→ model-default generation profile
→ padding-aware EOS verification
→ ordered paragraph-preserving reassembly
→ any required unit failure = whole request failure

Meeting
→ remains one finalized utterance at a time
→ same canonical M2M100 model
→ no Meeting lifecycle/audio redesign in this migration
```

M2M100 replaces Marian; Marian must not remain as a normal fallback or second production translator.

## Required Source Migration Scope

In scope:

```text
WorkerRuntime translation model path/readiness/loading
single shared bidirectional M2M100 runtime
forced target-language BOS required by M2M100
model-default beam generation
padding-aware EOS completion
Standalone Text conservative semantic segmentation
model_manifest exact M2M100 pin
bounded Hugging Face acquisition that excludes duplicate unused framework weights
regression tests for routing / segmentation / EOS / acquisition plan
docs/current continuity that directly own the changed state
```

Out of scope:

```text
ASR changes
Meeting lifecycle/audio changes
VoiceLab changes
cloud fallback
model router / Marian fallback
generic fact checker / date fixer / glossary / back-translation verifier
installer implementation
release-size rebenchmark before runtime scope is stable
```

## Acceptance Order

```text
1. Application / local worker startup                         PASS on pre-migration source
2A. Standalone Text ID → EN                                  PASS correctness / old-model quality finding
2B. Standalone Text EN → ID                                  FAIL on old Marian source
2C. Standalone long / multi-paragraph                        BLOCKED
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

**Implement the frozen D-024 translation migration on branch `Local` as one logical source delivery: replace the Marian production path with pinned M2M100-418M, add conservative Standalone Text semantic segmentation, use the model generation profile, make EOS verification padding-aware, update the canonical model acquisition/manifest without duplicate unused weights, and add targeted deterministic regression proof. Then have the target Windows checkout pull the new `Local`, acquire the pinned M2M100 RuntimeAsset, and retest STEP 2A → 2B → 2C through the Tauri UI before any later acceptance stage.**

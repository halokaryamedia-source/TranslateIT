# TranslateIT — Next Action

## Current Status

`LOCAL WINDOWS ACCEPTANCE ACTIVE / STEP 2 TRANSLATION RELIABILITY BLOCKED / MODEL VIABILITY EVALUATION ACTIVE / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Current target checkout used for local Windows evidence:

```text
D:\Work\AI Stuff\TranslateIT
```

The pre-test hardening and Diagnostics source work is complete. Target-Windows evidence is now authoritative for runtime/model claims. Do not restart broad architecture audit, resume installer work, or change Meeting/VoiceLab/runtime ownership while the current translation reliability blocker is unresolved.

Approved product boundary remains:

```text
Meeting
Text
VoiceLab
Settings
```

## Local Windows Acceptance — Current Evidence

### Target hardware

Observed target PC:

```text
GPU              NVIDIA GeForce RTX 3070
Driver           610.62
VRAM             8192 MiB
Worker Python    3.12.10
Execution path   CUDA
```

Whole-device GPU evidence before the model-candidate evaluation was approximately:

```text
used 1248 MiB
free 6771 MiB
```

### STEP 1 — Application / local worker startup

`PASS`

Observed evidence:

```text
Tauri application                 opens normally
Advanced → Diagnostics            opens normally
helper worker                     not_started → ready
selected execution device         CUDA
recent command errors             0
repository development worker     WorkerRuntime/.venv
```

ASR and My Voice were intentionally not loaded at this boundary. Missing approved My Voice is expected because VoiceLab acceptance has not started yet.

### STEP 2A — Standalone Text ID → EN

`PASS correctness / QUALITY FINDING`

Representative source contained names, dates, project terminology, and NVIDIA CUDA. Translation returned a complete result through CUDA, but Marian ID → EN duplicated the date component:

```text
source
20 Agustus 2026

observed output in the multi-sentence sample
August 20, 20, 2026
```

The first application translation was approximately 9.6 s including the then-current runtime/model path. Later direct warm model measurements were hundreds of milliseconds and must not be conflated with that first product call.

### STEP 2B — Standalone Text EN → ID

`FAIL correctness`

Source:

```text
On August 18, 2026, the Mivubi team sent Younes an update about the Clockwork project. The final delivery deadline is August 20, 2026. The system uses NVIDIA CUDA to run the translation model locally, and all user data must remain on the user's computer.
```

The application output omitted the first sentence entirely. Diagnostics still reported the worker ready, both translation directions loaded on CUDA, and zero recent command errors.

Direct worker reproduction proved the omission occurs inside the canonical translation worker/model path rather than the Svelte/Rust Text UI boundary.

Direct Marian EN → ID reproduction:

```text
full 62-token input
→ first sentence omitted
→ complete=true
→ finished_with_eos=true
→ chunk_count=1

first sentence alone
→ preserved Mivubi / Younes / Clockwork / 18 Agustus 2026

remaining two sentences alone
→ content retained, but date ordering/wording quality remained weak
```

Therefore EOS/generation completion does not establish semantic/source completeness for a whole multi-sentence translation.

**STEP 2C long / multi-paragraph acceptance remains blocked.** Do not advance to microphone, VoiceLab, Meeting, or installer acceptance until Step 2 reliability is resolved.

## Decoder A/B Isolation — Marian

A local A/B test compared the current TranslateIT hard-coded greedy decoding with the generation profile stored by the pinned local Marian models. No repository files were modified by this experiment.

### EN → ID

Local model configuration:

```text
generation_config beams  4
model.config beams       4
```

Full failing sample:

```text
num_beams=1
latency 181 ms
→ first sentence omitted
→ NVIDIA CUDA became NVIDIA CUDDA

num_beams=4
latency 418 ms
→ first sentence restored
→ Mivubi / Younes / Clockwork preserved
→ date still rendered as "20, 2026 Agustus"
```

Single date sentence remained `20, 2026 Agustus` with both beam profiles. Beam correction therefore fixes a material omission but does not fix the underlying EN → ID quality problem.

### ID → EN

Local model configuration:

```text
generation_config beams  6
model.config beams       6
```

Full representative sample:

```text
num_beams=1
latency 281 ms
→ date duplicated as "August 20, 20, 20, 2026"

num_beams=6
latency 328 ms
→ duplication reduced but remained "August 20, 20, 2026"
```

The single date sentence translated correctly under both profiles. This shows input composition affects Marian quality; simply restoring model-default beams is not sufficient as the long-term fix.

## Canonical Translator Candidate Evaluation — M2M100 418M

A bounded local candidate evaluation was run against `facebook/m2m100_418M` using the existing WorkerRuntime Python environment. The candidate was downloaded only into a separate Windows evaluation cache and **was not added to RuntimeAssets, model_manifest.json, or product source**.

The evaluation script resolved an exact Hugging Face revision before download, but that revision SHA was not included in the pasted evidence retained in this session. **Do not promote or package this candidate until the exact revision is captured and pinned.**

Observed candidate runtime:

```text
GPU                     NVIDIA GeForce RTX 3070
model load              1282 ms
model generation beams  5
VRAM while loaded       ~3291 MiB used / 4728 MiB free
VRAM later in test      ~3631 MiB used / 4388 MiB free
post-test baseline      ~1289 MiB used / 6730 MiB free
warm sample latency     ~90–477 ms
```

### M2M100 strengths observed

Compared with current Marian behavior, M2M100 materially improved the original problem cases:

```text
EN → ID original 3-sentence failure
→ all three source sentences retained
→ Mivubi / Younes / Clockwork retained
→ 18 Agustus 2026 and 20 Agustus 2026 retained
→ NVIDIA CUDA retained

EN → ID date sentence
→ "20 Agustus 2026"

EN → ID technical facts
→ TranslateIT v2.4.1 retained
→ 192.168.1.20 retained
→ 09:30 retained
→ 3 September 2026 retained
→ NVIDIA CUDA 12.6 retained

ID → EN original sample
→ all source sentences retained
→ both dates retained without numeric duplication
→ Mivubi / Younes / Clockwork / NVIDIA CUDA retained

ID → EN technical facts
→ version / IP / time / date / CUDA version retained
```

### M2M100 remaining blockers/findings

M2M100 is **not approved yet**.

Most important correctness failure:

```text
EN → ID source
"I did not approve ... 1800 dollars, not 2100 dollars. Can you send the corrected file today?"

M2M100 output
→ preserved the first sentence and the 1800/2100 contrast
→ OMITTED the second question entirely
```

This is another multi-sentence omission and is a correctness failure, not merely style quality.

Additional quality findings:

```text
"deadline" → "Tarikh akhir" in EN → ID
"unexpectedly" → "tidak dijangka" in one EN → ID sample
some sentence-boundary spacing/capitalization is imperfect
ID → EN "paling lambat" may become "slowest delivery target"
```

The candidate is therefore promising and substantially better on dates/facts/original failure, but whole-text generation still cannot yet be trusted to preserve every sentence.

## Translation Reliability Diagnosis

Current evidence supports these conclusions:

1. The Text UI/Rust boundary is not the first wrong owner for the observed omission; raw worker output reproduces it.
2. Current `num_beams=1` is materially harmful for Marian EN → ID completeness, but restoring pinned model-default beams does not solve Marian quality overall.
3. Marian has recurring factual/date/technical-quality problems under representative multi-sentence input.
4. M2M100 418M is a stronger replacement candidate on the tested dates/facts/original omission, with practical RTX 3070 latency/VRAM in this isolated evaluation.
5. M2M100 also omitted a complete second sentence in one EN → ID test, so replacing Marian alone does not yet establish Standalone Text completeness.
6. A generic digit/date post-correction or fact-checker subsystem is not approved. Do not hide model limitations with ad-hoc correction rules.
7. Do not add M2M100 as a second normal translator/fallback. If a replacement is eventually approved, keep one canonical translation implementation and retire the replaced production model path.
8. Do not implement unconditional sentence-per-inference splitting until its completeness, context, latency, abbreviation/version/URL boundary behavior, and chunk-count effects are measured on the target runtime.

## Current Design Direction — Not Yet Final Product Decision

The next reliability decision should distinguish model quality from segmentation behavior before production source changes.

Candidate architecture under evaluation:

```text
Standalone Text
→ preserve blank-line paragraphs
→ conservative semantic/sentence units when evidence requires it
→ oversized-unit token-safe fallback
→ one canonical approved translation model
→ every required planned unit must complete successfully
→ ordered paragraph-preserving reassembly
→ no partial result promotion
```

Meeting remains out of this experiment. Current Meeting translation still operates on one finalized utterance at a time and must receive its own target evidence later.

Do not introduce:

```text
translation router
multi-model fallback
cloud fallback
LLM post-correction
generic date/number fixer
glossary subsystem
back-translation verifier
semantic verification model
user-facing quality/realtime mode
```

unless later evidence and an explicit product decision establish a real need.

## Acceptance Order — Paused At Step 2

```text
1. Application / local worker startup                         PASS
2A. Standalone Text ID → EN                                  PASS correctness / quality finding
2B. Standalone Text EN → ID                                  FAIL correctness
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

Test execution rule remains: stop at the first failing boundary. Wrong-but-complete natural language is a quality finding; missing source content, silent truncation, or incomplete output promoted as success is a correctness failure.

## Next Step

**Run one bounded target-Windows segmentation viability evaluation before editing production translation source: compare whole-text versus conservative sentence/semantic-unit translation for the current Marian baseline and the M2M100 418M candidate, using the already failing multi-sentence samples plus abbreviation/version/IP/URL boundary cases. Record completeness, context quality, warm latency, chunk count, and VRAM. Capture the exact M2M100 revision SHA. Then choose one canonical model + Standalone Text segmentation contract; only after that decision should production source/model manifest changes be implemented and STEP 2B retested through the Tauri UI.**

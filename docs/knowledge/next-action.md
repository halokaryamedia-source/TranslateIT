# TranslateIT — Next Action

## Current Status

`LOCAL WINDOWS ACCEPTANCE ACTIVE / M2M100 STEP 2A + 2B PASS / STEP 2C NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Target checkout:

```text
D:\Work\AI Stuff\TranslateIT
```

Do not restart broad translation-model evaluation, resume installer work, or advance to microphone / VoiceLab / Meeting acceptance before Standalone Text STEP 2C completes.

## Target Windows

```text
GPU       NVIDIA GeForce RTX 3070
Driver    610.62
VRAM      8192 MiB
Python    3.12.10
AI path   CUDA
```

## Translation Direction — Frozen

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

Marian is retired from the production path and is not retained as a fallback/router.

## Current Source State

Relevant deliveries already on `Local`:

```text
954e51b9263544ffa53485cdc040986cc0bc0b2e
fix(translation): migrate canonical runtime to M2M100

f0b2a2d12f30fe6f8f1e7291b420c0d5851f711d
test(worker): expose WorkerRuntime imports under pytest
```

The first target regression run after migration exposed only a pytest import-path defect (`ModuleNotFoundError: translation_envelope`) caused by loading `realtime_local_worker.py` through `importlib` without the WorkerRuntime directory on `sys.path`. This was a test-harness failure, not a model/runtime failure. `tests/conftest.py` now establishes WorkerRuntime as the pytest import root.

Target Windows regression rerun passed and the Tauri application opened normally.

## Acceptance Evidence

### STEP 1 — Application / local worker startup

`PASS`

```text
application                  opens normally
Advanced → Diagnostics       opens normally
worker                       ready
selected execution device    CUDA
recent command errors        0
```

Missing approved My Voice remains expected before VoiceLab acceptance and does not invalidate Standalone Text testing.

### STEP 2A — M2M100 Standalone Text ID → EN

`PASS correctness / QUALITY FINDING`

Source covered Mivubi / Clockwork / Younes, 18 Agustus 2026, 20 Agustus 2026, NVIDIA CUDA, local execution, and local user-data retention.

Observed product output retained all three source sentences and all required facts. The previous Marian date duplication did not recur.

Quality findings only:

```text
"Target pengiriman paling lambat" → "The slowest delivery target"
"model terjemahan" → "translation models"
```

These are wording/naturalness findings, not truncation or completeness failures.

### STEP 2B — M2M100 Standalone Text EN → ID

`PASS correctness / QUALITY FINDING`

Previously failing source:

```text
On August 18, 2026, the Mivubi team sent Younes an update about the Clockwork project.
The final delivery deadline is August 20, 2026.
The system uses NVIDIA CUDA to run the translation model locally, and all user data must remain on the user's computer.
```

Observed application output retained:

```text
all 3 source sentences
Mivubi
Younes
Clockwork
18 Agustus 2026
20 Agustus 2026
NVIDIA CUDA
local translation execution
all user data remaining on the user's computer
```

The old Marian first-sentence omission did not recur.

Quality finding only:

```text
"final delivery deadline" → "Tarikh akhir pengiriman"
```

Diagnostics after STEP 2B:

```text
Worker                  ready
Execution device        CUDA
Translation loaded      en->id, id->en • cuda
ASR                     not loaded • selected cuda
My Voice                not loaded
Recent command errors   0
```

This confirms both translation directions are loaded through the migrated CUDA runtime. ASR / My Voice remain intentionally unloaded at this Text-only boundary.

## Acceptance Order

```text
1. Application / local worker startup                         PASS
2A. Standalone Text ID → EN                                  PASS correctness / quality finding
2B. Standalone Text EN → ID                                  PASS correctness / quality finding
2C. Standalone long / multi-paragraph                        ACTIVE NEXT
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

Test rule remains: wrong-but-complete wording is a quality finding; source omission, silent truncation, paragraph loss, or incomplete output promoted as success is a correctness failure. Stop at the first correctness failure.

## Next Step

**Run STEP 2C on the already-open target Windows Tauri application using a long multi-paragraph Standalone Text fixture that exercises paragraph preservation, multiple sentences, names, dates, numbers, version/IP/URL/decimal/technical terms, and negation. Start with Indonesian → English. Record the full source/output, whether blank-line paragraph boundaries remain, and refreshed Diagnostics. If correctness passes, run the corresponding English → Indonesian long/multi-paragraph fixture before declaring STEP 2 complete. Do not begin Mic Test until both STEP 2C directions pass correctness.**

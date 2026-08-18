# TranslateIT — Next Action

## Current Status

`LOCAL WINDOWS ACCEPTANCE ACTIVE / M2M100 STEP 2A + 2B + 2C-A PASS / STEP 2C-B NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

Target checkout:

```text
D:\Work\AI Stuff\TranslateIT
```

Do not restart broad translation-model evaluation, resume installer work, or advance to microphone / VoiceLab / Meeting acceptance before Standalone Text STEP 2C-B completes.

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

The target Windows regression rerun passed after the pytest import-root fix and the Tauri application opened normally.

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

The representative sample retained all three source sentences plus Mivubi / Clockwork / Younes, both dates, NVIDIA CUDA, local execution, and local user-data retention. The previous Marian date duplication did not recur.

Quality findings only:

```text
"Target pengiriman paling lambat" → "The slowest delivery target"
"model terjemahan" → "translation models"
```

### STEP 2B — M2M100 Standalone Text EN → ID

`PASS correctness / QUALITY FINDING`

The old Marian first-sentence omission did not recur. The output retained all three source sentences, Mivubi / Younes / Clockwork, both dates, NVIDIA CUDA, local execution, and the user-data-local requirement.

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

### STEP 2C-A — Long / Multi-Paragraph ID → EN

`PASS correctness / QUALITY FINDING`

The 3-paragraph fixture retained all paragraph boundaries and all required factual/technical material:

```text
Mivubi / Clockwork / Younes
TranslateIT v2.4.1
18 August 2026 / 20 August 2026
1800 vs 2100 dollars
NVIDIA CUDA 12.6
192.168.1.20
https://example.com
3.14
09.30 / 3 September 2026
all user data remains local
no automatic cloud sending
explicit failure instead of presenting a truncated result as complete
```

Observed output remained complete across all 3 paragraphs. Quality wording findings only include phrases such as `records` for recordings and `cut results` for truncated results; these do not change the tested meaning or completeness.

## Acceptance Order

```text
1. Application / local worker startup                         PASS
2A. Standalone Text ID → EN                                  PASS correctness / quality finding
2B. Standalone Text EN → ID                                  PASS correctness / quality finding
2C-A. Long / multi-paragraph ID → EN                          PASS correctness / quality finding
2C-B. Long / multi-paragraph EN → ID                          ACTIVE NEXT
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

**Run STEP 2C-B on the already-open target Windows Tauri application using the corresponding long multi-paragraph English → Indonesian fixture. Record the full output and confirm that all 3 blank-line paragraphs, names, dates, numbers, version/IP/URL/decimal/CUDA facts, negation, local-only data rule, no-automatic-cloud rule, and explicit-failure/no-truncated-result meaning remain complete. If STEP 2C-B passes correctness, mark Standalone Text STEP 2 complete and advance to STEP 3 Microphone selection + Mic Test.**

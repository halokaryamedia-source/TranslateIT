# TranslateIT — Next Action

## Current Status

`MILMMT-46 v1.0 ONLY / SCENARIO A 1B BF16 / SCENARIO B 4B INT8 / SAME 24 REALISTIC CASES / NO M2M100 COMPARISON / NO TRANSLATEGEMMA COMPARISON / NO SHORT-CIRCUIT / NO SINGLE-ERROR REJECTION / PRODUCTION UNCHANGED`

Authority:

```text
Local      → current development authority
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

## Evaluation Scope

Only two translation scenarios remain active:

```text
Scenario A
MiLMMT-46-1B-v1.0
official Xiaomi checkpoint
BF16

Scenario B
MiLMMT-46-4B-v1.0
official Xiaomi checkpoint
bitsandbytes LLM.int8
BF16 non-quantized compute
```

M2M100 and TranslateGemma are not part of this evaluation. Their old reports may remain as historical evidence, but they must not add runtime, download, or review work to the MiLMMT 1B-vs-4B decision.

## Representative Test

Both scenarios run the exact same 24 Meeting/Text utterances from:

```text
tools/translation_quality/realtime_use_cases.json
```

Coverage:

```text
12 Indonesian -> English
12 English -> Indonesian
status updates
deadlines
clarification/correction
professional disagreement
conditional planning
technical handoff
numbers/IP/version facts
schedule
branch instruction
code switching
questions
scope constraints
recommendation/prohibition in normal context
```

Rules:

- run all 24 cases for both models unless the runtime itself cannot run;
- no semantic short-circuit;
- no one-error automatic rejection;
- references are review anchors, not exact-output assertions;
- compare semantic correctness, factual fidelity, naturalness, completeness, protected literals, chrF++/BLEU supporting metrics, latency p50/p90, and preload/VRAM evidence;
- choose between 1B and 4B from aggregate behavior, not release date or one sentence.

## Owners

```text
tools/translation_quality/realtime_use_cases.json
tools/translation_quality/milmmt_realtime_worker.py
tools/translation_quality/realtime_translation_ab.py
tools/translation_quality/run_milmmt_realtime_ab.ps1
```

The PowerShell wrapper uses a dedicated MiLMMT `.venv`; it does not reuse TranslateGemma or old model-specific evaluation environments.

Output:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/
├─ models/
│  ├─ milmmt_1b_model/
│  └─ milmmt_4b_model/
├─ milmmt_1b_revision.txt
├─ milmmt_4b_revision.txt
├─ milmmt_realtime_ab_report.json
└─ milmmt_realtime_ab_review.md
```

## Next Step

**Fast-forward `Local` and run `tools/translation_quality/run_milmmt_realtime_ab.ps1` once. The first run downloads only the official Xiaomi MiLMMT-46-1B-v1.0 and MiLMMT-46-4B-v1.0 checkpoints and pins their exact revisions. Return/upload `UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_realtime_ab_review.md`. Do not add another model or migrate production before the aggregate 1B-vs-4B review.**

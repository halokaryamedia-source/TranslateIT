# TranslateIT — Next Action

## Current Status

`MILMMT-46 v1.0 ONLY / 24-CASE 1B-vs-4B QUALITY RUN COMPLETE / BOTH 24/24 COMPLETE / CLEAN PERFORMANCE+VRAM RERUN NEXT BECAUSE ORIGINAL TARGET RUN STARTED WITH ~3.5 GB WHOLE-DEVICE VRAM ALREADY IN USE / NO MODEL DOWNLOAD / PRODUCTION UNCHANGED`

Authority:

```text
Local      → current development authority
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

## Active Scenarios

Only these two remain in scope:

```text
Scenario A
MiLMMT-46-1B-v1.0
BF16

Scenario B
MiLMMT-46-4B-v1.0
bitsandbytes LLM.int8
BF16 non-quantized compute
```

M2M100 and TranslateGemma are not part of this decision.

## Completed Quality Evidence

The representative 24-case run completed all cases for both MiLMMT models with no runtime failures.

The aggregate quality evidence remains valid because model generation is deterministic and the user's concern is specifically that other open GPU applications contaminated VRAM/performance measurements, not translation content.

Observed first-run performance evidence must **not** be treated as final hardware proof because whole-device GPU memory before model load was already approximately 3.5 GB for both scenarios. That can materially affect available VRAM and may affect latency under GPU contention.

Do not rerun the full 24-case quality suite merely to correct this hardware evidence.

## Clean Performance Rerun

Owners:

```text
tools/translation_quality/milmmt_clean_perf_rerun.py
tools/translation_quality/run_milmmt_clean_perf_rerun.ps1
```

The rerun:

```text
uses cached MiLMMT 1B + 4B models only
runs fully offline
requires GPU baseline <= 2048 MiB whole-device VRAM and <= 10% utilization
runs models sequentially so VRAM is released between scenarios
uses 6 representative utterances across both directions
runs 2 warmups per model
runs 3 measured repeats per utterance
records p50/p90/mean/max wall and inference latency
records framework + whole-device preload VRAM
checks repeated deterministic outputs remain identical
```

It does not download models, rerun the full quality suite, modify production, or add another candidate.

Output:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_clean_perf_rerun_report.json
```

## Decision Boundary

After the clean rerun, combine:

```text
existing 24-case aggregate quality review
+
clean performance/VRAM rerun
```

Then choose MiLMMT 1B or MiLMMT 4B. Do not choose from the contaminated first-run whole-device VRAM/latency evidence alone.

## Next Step

**Close avoidable GPU-heavy applications, fast-forward `Local`, then run `tools/translation_quality/run_milmmt_clean_perf_rerun.ps1` once. Return/upload `UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_clean_perf_rerun_report.json`. Do not redownload models or rerun the 24-case quality suite.**

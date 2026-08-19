# TranslateIT — Next Action

## Current Status

`MILMMT-46 v1.0 ONLY / 24-CASE 1B-vs-4B QUALITY RUN COMPLETE / CLEAN RTX 3070 PERFORMANCE+VRAM RERUN COMPLETE / ORIGINAL ~3.5 GB GPU-CONTAMINATED TIMINGS RETIRED / 1B REALTIME FIT LEADS / PRODUCTION UNCHANGED`

Authority:

```text
Local      → current development authority
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

## Active Scenarios

Only these two were evaluated:

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

## Quality Evidence

The representative 24-case run completed all cases for both MiLMMT models with no runtime failures. Preserve that run as the aggregate semantic/factual/naturalness review source.

Observed aggregate automatic metrics favored 4B, and human review found multiple cases where 4B wording/semantic fidelity was better. The quality run also showed that neither model is perfect; model size does not eliminate all semantic errors.

Do not rerun the 24-case quality suite unless the model/runtime behavior materially changes.

## Clean Performance / VRAM Evidence

The clean rerun started at an idle GPU baseline of approximately:

```text
848 MiB whole-device VRAM
6% GPU utilization
```

and returned to approximately 813–847 MiB after unload, so this run supersedes the earlier GPU-contaminated performance evidence.

### MiLMMT-46-1B-v1.0 BF16

```text
cold load                 2271 ms
framework allocated       ~1907 MiB
whole-device after load   ~2930 MiB
wall p50                  689 ms
wall p90                  1139 ms
wall mean                 791 ms
wall max                  1157 ms
18/18 samples successful
deterministic outputs     yes
```

### MiLMMT-46-4B-v1.0 INT8

```text
cold load                 11825 ms
framework allocated       ~4826 MiB
whole-device after load   ~5905 MiB
wall p50                  4516 ms
wall p90                  7036 ms
wall mean                 4896 ms
wall max                  7153 ms
18/18 samples successful
deterministic outputs     yes
```

On the same clean GPU, 4B remains approximately 6.2x slower than 1B at p50/p90/mean for the measured translation stage and consumes roughly 2.5x the framework model memory.

## Decision Boundary

For TranslateIT realtime use, the clean result materially strengthens MiLMMT-1B as the practical production candidate:

```text
1B
→ sub-second median translation stage
→ ~1.14 s p90
→ ~1.9 GiB framework model allocation
→ substantial RTX 3070 headroom for the remaining local AI pipeline

4B
→ aggregate translation quality is better
→ but ~4.5 s median / ~7.0 s p90 for translation alone
→ ~4.8 GiB framework allocation
→ substantially less RTX 3070 headroom
```

Do not call 4B unusable from the contaminated first run; the clean run proves it is much faster than first observed. However, under the tested INT8 runtime it still does not fit the intended realtime latency envelope as well as 1B.

No new translation model should be introduced automatically. Production is still unchanged until the selected MiLMMT candidate receives the next integration/end-to-end proof.

## Next Step

**Use MiLMMT-46-1B-v1.0 BF16 as the production migration candidate and prepare one bounded end-to-end local proof through the existing TranslateIT AI pipeline. Preserve MiLMMT-4B as comparison evidence only; do not download another translator or rerun the 24-case suite.**

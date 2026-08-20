# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 BF16 SELECTED / LATENCY OPTIMIZATION CLOSED / DEFAULT SDPA + DEFAULT CACHE SELECTED / STATICCACHE REJECTED FOR OUTPUT CHANGE + NO SPEED WIN / CANONICAL WORKERRUNTIME COMPATIBILITY PROOF NEXT / PRODUCTION SOURCE UNCHANGED`

Authority:

```text
Local      → current development authority
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

Detailed continuation and target-PC procedure:

```text
docs/knowledge/milmmt-1b-runtime-validation.md
```

## Selected Translator

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
BF16
CUDA
official Xiaomi translation prompt
deterministic generation
```

MiLMMT-46-4B-v1.0 remains comparison evidence only. Do not reopen model search automatically.

## Closed Latency Optimization Decision

Target-PC optimization report:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_1b_latency_optimization_report.json
```

The safe selected execution configuration is:

```text
MiLMMT-1B BF16
PyTorch / Transformers
SDPA attention (already active by default)
default/dynamic generation cache
no StaticCache
no torch.compile
no quantization
no alternate backend
```

Observed production-like representative performance:

```text
p50  674.51 ms
p90  1133.81 ms
```

This was only ~2.1% faster at p50 and ~0.5% faster at p90 than the prior clean authority (689.11 / 1139.34 ms), so the improvement is not large enough to justify additional runtime complexity.

StaticCache was rejected because:

```text
p50  723.97 ms   (slower)
p90  1169.84 ms  (slower)
output changed on meeting.en_id.12.scope
```

The compile variant was correctly skipped after StaticCache failed the same-quality prerequisite. Do not continue cache/compile tuning.

## Migration Compatibility Gap

Before changing the canonical worker, one concrete compatibility difference must be resolved:

```text
MiLMMT quality/latency evaluation runtime
→ transformers 4.57.6

canonical WorkerRuntime project constraint
→ transformers >=4.44.0, <=4.50.0
```

Do not change the dependency lock speculatively. First prove whether the selected MiLMMT checkpoint produces the same 24 deterministic translations under the **current frozen WorkerRuntime environment**.

Implemented proof owners:

```text
tools/translation_quality/milmmt_1b_workerruntime_compatibility.py
tools/translation_quality/run_milmmt_1b_workerruntime_compatibility.ps1
```

The proof:

```text
uses the existing cached MiLMMT-1B checkpoint only
runs fully offline for model access
executes through `uv run --frozen --no-dev` from WorkerRuntime
records actual Python / torch / transformers runtime from preload
runs all existing 24 representative cases once
requires 24/24 success
requires 24/24 exact output equality with selected MiLMMT-1B evidence
uses clean-GPU gate <=2048 MiB and <=10% utilization
writes one JSON report
```

Decision after compatibility proof:

```text
WORKERRUNTIME_COMPATIBLE
→ keep current dependency lock
→ migrate MiLMMT-1B into canonical realtime_local_worker.py + model manifest
→ stage the cached exact-revision model into RuntimeAssets
→ run canonical translation/end-to-end target proof

compatibility failure / changed output / unsupported model
→ diagnose exact WorkerRuntime dependency gap
→ update dependency matrix only as required
→ do not create alternate production runtime
```

## Target-PC Execution Rule

User execution remains one complete PowerShell block. The wrapper owns path checks, frozen WorkerRuntime execution, offline model access, clean-GPU gating, deterministic comparison, and report output.

Expected compatibility report:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_1b_workerruntime_compatibility_report.json
```

## Next Step

**Fast-forward `Local`, close avoidable GPU-heavy applications, and run `tools/translation_quality/run_milmmt_1b_workerruntime_compatibility.ps1` once. Return/upload `UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_1b_workerruntime_compatibility_report.json`. Do not modify the WorkerRuntime dependency lock, production worker, model manifest, or introduce another translator until this one compatibility result is reviewed.**

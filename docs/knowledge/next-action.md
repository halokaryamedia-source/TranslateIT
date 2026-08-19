# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 BF16 SELECTED / 4B COMPARISON ONLY / CLEAN RTX 3070 PERFORMANCE AUTHORITY / SAME-MODEL LATENCY OPTIMIZATION HARNESS READY / ONE-COPY POWERSHELL TARGET-PC RUN NEXT / PRODUCTION UNCHANGED`

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

The selected migration target is:

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
BF16
CUDA
official Xiaomi translation prompt
deterministic generation
```

MiLMMT-46-4B-v1.0 is comparison evidence only. Do not automatically reopen 4B or introduce another translator.

Production is still unchanged. M2M100 remains the current production translator until MiLMMT-1B integration and target end-to-end proof are complete; it is not intended to remain as a fallback/router after accepted migration.

## Valid Evidence

The 24-case Meeting/Text quality review remains the aggregate translation-quality authority.

The clean RTX 3070 performance rerun supersedes the earlier GPU-contaminated timing/whole-device VRAM observations.

Selected MiLMMT-1B BF16 clean baseline:

```text
cold load                 2271 ms
framework allocated       ~1907 MiB
whole-device after load   ~2930 MiB
wall p50                  689 ms
wall p90                  1139 ms
wall mean                 791 ms
wall max                  1157 ms
inference p50             654 ms
inference p90             1097 ms
18/18 samples successful
deterministic outputs     yes
```

Do not rerun the original 1B-vs-4B model selection or clean baseline merely for reassurance.

## Latency Optimization Harness

Implemented owners:

```text
tools/translation_quality/milmmt_1b_latency_optimization.py
tools/translation_quality/run_milmmt_1b_latency_optimization.ps1
```

Fixed quality contract:

```text
same pinned MiLMMT-1B checkpoint
same BF16 precision
same official prompt
same deterministic translation intent
no quantization
no alternate model
no output post-processing
no fallback/router
```

The harness runs fully offline against the existing cached 1B model and existing quality/performance evidence. It does not download a model or modify production.

Evaluation order:

```text
1. production-like baseline without per-request nvidia-smi / explicit synchronize instrumentation
2. verify actual attention backend; skip duplicate explicit-SDPA run if baseline already reports SDPA
3. StaticCache with compile disabled
4. StaticCache + Transformers automatic compile configured for reduce-overhead when the cache path is valid
```

Candidate work is staged:

```text
representative performance subset first
→ exact subset output equality
→ >=5% p50 gain and <=5% p90 regression
→ only then full 24-case exact-output equality
```

Any unsupported Windows/CUDA compile/cache path is recorded and skipped; do not add another backend to rescue it.

If no candidate proves a material same-quality gain, the production-like MiLMMT-1B BF16 baseline remains the selected execution configuration.

## Target-PC Execution Rule

The next proof must run on the actual target Windows PC with avoidable GPU-heavy applications closed.

Clean-GPU gate:

```text
whole-device VRAM <= 2048 MiB
GPU utilization   <= 10%
```

The user receives one complete pasteable PowerShell block. The wrapper owns path checks, cache/evidence validation, offline flags, GPU gate, execution, and report path.

Expected report:

```text
UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_1b_latency_optimization_report.json
```

After the report is reviewed, choose one execution configuration. Then migrate MiLMMT-1B into the canonical production translation owner, retire M2M100 from the normal path, and run the bounded end-to-end ASR → MiLMMT-1B → GPT-SoVITS target-PC proof.

## Next Step

**Fast-forward `Local`, close avoidable GPU-heavy applications, and run `tools/translation_quality/run_milmmt_1b_latency_optimization.ps1` once on the target PC. Return/upload `UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_1b_latency_optimization_report.json`. Do not migrate production, redownload models, or add another translator before this optimization evidence is reviewed.**

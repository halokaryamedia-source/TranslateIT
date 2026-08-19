# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 BF16 SELECTED / 4B RETIRED TO COMPARISON EVIDENCE / CLEAN RTX 3070 PERFORMANCE AUTHORITY / SAME-MODEL LATENCY OPTIMIZATION MAY PROCEED ONLY WITH QUALITY EQUIVALENCE / PRODUCTION UNCHANGED`

Authority:

```text
Local      → current development authority
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

## Selected Translator

The user selected:

```text
MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
BF16
CUDA
original official Xiaomi translation prompt
fully deterministic generation
```

MiLMMT-46-4B-v1.0 is no longer an active migration candidate. Preserve its quality/performance report only as comparison evidence. Do not introduce another translator automatically.

## Quality Evidence

The 24-case representative Meeting/Text run remains the aggregate semantic/factual/naturalness review source. MiLMMT-1B completed all 24 cases. The selected model is not perfect, but it is the approved model choice for the realtime product boundary.

Any latency optimization must keep the same MiLMMT-1B checkpoint, BF16 weights/compute, official translation prompt, deterministic decoding intent, and translation semantics. Do not use quantization, smaller replacement models, phrase-specific repair, alternate output rewriting, or a model router merely to reduce latency.

## Clean Performance Authority

The clean RTX 3070 rerun started near 848 MiB whole-device VRAM / 6% GPU utilization and returned to idle after unload.

Selected MiLMMT-1B BF16 measured:

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

The approximately 35 ms median gap between wall time and measured inference shows that benchmark/runtime instrumentation contributes some avoidable non-model overhead, but most remaining latency is generation compute.

## Same-Quality Latency Optimization Boundary

Before production migration, one bounded execution-only optimization pass may compare the selected baseline against low-risk same-model runtime changes. Order of interest:

```text
1. remove benchmark-only per-request synchronization / nvidia-smi diagnostics from the eventual production hot path
2. verify the active attention backend; retain/explicitly request PyTorch SDPA if already equivalent
3. evaluate Static KV Cache + torch.compile(reduce-overhead) on the persistent CUDA runtime
4. use a stable bounded generation/cache shape only if required to avoid recompilation
```

Quality protection for every optimization candidate:

```text
same pinned MiLMMT-1B checkpoint
same BF16 precision
same official prompt
same source text and direction
no output post-processing
all 24 representative translations must remain semantically equivalent
prefer exact output equality; any changed output requires full semantic review before acceptance
```

Do not adopt FlashAttention packages, vLLM, TensorRT, CTranslate2, FP16, INT8/INT4, speculative second models, or a new backend merely because it may benchmark faster. Those are outside the first optimization pass and need separate evidence if ever justified.

## Next Step

**Prepare one isolated same-model latency optimization benchmark for MiLMMT-46-1B-v1.0 BF16, starting with production-hot-path instrumentation removal and Static KV Cache + `torch.compile(mode="reduce-overhead")`. Compare against the clean 689 ms p50 / 1139 ms p90 baseline and require unchanged translation quality before any runtime change is adopted. Production remains unchanged until that proof passes.**

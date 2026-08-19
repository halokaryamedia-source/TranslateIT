# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 BF16 SELECTED / 4B COMPARISON ONLY / CLEAN RTX 3070 PERFORMANCE AUTHORITY / SAME-MODEL LATENCY OPTIMIZATION NEXT / ONE-COPY POWERSHELL TARGET-PC WORKFLOW RECORDED / PRODUCTION UNCHANGED`

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

The 24-case Meeting/Text quality review remains the aggregate translation-quality evidence.

The **clean** RTX 3070 performance rerun supersedes the earlier GPU-contaminated timing/whole-device VRAM observations.

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

Do not rerun the 24-case quality suite or clean baseline merely for reassurance. Re-run only when the runtime behavior/configuration materially changes or evidence is invalidated.

## Same-Quality Latency Optimization Boundary

Before production migration, run one bounded execution-only optimization pass on the **same selected model**.

Fixed quality contract:

```text
same pinned MiLMMT-1B checkpoint
same BF16 precision
same official prompt
same deterministic translation intent
no quantization
no smaller/alternate model
no output post-processing
no fallback/router
```

Optimization order:

```text
1. production-like hot path without benchmark-only per-request diagnostics
2. verify/retain native PyTorch SDPA + normal KV cache behavior
3. evaluate Static KV Cache + torch.compile(mode="reduce-overhead") only if target Windows/CUDA capability is stable
4. keep one final runtime configuration; benchmark variants are not product profiles
```

Quality gate:

```text
prefer 24/24 exact output equality against selected baseline
any changed output → manual semantic/factual/naturalness review
speedup with quality regression → reject optimization
```

If no optimization gives a repeatable material gain without extra complexity or quality risk, keep the clean baseline configuration and proceed. Do not block the project indefinitely for micro-optimizations.

## Target-PC Execution Rule

All target-PC runs requested from the user should be delivered as **one complete pasteable PowerShell block** using a repository-owned `.ps1` wrapper.

Normal shape:

```powershell
Set-Location "D:\Work\AI Stuff\TranslateIT"

git fetch origin Local
git merge --ff-only origin/Local

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\<EXACT_RUNNER>.ps1
```

The wrapper should own environment checks, CUDA/GPU checks, clean-GPU gating where performance is measured, model/cache validation, execution, and report paths. Do not ask the user to run fragmented shell commands or share tokens/secrets.

For performance proof, preserve the clean-GPU gate unless new evidence changes it:

```text
whole-device VRAM <= 2048 MiB
GPU utilization   <= 10%
```

Detailed operator rules and session-recovery instructions are in `docs/knowledge/milmmt-1b-runtime-validation.md`.

## Next Step

**Implement one isolated MiLMMT-46-1B-v1.0 BF16 latency-optimization benchmark with a repository-owned one-copy PowerShell runner. Compare the production-like baseline against only low-risk same-model execution variants, preserve the clean 689 ms p50 / 1139 ms p90 authority, and require unchanged translation quality before adopting any optimization. Do not migrate production, redownload models, or add another translator before this proof.**

# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CANONICAL / REPO-SIDE TRANSLATION MIGRATION + CLEANUP CLOSED / WORKERRUNTIME TRANSFORMERS 4.57.6 + TOKENIZERS 0.22.2 CANONICAL / MANIFEST-OWNED RELEASE PACKAGING / TARGET-PC ACCEPTANCE DEFERRED`

## Active Boundary

- `Local` is the current development authority.
- `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- Canonical translator is `xiaomi-research/MiLMMT-46-1B-v1.0` at revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995`.
- One resident causal model owns Indonesian ↔ English translation with CUDA BF16 primary execution, the official Xiaomi prompt, deterministic generation, continuation-only decoding, and fail-closed incomplete output.
- Canonical WorkerRuntime dependency authority is Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2.
- M2M100, Marian, Transformers 4.50.0, and retired helper paths may remain only as clearly historical evidence or explicit negative guards; they are not active runtime, dependency, release, test, or current-authority paths.
- The **R3 packaging boundary** remains active: one automatic offline Setup plus colocated external payload direction. Packaging/release hardening is the next repository milestone.
- Target-PC GPU/audio/installed-runtime/clean-machine acceptance remains deferred until explicitly requested.

## Repo-side MiLMMT cleanup closed

- `realtime_local_worker.py` is the only application-facing worker entrypoint.
- `realtime_local_worker_base.py`, `worker_runtime_common.py`, and `worker_io_runtime.py` own translation-neutral protocol/common/ASR/Voice responsibilities.
- `milmmt_translation_provider.py` is the only canonical translation implementation.
- Legacy M2M translation core/test substrate is removed.
- RuntimeAssets and release staging are manifest-owned and require exact `.translateit_model_revision` evidence.
- Release resource/package contracts explicitly carry and validate the canonical worker module closure.
- `pyproject.toml` and `uv.lock` agree on Transformers 4.57.6; the lock resolves Tokenizers 0.22.2 while retaining Torch 2.11.0/cu126.
- Tokenizers 0.22.2 release-license material is pinned to the exact lock-resolved sdist.
- Repo/static gates cover MiLMMT identity, dependency-lock consistency, release boundary, active tests, governance routing, and retired migration-path absence.
- The former 4.50.0 compatibility result remains historical evidence only: 24/24 executable, 16/24 exact, 8 deterministic output changes, materially slower than the selected 4.57.6 authority.

## Closed Optimization Boundary

Keep MiLMMT-1B, CUDA BF16, PyTorch/Transformers, default SDPA/attention path, default generation cache, and a persistent loaded model. Do not add StaticCache, `torch.compile`, speed-only quantization, alternate inference backends, speculative decoding, a second translator, or phrase rewriting without a new explicit decision and new evidence.

## Next Step

**Continue R3 packaging-boundary development and release hardening from the current canonical MiLMMT state. Do not run target-PC/GPU/audio/installed-runtime acceptance until explicitly requested.**

# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CANONICAL / LEGACY TRANSLATOR RUNTIME + RELEASE PATHS REMOVED / MANIFEST-OWNED PACKAGING / WORKERRUNTIME TRANSFORMERS 4.57.6 CANONICAL LOCK RESOLVED / TOKENIZERS 0.22.2 LICENSE MATERIAL SYNCHRONIZED / TARGET-PC TESTING DEFERRED`

## Canonical translator

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
ID ↔ EN
one resident causal model
CUDA BF16 primary
PyTorch / Transformers 4.57.6
official Xiaomi prompt
deterministic generation
```

Do not reopen model search or introduce M2M100/Marian/another translator as fallback.

## Repo-side migration completed

- `realtime_local_worker.py` is the only application-facing worker entrypoint;
- `realtime_local_worker_base.py`, `worker_runtime_common.py`, and `worker_io_runtime.py` own translation-neutral protocol/common/ASR/Voice responsibilities;
- `milmmt_translation_provider.py` is the only canonical translation implementation;
- the legacy translation core and legacy test substrate are removed;
- RuntimeAssets and release staging use the exact MiLMMT manifest revision and revision marker;
- release resource/package contracts explicitly package and validate the canonical worker module closure;
- `pyproject.toml` pins `transformers==4.57.6`;
- canonical `uv.lock` resolves Transformers 4.57.6 and Tokenizers 0.22.2 while retaining the reviewed Torch 2.11.0 / CUDA 12.6 boundary;
- Tokenizers 0.22.2 release-license staging is pinned to the exact lock-resolved sdist; its Apache-2.0 LICENSE bytes are unchanged from the previously reviewed 0.21.4 material;
- repo/static validation owns dependency-lock, runtime, packaging, manifest, and stale active-translation gates.

## Historical compatibility evidence

The retired WorkerRuntime 4.50.0 boundary remains evidence only:

```text
preload                PASS
24 representative runs PASS
exact authority match  16/24
changed outputs         8/24
failed outputs          0
p50                     3276.30 ms
p90                     4012.25 ms
```

The selected MiLMMT authority under Transformers 4.57.6 measured approximately:

```text
p50 674.51 ms
p90 1133.81 ms
```

No target-PC rerun is requested during the current repo-cleanup phase.

## Closed optimization boundary

Keep MiLMMT-1B, CUDA BF16, PyTorch/Transformers, default SDPA/attention path, default generation cache, and a persistent loaded model. Do not add StaticCache, `torch.compile`, speed-only quantization, alternate inference backends, speculative decoding, a second translator, or phrase rewriting.

## Next Step

**Run the final repo-only stale-reference and release/source-contract sweep. Retired M2M100/Marian/Transformers-4.50 references may remain only where explicitly historical evidence or migration metadata requires them; no active runtime, packaging, test, dependency, or current-authority owner may point to them. Then close repo-side MiLMMT cleanup and keep target-PC/runtime acceptance deferred until explicitly requested.**

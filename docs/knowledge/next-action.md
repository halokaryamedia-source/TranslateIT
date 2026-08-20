# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CANONICAL / RELEASE PACKAGING MANIFEST-OWNED / LEGACY M2M WORKER CORE REMOVED / PACKAGED WORKER MODULE CLOSURE EXPLICIT / WORKERRUNTIME 4.50 EXECUTION PROVEN 24/24 BUT 8 OUTPUTS DRIFT + LARGE LATENCY REGRESSION / TARGET-PC TESTING DEFERRED`

## Canonical translator

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
ID ↔ EN
one resident causal model
CUDA BF16 primary
PyTorch / Transformers
official Xiaomi prompt
deterministic generation
```

Do not reopen model search or introduce M2M100/Marian/another translator as fallback.

## Repo-side migration completed

- canonical entrypoint is `realtime_local_worker.py`;
- translation-neutral protocol/runtime base is `realtime_local_worker_base.py`;
- common path/device/token helpers are in `worker_runtime_common.py`;
- ASR and Voice Actor runtime state/commands are in `worker_io_runtime.py`;
- `milmmt_translation_provider.py` is the only canonical translation implementation;
- the legacy `realtime_local_worker_core.py` and `_test_worker_contract_core.py` bridge substrate are removed;
- one resident causal model services ID → EN and EN → ID;
- translation decodes continuation only and rejects non-EOS/incomplete output;
- RuntimeAssets manifest pins the exact MiLMMT revision and Gemma license metadata;
- acquisition writes `.translateit_model_revision` and readiness requires the exact marker;
- release staging acquires required Hugging Face assets from `model_manifest.json`, not a separate translator list;
- release package validation requires MiLMMT and the packaged base/common/io/provider closure;
- canonical smoke uses `voice_actor_preflight` and `voice_actor_synthesize`;
- repo/static MiLMMT validation covers runtime, packaging, manifest, tests, and dependency-lock consistency.

## Compatibility evidence already obtained

Current frozen WorkerRuntime (`transformers 4.50.0`):

```text
preload                PASS
24 representative runs PASS
exact authority match  16/24
changed outputs         8/24
failed outputs          0
p50                     3276.30 ms
p90                     4012.25 ms
```

Validated MiLMMT runtime authority (`transformers 4.57.6`):

```text
p50 674.51 ms
p90 1133.81 ms
```

Therefore 4.50.0 is executable/reproducible evidence, not final performance/quality authority.

## Closed optimization boundary

Keep MiLMMT-1B, CUDA BF16, PyTorch/Transformers, default SDPA/attention path, default generation cache, and a persistent loaded model. Do not add StaticCache, torch.compile, speed-only quantization, alternate inference backends, speculative decoding, a second translator, or phrase rewriting.

## Next Step

**Continue repo-only convergence. First complete the active stale-reference/ownership sweep so no production/runtime/release owner points at retired M2M100 or Marian behavior. Then migrate the frozen WorkerRuntime dependency boundary from Transformers 4.50.0 to the validated 4.57.6 authority only through a canonical regenerated `uv.lock`, with `pyproject.toml`, `uv.lock`, CI contracts, release Python closure, and documentation changed together. Do not request target-PC execution until explicitly requested.**

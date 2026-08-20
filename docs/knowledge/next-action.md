# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 SELECTED / LATENCY TUNING CLOSED / WORKERRUNTIME 4.50 EXECUTION PROVEN 24/24 BUT 8 OUTPUTS DRIFT + LARGE LATENCY REGRESSION / CANONICAL MILMMT REPO MIGRATION READY AS COMMIT 1c6c32f / TARGET-PC TESTING DEFERRED`

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

Validated MiLMMT runtime authority (`transformers 4.57.6`) remains approximately:

```text
p50 674.51 ms
p90 1133.81 ms
```

Therefore 4.50.0 is executable evidence, not final performance/quality authority. Dependency migration to 4.57.6 must be done only with a canonical regenerated `uv.lock`; do not hand-edit or leave `pyproject.toml` and `uv.lock` inconsistent.

## Repo-side migration implemented

- canonical worker entrypoint installs the MiLMMT provider before dispatch;
- one resident causal model services ID → EN and EN → ID;
- translation decodes continuation only and rejects non-EOS/incomplete output;
- RuntimeAssets manifest pins the exact MiLMMT revision and Gemma license metadata;
- acquisition writes `.translateit_model_revision` and readiness requires the exact marker;
- M2M-specific active test expectations are replaced by MiLMMT contracts while unrelated worker tests remain preserved;
- canonical smoke uses `voice_actor_preflight` and `voice_actor_synthesize`;
- `pyproject.toml` and `uv.lock` remain unchanged and internally consistent at the current 4.50.0 boundary.

## Closed optimization boundary

Keep MiLMMT-1B, CUDA BF16, PyTorch/Transformers, default SDPA/attention path, default generation cache, and a persistent loaded model. Do not add StaticCache, torch.compile, speed-only quantization, alternate inference backends, speculative decoding, a second translator, or phrase rewriting.

## Next Step

**Do not request target-PC execution yet. The next repo-side development slice is to remove the temporary preserved-core bridge by folding the MiLMMT provider cleanly into the canonical WorkerRuntime source, then run repository/static contract validation. After that, migrate the frozen dependency lock to the validated Transformers 4.57.6 boundary using a canonical `uv lock` environment. Runtime/GPU/latency acceptance remains deferred until explicitly requested.**

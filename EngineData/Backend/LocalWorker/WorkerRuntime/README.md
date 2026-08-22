# Backend Local Worker Runtime

This folder owns TranslateIT's single Python inference worker used by the Tauri/Rust application.

## Process

```text
realtime_local_worker.py
├─ realtime_local_worker_base.py
│  ├─ worker_runtime_common.py
│  └─ worker_io_runtime.py
└─ milmmt_translation_provider.py
```

`realtime_local_worker.py` is the only application-facing worker entrypoint. The supporting modules split responsibilities without creating another process or runtime:

- `realtime_local_worker_base.py`: newline-JSON protocol, status composition, command dispatch, standalone Text orchestration;
- `worker_runtime_common.py`: paths, limits, language normalization, GPU/device probes, generic token/completion helpers;
- `worker_io_runtime.py`: Faster Whisper ASR and GPT-SoVITS My Voice inference state/commands;
- `milmmt_translation_provider.py`: Indonesian ↔ English MiLMMT translation behavior.

The worker exposes:

```text
status
asr_preload
transcribe
translation_preload
translate
voice_actor_preflight
voice_actor_synthesize
```

Rust remains the Meeting/session/audio owner. The Python worker does not own Windows virtual-audio routing or a second product architecture.

## Translation

Translator:

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
one resident causal model
ID → EN and EN → ID
CUDA BF16 primary
CPU fallback = explicit degraded operation
```

Production rules:

- official Xiaomi translation prompt;
- deterministic `do_sample=false`;
- continuation-only causal decoding;
- source is never silently truncated;
- known incomplete/non-EOS generation fails closed;
- RuntimeAssets readiness requires `.translateit_model_revision` to match the exact pinned revision;
- no M2M100/Marian/second-translator fallback or router;
- no dormant legacy translation implementation in the active worker base.

## ASR and My Voice

- ASR primary: Faster Whisper Large V3 Turbo.
- Optional ASR fallback: Faster Whisper Medium.
- My Voice inference: GPT-SoVITS V2ProPlus trained `MyVoice` package.
- Worker command names remain `voice_actor_preflight` and `voice_actor_synthesize`.
- Existing `voice_lab_*` Python filenames/error namespaces are legacy internal compatibility identifiers. New product-facing terminology is **My Voice**; changing those identifiers requires an explicit protocol/storage migration rather than a cosmetic rename.

## Dependencies

```text
pyproject.toml  = dependency intent
uv.lock         = resolved dependency graph
.python-version = developer Python pin
```

Normal setup consumes the lock frozen. Do not edit `pyproject.toml` without regenerating and reviewing `uv.lock` in the same dependency change.

Current dependency versions:

```text
Python       3.12.x
PyTorch      2.11.0 / 2.11.0+cu126 on Windows/Linux CUDA path
Transformers 4.57.6 exact pin
Tokenizers   0.22.2 resolved by uv.lock
Accelerate   1.14.0 resolved by uv.lock and retained in release payload
```

Transformers 4.57.6 is the validated MiLMMT runtime version. The former 4.50.0 compatibility result remains historical evidence only. `pyproject.toml`, `uv.lock`, release-license material, and repository validation must stay synchronized with the current runtime graph.

## Developer checks

Repository-only MiLMMT validation does not require model/GPU inference:

```powershell
python tools/translation_quality/validate_canonical_milmmt_repo.py
```

From WorkerRuntime with the frozen developer environment available:

```powershell
uv sync --frozen
uv run --frozen ruff check .
uv run --frozen ruff format --check .
uv run --frozen pytest
```

Runtime smoke, when target-PC validation is explicitly resumed:

```powershell
.\run_realtime_worker_smoke.ps1 -ExpectedDevice Cuda
```

Static/CI success does not prove real CUDA latency, VRAM, linguistic quality, My Voice speaker quality, microphone behavior, virtual-audio delivery, or clean-machine installation.

## Model acquisition

`model_manifest.json` is the model inventory. `prepare_model_assets.py` validates full 40-character revisions, stages Hugging Face snapshots atomically, and writes a revision marker after successful replacement.

```powershell
uv run --frozen python prepare_model_assets.py --plan
uv run --frozen python prepare_model_assets.py
```

Release staging consumes the same manifest-owned acquisition path for required Hugging Face assets. Manual release assets such as GPT-SoVITS remain separate controlled payload inputs.

## Packaging

`tauri.release.conf.json` packages the worker entrypoint and its required supporting modules explicitly. Release checks validate model revisions and the exact packaged runtime closure before building.

## Runtime rules

- one persistent Python AI worker;
- one dependency project/lock;
- one Indonesian ↔ English translation model;
- one approved My Voice inference path;
- no hidden CPU retry after a CUDA probe/load failure;
- model presence is not model correctness without exact revision evidence;
- output without verifiable completion is not successful output;
- repository/hosted checks and target-PC checks remain separate.

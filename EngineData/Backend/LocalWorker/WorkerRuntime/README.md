# Backend Local Worker Runtime

This folder owns TranslateIT's one canonical Python inference worker used by the Tauri/Rust application.

## Canonical process

```text
realtime_local_worker.py
```

The worker uses newline-delimited JSON over stdin/stdout and owns these application-facing capabilities:

```text
status
asr_preload
transcribe
translation_preload
translate
voice_actor_preflight
voice_actor_synthesize
```

Rust remains the Meeting/session/audio authority. The Python worker does not own Windows virtual-audio routing or a second product architecture.

## Translation

Canonical translator:

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
one resident causal model
ID → EN and EN → ID
CUDA BF16 primary
CPU fallback explicit degraded operation
```

Production rules:

- official Xiaomi translation prompt;
- deterministic `do_sample=false`;
- continuation-only causal decoding;
- source is never silently truncated;
- known incomplete/non-EOS generation fails closed;
- RuntimeAssets readiness requires `.translateit_model_revision` to match the exact pinned revision;
- no M2M100/Marian/second-translator fallback or router.

The canonical entrypoint currently installs `milmmt_translation_provider.py` over the preserved worker core so ASR/VoiceLab behavior remains unchanged during the migration. The preserved core is implementation substrate, not a second runtime or translation fallback.

## ASR and Voice Actor

- ASR primary: Faster Whisper Large V3 Turbo.
- Optional ASR fallback: Faster Whisper Medium.
- Voice Actor: GPT-SoVITS V2ProPlus trained `MyVoice` package.
- Command names are `voice_actor_preflight` and `voice_actor_synthesize`; retired `tts_preflight` / `synthesize` aliases are not canonical.

## Dependency authority

```text
pyproject.toml  = dependency intent
uv.lock         = canonical resolved graph
.python-version = developer Python pin
```

Normal setup consumes the lock frozen. Do not edit `pyproject.toml` without regenerating and reviewing `uv.lock` in the same dependency change.

Current migration boundary intentionally remains:

```text
Python       3.12.x
PyTorch      2.11.0 / 2.11.0+cu126 on Windows/Linux CUDA path
Transformers 4.50.0 in the frozen canonical lock
```

The selected MiLMMT quality/latency authority was measured on Transformers 4.57.6. Compatibility proof established that 4.50.0 executes all 24 representative cases but changes 8 deterministic outputs and is materially slower. Therefore 4.50.0 is current reproducible execution state, not final performance authority. Move to 4.57.6 only with a canonical regenerated `uv.lock`.

## Developer proof

Repo-only contract validation does not require model/GPU inference:

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

Canonical runtime smoke, when target-PC validation is explicitly resumed:

```powershell
.\run_realtime_worker_smoke.ps1 -ExpectedDevice Cuda
```

Do not generalize static/CI success into claims about real CUDA latency, VRAM, linguistic quality, trained-speaker quality, microphone behavior, virtual-audio delivery, or clean-machine installation.

## Model acquisition

`model_manifest.json` is the immutable model inventory. `prepare_model_assets.py` validates full 40-character revisions, stages Hugging Face snapshots atomically, and writes a revision marker after successful replacement.

```powershell
uv run --frozen python prepare_model_assets.py --plan
uv run --frozen python prepare_model_assets.py
```

Manual release assets such as GPT-SoVITS remain separate controlled payloads and are not fabricated by the Hugging Face downloader.

## Truth rules

- one persistent Python AI worker;
- one dependency project/lock;
- one canonical translation model;
- no hidden CPU retry after a CUDA probe/load failure;
- model presence is not model correctness without exact revision evidence;
- output without verifiable completion is not successful output;
- repo proof and target-PC proof remain separate.

# Backend Local Worker Runtime

This folder contains the backend-owned Python runtime used by the current Tauri desktop application.

## Runtime Contract

The canonical AI worker is:

```text
realtime_local_worker.py
```

It communicates through newline-delimited JSON on stdin/stdout. Each command returns one JSON object and does not claim product or release readiness by itself.

Supported commands:

- `status`
- `asr_preload`
- `transcribe`
- `translation_preload`
- `translate`
- `tts_preflight`
- `synthesize`

Product mode ownership is caller-scoped:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

The worker must not silently switch translation mode merely to obtain output.

Translation output is also fail-closed: a generated result is not promoted as successful unless normal end-of-sequence completion can be verified. A result that ends without EOS, including one that reaches the requested token ceiling, remains blocked instead of becoming Text/TTS output.

## Canonical Python Project

`pyproject.toml` is the WorkerRuntime dependency-intent and Python tooling owner. The committed `uv.lock` is the canonical resolved dependency graph for that project. Normal setup must consume the lock rather than resolving version ranges again.

The Python project contains only local-AI/TTS runtime dependencies. Meeting audio delivery is not a Python WorkerRuntime responsibility: `synthesize` produces the bounded WAV handoff and the Rust Windows-audio owner renders that WAV to the prepared virtual-cable output endpoint. No `sounddevice` route provider or second Python audio owner remains active.

`requirements-realtime.txt` and `requirements-virtual-audio-route.txt` are retired. Do not recreate requirements files as parallel dependency authorities.

When dependencies intentionally change, edit `pyproject.toml`, run `uv lock`, review the lock diff, and commit the project + lock together. End-user/runtime setup must not regenerate the lock.

`setup_realtime_worker.ps1` is a developer helper that uses `uv` and the canonical project. `uv` is developer/build tooling only; the installed TranslateIT product must not require the end user to install or operate `uv`.

### Windows CUDA matrix

The canonical pre-local Windows AI matrix is deliberately one environment, not separate CUDA and CPU projects:

```text
CPython developer baseline -> 3.12.10
PyTorch                    -> 2.13.0+cu126 from the official PyTorch cu126 index
CTranslate2                -> 4.8.1
CUDA target                -> 12.6 / CUDA 12.x-compatible NVIDIA driver
```

`.python-version` pins the developer interpreter while `requires-python` keeps the project on Python 3.12. The CUDA-enabled PyTorch wheel is also the CPU degraded-path environment; TranslateIT does not maintain a second CPU dependency lock. CTranslate2 remains on its Windows x86-64 wheel with CUDA 12.x GPU support. Actual GPU execution still requires target-Windows proof.

CPU fallback is selected only after the canonical CUDA probes successfully report that CUDA is unavailable. A CUDA probe failure, CUDA-selected ASR model-load failure, or CUDA-selected translation model-move failure remains a truthful blocker and is not retried on CPU.

## Developer Commands

From this folder, after `uv` is available:

```powershell
# Runtime environment only
uv sync --frozen --no-dev

# Runtime + developer proof tools
uv sync --frozen

# Static Python quality checks
uv run --frozen ruff check .
uv run --frozen ruff format --check .

# Deterministic worker/protocol checks
uv run --frozen pytest
```

These commands are development proof only. A successful Ruff/pytest run does not prove model quality, CUDA execution, translation accuracy, audio delivery, or latency.

Windows route behavior remains owned by the Windows-audio boundary and still requires real device/runtime proof; dependency installation alone does not prove a route.

## Profiling

`py-spy` is the first-line local profiler for performance investigation of the **actual long-lived `realtime_local_worker.py` process**. It is deliberately not a WorkerRuntime dependency because profiling is an operator/development activity, not product runtime behavior.

Example after locating the persistent worker PID:

```powershell
uvx py-spy record --pid <WORKER_PID> -o .tmp/translateit-worker-profile.svg
```

Profile the canonical persistent process under the workload being investigated. Do not profile a one-shot helper and generalize the result to product runtime. Profiling evidence is configuration/run-specific and does not prove model quality.

## Current Local Stack

| Stage | Realtime | Quality |
| --- | --- | --- |
| ASR | Faster Whisper Large V3 Turbo | Faster Whisper Large V3 Turbo |
| Translation | MarianMT ID-EN | NLLB 200 distilled 600M |
| TTS | Explicit English Piper voice or explicit English Windows SAPI voice | Explicit English Piper voice or explicit English Windows SAPI voice |

Named providers/models are current implementation evidence, not permanent product identity. Provider/model changes remain owned by the local-AI runtime boundary.

### TTS voice-selection contract

TTS availability requires a voice that can be identified as English before synthesis starts.

For Piper, a model is not trusted from filename or `.onnx` presence alone. The current worker requires the paired `<voice>.onnx.json` metadata and an English language code before that voice is selectable.

For Windows SAPI, the worker reads installed voice name + culture, selects an English culture explicitly (preferring `en-US` when present), and calls `SelectVoice` before synthesis. The implicit Windows default voice is not the Meeting output contract.

If no explicit English-capable voice can be identified, TTS remains unavailable instead of synthesizing with an arbitrary voice.

## Runtime Assets

The declarative `model_manifest.json` + Rust inventory is scoped only to **full-product-release asset presence**. It does not decide whether Meeting can start. Current Meeting-required ASR / ID→EN / English-TTS capability is owned by the live worker status and provider preflight, so a valid runtime fallback can satisfy Meeting without pretending the full release package is complete. Asset presence remains installation evidence only.

Typical current asset roots include:

```text
EngineData/Backend/RuntimeAssets/ASR/ModelData/
EngineData/Backend/RuntimeAssets/Translation/ModelData/
EngineData/Backend/RuntimeAssets/Voice/Piper/
```

A packaged Piper voice intended for outbound English TTS needs both its `.onnx` model and matching `.onnx.json` voice metadata. Asset presence still does not prove imports, model load, CUDA use, inference quality, audio quality, latency, or product readiness.

## Executable Proof Layers

Use the cheapest proof that matches the claim:

```text
Ruff
-> Python source lint/format policy

pytest tests/
-> deterministic worker/protocol behavior only

run_realtime_worker_smoke.ps1
-> observed local model/provider command path on one PC

py-spy
-> observed performance profile of one persistent-worker run
```

The smoke script requires the canonical `.venv` created from this project. Its stored evidence is privacy-bounded to stage/completion/voice metadata and excludes source text, translated text, transcript text, and runtime file paths.

## Retired Development Scaffolding

Do not restore these as runtime/dependency authority:

- standalone accelerated/entry workers;
- manual/rule translation fallback;
- `requirements-realtime.txt`;
- `requirements-virtual-audio-route.txt`;
- `realtime_stack_manifest.json` as latency/execution truth;
- manual PyTorch CUDA reinstall script;
- standalone CTranslate2 translation-model conversion setup for the retired accelerated translation path.

If CUDA/package acquisition later needs a special index or platform-specific lock strategy, that must be decided from the canonical `pyproject.toml`/lock + release-packaging boundary, not by mutating the environment with a side script.

## Runtime Evidence

Application runtime evidence may be written under:

```text
UserData/LogData/RustAppValidation/
```

That is distinct from temporary developer validation output, which should stay under ignored `.tmp/` paths where possible.

## Truth Rules

- One persistent Python AI worker remains canonical.
- One `pyproject.toml` owns WorkerRuntime Python dependencies/tooling.
- `uv.lock` is committed canonical resolution state; normal WorkerRuntime setup uses it frozen and must not silently re-resolve dependency ranges.
- Translation output without verifiable normal completion is not successful output.
- TTS requires an explicitly identified English-capable voice before synthesis.
- CUDA availability is separate from successful CUDA inference.
- CPU fallback remains a product capability requirement; usability/performance needs local proof.
- Worker/model presence does not equal inference readiness or model quality.
- Ruff/test success does not equal model/runtime success.
- Development setup/profiling tools must not become normal-user requirements.
- The worker must not replace the Rust/Tauri product shell or create a second product architecture.

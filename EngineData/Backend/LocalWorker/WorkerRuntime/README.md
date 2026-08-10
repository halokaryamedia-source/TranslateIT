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

## Canonical Python Project

`pyproject.toml` is the single WorkerRuntime dependency and Python tooling owner.

The base project contains the canonical local-AI runtime dependencies. The `virtual-audio-route` extra contains the additional Python dependency needed by the guarded Windows virtual-audio provider without making that provider a second AI runtime.

`requirements-realtime.txt` and `requirements-virtual-audio-route.txt` are retired. Do not recreate requirements files as parallel dependency authorities.

`uv.lock` is intentionally not committed yet because dependency resolution has not been executed and verified through the current ChatGPT -> GitHub channel. The first verified local dependency-resolution pass must generate/review the lock before repository state may be called reproducible.

`setup_realtime_worker.ps1` is a developer helper that uses `uv` and the canonical project. `uv` is developer/build tooling only; the installed TranslateIT product must not require the end user to install or operate `uv`.

## Developer Commands

From this folder, after `uv` is available:

```powershell
# Runtime environment only
uv sync --no-dev

# Runtime + developer proof tools
uv sync

# Static Python quality checks
uv run ruff check .
uv run ruff format --check .

# Deterministic worker/protocol checks
uv run pytest
```

These commands are development proof only. A successful Ruff/pytest run does not prove model quality, CUDA execution, translation accuracy, audio delivery, or latency.

### Optional virtual-audio provider dependency

For a local Windows route-validation environment that intentionally includes the guarded Python route provider:

```powershell
uv sync --extra virtual-audio-route
```

Windows route behavior remains owned by the Windows-audio boundary and still requires real device/runtime proof.

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
| TTS | Piper or current Windows SAPI fallback | Piper or current Windows SAPI fallback |

Named providers/models are current implementation evidence, not permanent product identity. Provider/model changes remain owned by the local-AI runtime boundary.

## Runtime Assets

The declarative model inventory is owned separately by `model_manifest.json` and the Rust installation inventory. Asset presence is installation evidence only.

Typical current asset roots include:

```text
EngineData/Backend/RuntimeAssets/ASR/ModelData/
EngineData/Backend/RuntimeAssets/Translation/ModelData/
EngineData/Backend/RuntimeAssets/Voice/Piper/
```

Asset presence does not prove imports, model load, CUDA use, inference quality, latency, or product readiness.

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

The smoke script now requires the canonical `.venv` created from this project and stores privacy-bounded evidence; it does not record source text or raw audio path in its summary.

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
- `uv.lock` is required before dependency resolution can be called reproducible, but it must be generated from a real verified resolution rather than fabricated.
- CUDA availability is separate from successful CUDA inference.
- CPU fallback remains a product capability requirement; usability/performance needs local proof.
- Worker/model presence does not equal inference readiness or model quality.
- Ruff/test success does not equal model/runtime success.
- Development setup/profiling tools must not become normal-user requirements.
- The worker must not replace the Rust/Tauri product shell or create a second product architecture.

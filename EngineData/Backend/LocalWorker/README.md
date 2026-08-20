# Backend LocalWorker

`LocalWorker` owns TranslateIT's single local Python boundary for ASR, Indonesian ↔ English translation, trained My Voice inference, and the bounded VoiceLab build child.

## Layout

```text
LocalWorker/
├─ WorkerRuntime/                    # Git-tracked canonical source
│  ├─ realtime_local_worker.py       # one application-facing worker entrypoint
│  ├─ realtime_local_worker_base.py
│  ├─ worker_runtime_common.py
│  ├─ worker_io_runtime.py
│  ├─ milmmt_translation_provider.py
│  ├─ voice_lab_*.py
│  ├─ model_manifest.json
│  ├─ pyproject.toml
│  └─ uv.lock
└─ PythonRuntime/                    # staged R3 payload; ignored by Git
   └─ python.exe                     # installed-product interpreter authority
```

Development may use `WorkerRuntime/.venv`, `TRANSLATEIT_WORKER_PYTHON`, or system Python only inside verified repository-development mode. Packaged mode resolves only the private `PythonRuntime/python.exe` and fails closed if it is missing. Normal users do not install Python, pip, uv, or WorkerRuntime dependencies manually.

## Dependency authority

`WorkerRuntime/pyproject.toml` + `uv.lock` is the source/build dependency graph. Current canonical boundary includes:

```text
Python       3.12.x
Torch        2.11.0 / cu126 release path
Transformers 4.57.6
Tokenizers   0.22.2
```

The R3 staged private runtime starts from CPython 3.12.10 Windows embeddable package:

```text
archive SHA-256 4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3
```

`stage_release_inputs.ps1` owns deterministic staging. `stage_release_license_material.py` and `validate_release_payload.mjs` own exact exceptional license/provenance material. `optimize_release_payload.py` owns the profiled release-only 116 → 97 distribution reduction and removes only the already-reviewed English-only exclusions. Do not widen that exclusion boundary without new matching Windows evidence.

## R3 release boundary

Private Python is part of `TranslateIT-Payload.7z`, not a large Tauri resource. The small Tauri Setup closure contains WorkerRuntime source modules required to launch the packaged worker; the external payload installs `PythonRuntime` and large runtime assets under the same canonical application resource root.

The payload contract binds app version, dependency versions, model revisions, and SHA-256. Reinstall replaces external application runtime transactionally. Uninstall removes TranslateIT-owned private runtime while preserving app-local user data and the system VB-CABLE driver.

## Rules

- Keep one Python runtime and one daily worker process.
- Keep MiLMMT as the single canonical production translator.
- Do not create a second GPT-SoVITS environment/server/provider registry.
- Do not make system Python, pip, uv, PATH hacks, or repository checkout installed-product dependencies.
- Do not commit private Python/model/Voice runtime bytes, `.venv`, caches, tests, or user data into release payload source.
- Do not turn source/hosted proof into installed-runtime, CUDA, audio, or clean-machine proof.

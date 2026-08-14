# Backend LocalWorker

## Purpose

`LocalWorker` owns TranslateIT's one local Python runtime boundary for ASR, bidirectional translation, trained My Voice inference, and the bounded one-shot VoiceLab build child.

## Current Layout

```text
LocalWorker/
├─ WorkerRuntime/                       # Git-tracked application/runtime source
│  ├─ realtime_local_worker.py         # one daily ASR / translation / TTS worker
│  ├─ voice_lab_build.py               # one-shot VoiceLab build child
│  ├─ voice_lab_gpt_sovits.py          # pinned GPT-SoVITS build/inference adapter
│  ├─ voice_lab_upstream_stage.py      # bounded headless upstream-stage bridge
│  ├─ model_manifest.json              # canonical full-product release model inventory
│  ├─ pyproject.toml
│  └─ uv.lock                          # frozen dependency graph
└─ PythonRuntime/                       # controlled release payload, ignored by Git
   └─ python.exe                       # installed-product interpreter authority
```

Development may use `WorkerRuntime/.venv`, `TRANSLATEIT_WORKER_PYTHON`, or a system Python only inside verified repository-development mode. Packaged mode resolves only `PythonRuntime/python.exe` and fails closed if it is missing; normal users are not instructed to install Python or pip.

## Release Boundary

The Windows release overlay bundles only the production WorkerRuntime files consumed by the product plus the private `PythonRuntime` and required `RuntimeAssets`. Test files, setup/smoke scripts, `.venv`, `DevelopingData`, and user data are not release runtime inputs.

Large/private runtime bytes are staged as controlled release inputs and remain out of Git. `scripts/validate_release_payload.mjs` verifies their required presence before the installer build; actual installed execution remains target/installed proof.

## Rules

- Keep one canonical Python runtime and one daily worker.
- Do not create a second GPT-SoVITS environment, launcher, server, or provider registry.
- Do not make system Python, pip, uv, environment variables, or repository checkout installed-product dependencies.
- Do not store private Python runtime or model/GPT-SoVITS payload bytes in Git.
- Do not package tests, development setup scripts, local caches, or historical `DevelopingData` into the installer.

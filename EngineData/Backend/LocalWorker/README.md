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

## Python Runtime Provenance / License Gate

- The release Python authority is **CPython 3.12.10 Windows embeddable package** from Python.org, not a copied developer installation. Keep the Python Software Foundation License Version 2 and the applicable incorporated-software acknowledgements with the distributed runtime.

R3 pins the concrete CPython input used for the controlled Windows release profile:

```text
source URL      https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip
archive bytes   11133606
archive MD5     fe8ef205f2e9c3ba44d0cf9954e1abd3
archive SHA256  4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3
```

The staged `PythonRuntime/PYTHON_SOURCE.txt` must record that exact provenance. The embeddable distribution's `python312._pth` is also part of the release contract. In `_pth` isolated mode, environment/registry path injection such as `PYTHONPATH` is not an installed-product dependency. The only active path entries must be:

```text
python312.zip
.
..\WorkerRuntime
```

`import site` must remain disabled. `.` owns the frozen third-party packages vendored into `PythonRuntime`; `..\WorkerRuntime` exposes only TranslateIT's canonical sibling worker modules. Do not solve this by enabling system/user site-packages, copying a second WorkerRuntime into PythonRuntime, or relying on environment-variable path injection.
- `WorkerRuntime/uv.lock` is the exact third-party Python dependency graph that must be reviewed for the staged private runtime. Python itself being redistributable does not clear every vendored Python package.
- `g2p-en` is pinned to **2.1.0** because the dependency exception below is source-reviewed against that exact release. Its published metadata declares `distance`, but hosted inspection of the installed `g2p_en` 2.1.0 Python package confirms that the runtime source contains no `distance` reference, and an English G2P smoke test succeeds while `distance` is absent.
- The canonical `[tool.uv]` policy therefore uses a **version-scoped `exclude-dependencies`** entry that removes only `distance` as declared by `g2p-en==2.1.0`. `uv.lock` must not contain the `Distance` package. Any `g2p-en` version change must remove or re-justify this exception and repeat the source/runtime proof before release staging.
- WorkerRuntime dependency resolution requires `uv>=0.12.0` so the scoped exclusion is understood consistently. This is developer/build tooling only; `uv` is not an installed-product dependency.
- This containment removes the identified `Distance` package from the private Python dependency graph. It is not a legal opinion or overall release-clearance claim; FFmpeg, VB-CABLE, and remaining third-party notices retain their separate gates.
- This source audit records a release gate; it is not a legal opinion and must not be used as proof that a particular commercial distribution is cleared.

## Rules

- Keep one canonical Python runtime and one daily worker.
- Do not create a second GPT-SoVITS environment, launcher, server, or provider registry.
- Do not make system Python, pip, uv, environment variables, or repository checkout installed-product dependencies.
- Do not store private Python runtime or model/GPT-SoVITS payload bytes in Git.
- Do not package tests, development setup scripts, local caches, or historical `DevelopingData` into the installer.

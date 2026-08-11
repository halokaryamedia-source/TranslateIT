# TranslateIT — Next Action

## Current Status

The initial product remains Meeting / Text / Settings with required Indonesian -> English Meeting voice, optional incoming English -> Indonesian text, and bidirectional Text translation.

P0 through P0.4 source simplification remain closed. The installed-worker Plan is now also resolved:

- production Tauri/frontend/runtime surface remains reduced to current Meeting/Text/setup behavior;
- persisted settings remain schema v6 and the old handoff/runtime scaffolding remains removed;
- initial release still has no SHA-256/checksum/revision identity framework;
- the installed worker will **not** use a frozen PyInstaller/Nuitka executable and will **not** ship a copied `.venv`;
- one application-local embedded CPython runtime will be distributed in the approved local payload;
- canonical installed interpreter path is `EngineData/Backend/LocalWorker/PythonRuntime/python.exe` under the existing immutable runtime root;
- the existing `realtime_local_worker.py` and `virtual_audio_route_provider.py` remain scripts and must use that same interpreter;
- system Python, `.venv`, `TRANSLATEIT_WORKER_PYTHON`, Windows `py`, and the separate route `TRANSLATEIT_PYTHON` path are development-only conveniences and must not become packaged-release success paths;
- end users do not install pip/uv, resolve packages, or create environments;
- models remain under `RuntimeAssets`; Python packages belong to the prepared `PythonRuntime` payload.

No Rust compile, TypeScript typecheck, validator execution, Python runtime payload build, Tauri launch, Windows audio acceptance, model execution, installer execution, or clean-machine proof was obtained through ChatGPT -> GitHub.

## Closed Plan — Minimal Packaged Worker Execution

### Selected Layout

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
│  ├─ realtime_local_worker.py
│  ├─ virtual_audio_route_provider.py
│  └─ model_manifest.json
└─ PythonRuntime/
   ├─ python.exe
   ├─ embedded CPython runtime files
   └─ vendored third-party packages
```

The approved local sidecar release payload may mirror the same `EngineData/...` structure so installer placement remains a direct copy into the canonical runtime root rather than a second package registry.

### Why This Method

- CPython provides an embeddable Windows distribution specifically for private application use and expects third-party packages to be vendored by the application.
- Python `venv` environments are disposable development environments and are not intended to be moved/copied as an application runtime.
- Freezing the current worker would add another packaging/spec/hook layer for `torch`, `ctranslate2`, `faster-whisper`, `transformers`, native libraries and data files while changing `sys.executable`/bundle-path behavior. That is unnecessary before the existing script worker has clean installed proof.

### Required Release Python Packages

The prepared runtime must contain the current worker dependencies from `pyproject.toml`:

```text
ctranslate2
faster-whisper
numpy
sacremoses
sentencepiece
soundfile
torch
transformers
sounddevice
```

`sounddevice` is required by the current Meeting Microphone provider for normal outbound delivery, even though it is currently listed as an optional dependency in the development project.

No pip/uv executable is required in the installed runtime. Exact embedded-Python version and package versions are release-build inputs validated locally; no hash/identity framework or dependency registry is introduced for the initial controlled release.

## Current Mode

**Developing** for one bounded source-alignment slice.

Execution channel:

```text
ChatGPT -> GitHub
```

Use:

```text
.agents/skills/development-brief/SKILL.md
+ .agents/skills/release-packaging-development/SKILL.md
```

## Next Step — Packaged Worker Interpreter Ownership

### Goal

Make current source choose one canonical application-local Python interpreter in packaged mode, while keeping development Python discovery explicitly repository-development-only.

### In Scope

1. extend the existing `ProjectPaths`/worker path ownership with the packaged `PythonRuntime` directory;
2. make `bridge_paths.rs` resolve `PythonRuntime/python.exe` as the **only** packaged interpreter and keep env/`.venv`/system Python candidates only for verified repository development;
3. make `helper_bridge.rs` use that one resolver without changing worker protocol/scheduling;
4. make `virtual_audio_route_runtime.rs` use the same interpreter resolver and `worker_runtime_dir` for its provider script instead of its separate `TRANSLATEIT_PYTHON`/system-Python path;
5. align `pyproject.toml` so `sounddevice` is an initial runtime dependency rather than a hidden optional release requirement;
6. update only the existing package/source preflight necessary to protect this ownership.

### Out Of Scope

- downloading or committing CPython binaries or Python wheels;
- building the actual `PythonRuntime` payload;
- NSIS copy/install hooks;
- changing model families or worker protocol;
- changing Meeting Microphone device/routing semantics or its current execution safety guard;
- adding pip/uv/package-manager behavior for end users;
- adding hashes, dependency registries, freeze specs, PyInstaller/Nuitka, or another launcher/runtime;
- claiming installed execution from static source changes.

### Acceptance

1. packaged mode has exactly one interpreter path: `<runtime root>/EngineData/Backend/LocalWorker/PythonRuntime/python.exe`;
2. release/packaged mode cannot silently fall through to env, `.venv`, system `python`, `python3`, or Windows `py`;
3. persistent worker and Meeting Microphone provider use the same interpreter resolver and worker runtime root;
4. repository-development fallback remains available only in the existing explicit development boundary;
5. current package/source preflight reflects the selected ownership while local payload/clean-machine proof remains separate.

## Later Local Release Proof

After the source ownership slice, prepared payload acceptance must prove at minimum:

```text
private python.exe launches outside the repository
-> worker status succeeds
-> real ID->EN and EN->ID Text translation succeeds with installed model paths
-> helper starts from the installed app without system Python/uv/.venv
-> Meeting Microphone provider can import its packaged numpy/sounddevice dependencies
-> clean Windows machine with no user Python installation can execute the same path
```

Actual Meeting audio arrival remains separate Windows device/audio proof.

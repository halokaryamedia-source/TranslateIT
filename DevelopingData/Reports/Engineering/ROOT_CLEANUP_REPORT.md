# Root Cleanup Report

## Current Direction

TranslateIT has migrated the desktop application shell to Rust/Tauri. The repository root must stay clean and professional.

The root should contain only the top-level launcher, repository metadata, and approved top-level folders. Runtime code belongs in `EngineData`, development and validation scripts belong in `DevelopingData`, user outputs belong in `UserData`, and documentation belongs in the relevant documentation/report folders.

## Root Policy

Allowed root folders:

- `.github/`
- `DevelopingData/`
- `DeveloperData/`
- `EngineData/`
- `Launcher/`
- `UserData/`

Allowed root files:

- `.gitattributes`
- `.gitignore`
- `README.md`
- `TranslateIT.vbs`

Forbidden at root:

- `*.py`
- `*.bat`
- `*.cmd`
- `*.ps1`
- `*.log`
- `*.tmp`
- `*.bak`
- `*.old`
- `__pycache__/`
- `.pytest_cache/`
- `.mypy_cache/`
- `node_modules/`
- `dist/`
- `build/`
- `target/`

## Python Usage After Rust Migration

Python is no longer the desktop launcher/UI engine.

Python is still intentionally used for:

- local AI worker execution in `EngineData/LauncherApp/Workers/realtime_local_worker.py`,
- Faster Whisper local ASR orchestration,
- Transformers/MarianMT/NLLB local translation orchestration,
- Piper command orchestration,
- development-only validation scripts in `DevelopingData/ToolKitData/Scripts/Execution/`.

Python should not appear as loose root files. Legacy root Python launcher files are not part of the RustApp route.

## Cleanup Guard Added

The following checker enforces root cleanliness:

```text
DevelopingData/ToolKitData/Scripts/Execution/check_root_professional_cleanliness.py
```

It fails when root contains legacy Python/scripts, cache folders, build output, logs, or unexpected top-level items.

## Git Ignore Guard Added

`.gitignore` now blocks root-level legacy scripts and artifacts:

```text
/*.py
/*.bat
/*.cmd
/*.ps1
/*.log
/*.tmp
/*.bak
/*.old
/__pycache__/
/.pytest_cache/
/.mypy_cache/
```

Nested Python remains allowed where it is intentionally part of the local worker or validation tooling.

## Current Validation Position

- Root Python launcher/UI files are not required for the RustApp route.
- Python worker files remain required until the ASR/translation/TTS inference layer is rewritten in Rust or packaged through another native runtime.
- Root cleanliness is now checked by a dedicated validator.
- Real professional readiness still requires local build/package and runtime smoke evidence.

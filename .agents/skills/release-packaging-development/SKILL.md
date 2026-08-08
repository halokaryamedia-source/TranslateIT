---
name: release-packaging-development
description: TranslateIT specialist for the Windows release/deployment boundary: installer/package configuration, bundled helper/Python runtime, dependencies, model/TTS/runtime assets, installed resource layout, meeting-audio setup delivery, fresh UserData initialization boundary, uninstall/reinstall behavior, and clean-machine deployment proof. Do not use to redesign runtime architecture or own AI/audio/desktop behavior.
---

# Release Packaging Development

Use after `development-brief` proves that the current acceptance boundary is
Windows release packaging, installation, runtime-resource delivery, or clean-target
readiness.

## Owns

- Windows release artifact and installer/package configuration;
- bundled helper/Python runtime and required dependencies;
- model/runtime/default TTS asset delivery;
- deterministic installed resource layout and production path resolution;
- required meeting-audio provider/setup delivery;
- fresh runtime `UserData` initialization boundary;
- uninstall/reinstall release behavior where defined;
- clean-machine deployment proof.

## Does Not Own

- AI inference behavior, provider semantics, or CUDA/CPU selection rules;
- microphone/VAD/device-route mechanics;
- desktop product UX/readiness presentation;
- product requirements or runtime-architecture redesign.

## Core Boundary

```text
working development tree
-> release packaging
-> one user-facing installer
-> clean Windows target
-> installed TranslateIT
-> packaged runtime/assets resolve correctly
```

Packaging difficulty does not justify replacing the approved
`Rust/Tauri desktop shell + Python helper runtime` architecture.

## Domain Rules

- Normal users get one user-facing installer; they must not manually install
  Python, run pip, download core models, set environment variables, run PowerShell
  bootstrap, or copy runtime folders.
- System Python / `python` / `py -3` may be a development fallback, not a hidden
  production dependency.
- Production resource resolution must be deterministic. Do not rely on random
  PATH entries, repository-relative development paths, Downloads, or developer
  workspace paths.
- Model binaries may remain outside Git, but core offline models/assets are still
  controlled release inputs. Do not silently turn missing core assets into
  first-use downloads without new product policy.
- `installer generated` is not `installed runtime verified`; installed runtime is
  not `clean-machine release verified`.
- `DevelopingData`, development caches/logs, test Saved data, temporary audio,
  planning docs, debug screenshots, credentials, machine-local config, and
  developer secrets must not enter the runtime package.
- `UserData/CacheData`, `UserData/LogData`, and `UserData/SavedProject` start from
  fresh runtime state. User-created persistent data must not be destructively
  removed unless uninstall policy explicitly says so.
- Build-time tools (Git, Node/Bun, Cargo/Rust toolchain, Python/pip, IDEs) are not
  runtime dependencies unless a current product contract explicitly requires one.
- Generated build/installer output is derived evidence, not source authority.
  Fix canonical build/package config/source and regenerate.
- Auto-update infrastructure is deferred; do not make it a prerequisite for the
  initial internal release.
- Code signing is not the current internal readiness blocker unless distribution
  policy changes.
- Audio provider/driver delivery belongs here; detecting/configuring/using the
  installed route belongs to `windows-audio-runtime-development`.

## Proof Hierarchy

```text
configuration proof
-> build artifact proof
-> installed-runtime proof
-> clean-machine proof
```

Use the proof level required by the claim. A Tauri/NSIS config alone does not prove
a working installer. A successful installer exit code does not prove helper,
models, TTS, UserData, or meeting route work after installation.

## Procedure

1. Ground the release goal from the development brief.
2. Derive actual runtime requirements from current desktop, AI, and audio owners.
3. Separate build-time dependencies, packaged runtime dependencies, and user data.
4. Identify the canonical installed layout/resource-resolution contract.
5. Reuse the current release/build owner; do not create a parallel packaging
   architecture without need.
6. Include only production-required artifacts.
7. Build the smallest valid release artifact.
8. Validate in the weakest environment that can falsify the current claim,
   escalating to clean Windows for strong release-readiness claims.
9. Verify uninstall/reinstall only when current acceptance requires it.
10. Return to the development-brief acceptance gate.

## Proof

GitHub/static proof can establish package declarations, expected installed layout,
asset inputs, and UserData exclusions. Build proof establishes artifact generation.
Packaged-runtime and clean-machine claims require corresponding local/target proof.

## Anti-Slop Boundary

Do not rewrite architecture because packaging is inconvenient; use system Python
as hidden production dependency; require manual pip/model setup; copy the entire
repo into the installer; package `DevelopingData` or user test data; create random
path-fallback chains; silently download core models at first run; treat NSIS config
or generated installer as clean-machine proof; edit generated artifacts as source;
or build update infrastructure before it is required.

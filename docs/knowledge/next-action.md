# TranslateIT — Next Action

## Current Status

The initial product remains Meeting / Text / Settings with required Indonesian -> English Meeting voice, optional incoming English -> Indonesian text, and bidirectional Text translation.

P0 through P0.4 source simplification remain closed. Packaged-worker interpreter source ownership is aligned, and the long-term frontend architecture/skill routing is now decided without changing the current runtime critical path:

- initial release still has no SHA-256/checksum/revision identity framework;
- canonical packaged Python is `EngineData/Backend/LocalWorker/PythonRuntime/python.exe` and packaged source cannot silently fall through to system Python;
- the existing worker/provider scripts remain the one Python runtime owner;
- current frontend source is still Vite + vanilla TypeScript/manual DOM and remains runtime truth until migration is implemented;
- approved frontend target is Tauri 2 + Svelte 5 + Vite + TypeScript + Tailwind CSS 4 + semantic CSS custom-property tokens + selective Bits UI + Lucide Svelte;
- SvelteKit, frontend router, Redux-like state library, heavy UI framework, CSS-in-JS, full shadcn-svelte dump, and general animation framework are not default dependencies;
- framework/application migration routes to `desktop-runtime-development`;
- visual system/component craft routes to `desktop-ui-design-development`;
- official Svelte `svelte-code-writer`, `svelte-core-bestpractices`, and `@sveltejs/mcp` tooling are conditional technical helpers, not new TranslateIT project specialists;
- the frozen TranslateIT project-skill baseline remains unchanged;
- no Svelte package/source migration was started in this skill-governance slice.

No Rust compile, TypeScript/Svelte typecheck, Svelte autofixer, validator execution, Python runtime payload build, worker/model execution, Tauri launch, rendered UI proof, Windows audio acceptance, installer execution, or clean-machine proof was obtained through ChatGPT -> GitHub.

## Frontend Skill Architecture — Closed Decision

Professional frontend work now follows this composition:

```text
approved behavior-changing / migration task
-> development-brief
-> one semantic TranslateIT specialist

framework/application migration + state/bridge parity
-> desktop-runtime-development

visual hierarchy/layout/tokens/component states/rendered acceptance
-> desktop-ui-design-development

Svelte syntax/reactivity/framework validation
-> official Svelte technical helper workflow
```

For future `.svelte`, `.svelte.ts`, or `.svelte.js` work in Codex/Local, the official Svelte helper/autofixer workflow is required before finalization. This tooling does not become a second project specialist or runtime dependency.

The migration itself must remain behavior-preserving: one Svelte application root, existing Tauri/runtime bridge contracts preserved by default, no duplicated product truth in frontend stores, and no permanent vanilla/Svelte dual shell.

## Current Mode

**Developing** for real prepared-runtime proof.

Execution channel:

```text
Codex / Local
```

The next boundary still needs an actual Windows/release filesystem and process execution. The frontend architecture decision does not replace that runtime proof.

## Next Step — Prepare PythonRuntime Payload + Worker Smoke

### Goal

Build one real private `PythonRuntime` payload locally at the selected layout and prove that the existing worker/provider execute from it outside the repository before adding installer staging or beginning the Svelte source migration.

### Required Payload

Prepare:

```text
EngineData/Backend/LocalWorker/PythonRuntime/
├─ python.exe
├─ required embedded CPython files
└─ vendored runtime packages required by current pyproject.toml
```

Runtime dependencies currently include:

```text
ctranslate2
faster-whisper
numpy
sacremoses
sentencepiece
sounddevice
soundfile
torch
transformers
```

Models remain outside the Python runtime under the existing `RuntimeAssets` layout.

### Proof Sequence

Use the weakest proof that can falsify each next claim:

```text
1. private PythonRuntime/python.exe starts outside the repository
2. required worker imports succeed from that private runtime
3. realtime_local_worker.py ping/status succeeds with explicit runtime/user roots
4. real ID->EN and EN->ID Text translation succeeds against prepared model paths
5. virtual_audio_route_provider.py can import packaged numpy + sounddevice
6. app/helper can start the same private interpreter without system Python, uv, or .venv
```

Clean-machine Windows execution is still required after the local prepared payload passes. Actual Meeting audio arrival is a separate Windows audio/device proof.

### Constraints

- do not commit CPython binaries, wheels, models, or generated payload bytes to Git unless release policy explicitly changes;
- do not add a downloader, package manager, dependency registry, hash/checksum framework, freeze spec, or another worker launcher;
- do not change model family, worker protocol, Meeting lifecycle, or audio routing semantics to make packaging easier;
- do not add NSIS/Tauri payload-copy hooks until the prepared private runtime actually starts the worker and provider locally;
- failed import/load/process proof is evidence to fix the prepared payload, not permission to fall back to system Python in packaged mode;
- do not begin the Svelte migration inside this runtime-proof slice.

### Acceptance

1. private `PythonRuntime/python.exe` works from the intended non-repository payload layout;
2. worker ping/status and both Text directions execute with the private runtime and prepared local models;
3. Meeting provider imports `numpy` and `sounddevice` from the same private runtime;
4. no system Python/uv/.venv dependency is needed for the tested runtime path;
5. exact local limitations are recorded before the subsequent installer-staging slice.

After this passes, the next source work can be explicitly prioritized between the smallest Tauri/NSIS placement hook for the proven runtime payload and the approved Svelte migration; do not mix those independent boundaries in one Developing slice.

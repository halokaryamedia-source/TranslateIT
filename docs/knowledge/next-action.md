# Next Action

Updated: 2026-08-11  
Working branch: `New`  
Status: **The Packaged Runtime Layout Foundation is source-aligned. `ProjectPaths` now owns separate packaged runtime and writable user-data roots; Tauri setup supplies resource/app-local paths; repository probing is debug-development fallback only; worker/model consumers use the canonical roots; and the Python worker maps existing `UserData/...` handoff labels into writable app-local data. No Rust/Python/static-validator/installer/installed-Windows proof has been obtained. The next unresolved release boundary is the minimal reproducible payload identity/revision/hash contract that will feed later sidecar staging without becoming a second model registry.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/knowledge/decision-log.md D-023 / D-024
-> docs/foundation/02-product-requirements.md PR-011..013 / PR-140..143 / PR-180..181
-> inspect model_manifest.json + RuntimeAssets ownership + current release/package preflight only
```

## Current Mode

**Plan**.

Execution channel:

```text
ChatGPT -> GitHub
```

Do not load a project specialist while this remains Plan. Transition explicitly to
Developing only after one release-payload identity owner and its exact responsibility are
grounded.

Rust/TypeScript/Python execution, static-validator execution, Tauri build, actual model
files/load, installer execution, app-local write behavior, packaged helper execution,
Windows audio, installed operation, and clean-machine proof remain `LOCAL PROOF REQUIRED`.

# Closed Source Slice — Packaged Runtime Layout Foundation

## Canonical path owner

`engine/paths.rs` now distinguishes:

```text
tauri_packaged_context
-> runtime_root = Tauri resource directory
-> user_data_root = Tauri app-local data directory

repository_development_fallback
-> debug builds only
-> requires explicit repository markers

unverified_development_fallback
-> bootstrap/development fallback only
-> never installed-path proof
```

`ProjectPaths` supplies:

```text
runtime_root
worker_runtime_dir
user_data_root
user_cache_dir
user_log_dir
user_saved_dir
asr_model_dir
translation_model_dir
voice_runtime_dir
backend_contract_dir
```

Packaged context initialization accepts absolute runtime/user roots only and is owned by
one `OnceLock` inside the existing path owner. No second path registry/service was added.

## Tauri bootstrap

`app_bootstrap.rs` uses the existing setup boundary:

```text
app.path().resource_dir()
app.path().app_local_data_dir()
-> initialize_tauri_path_context(...)
-> ensure writable user-data directories
```

For child processes it publishes:

```text
TRANSLATEIT_RUNTIME_ROOT
TRANSLATEIT_USER_DATA_ROOT
```

These values are overwritten from `ProjectPaths` and are transport to child runtime
processes, not another normal-user path configuration mechanism.

## Direct consumers

`bridge_paths.rs` resolves the canonical worker directory from `worker_runtime_dir`.
`runtime_inventory.rs` resolves the manifest/model asset locations from
`worker_runtime_dir` + `runtime_root` and writes evidence under the writable cache root.

The Python worker now uses:

```text
RUNTIME_ROOT
-> ASR / translation / Piper resources

USER_DATA_ROOT
-> CacheData / LogData
```

Existing relative Rust handoff labels such as `UserData/CacheData/...` are mapped into
`USER_DATA_ROOT` before the worker's allowed-root validation. Generated TTS/temporary
Meeting audio therefore no longer needs a writable `UserData` directory inside packaged
resources.

## Static package/path validation definition

`validate_tauri_package_preflight.mjs` now defines source checks for:

- one canonical `ProjectPaths` packaged/development split;
- Tauri resource + app-local initialization;
- debug-only verified repository fallback;
- worker/model consumers using explicit canonical roots;
- worker runtime/user root transport and legacy `UserData/...` remapping;
- no claim that this source contract is an installer/runtime PASS.

The validator was **not executed** in this channel.

# Existing Release Decision

Initial controlled Windows delivery remains:

```text
TranslateIT release package
├─ one user-run NSIS Setup EXE
└─ local sidecar payloads distributed with Setup
   ├─ runtime/helper payload(s)
   ├─ primary ASR payload
   ├─ marianmt-id-en payload
   └─ marianmt-en-id payload
```

No initial first-run internet downloader, manual Python/model setup, cloud fallback, NLLB
fallback, or generic package manager is approved.

Both Marian directions are required for full release/product acceptance because Text is
bidirectional. EN->ID remains nonblocking for the narrower required Meeting outbound
runtime gate.

# Known Remaining Installed-Product Gaps

```text
release payload revision/hash identity not implemented
NSIS local sidecar payload verification/copy not implemented
packaged Python/helper runtime not implemented
Tauri resource inclusion for final payload not proved
clean-machine installation/runtime not proved
```

Current helper discovery through `.venv`, environment override, or system Python remains
development flexibility only; it is not acceptable as the final installed-user runtime.

# Next Plan Boundary — Release Payload Identity + Reproducible Source Contract

## Goal

Define the smallest release identity contract that lets later staging verify exactly what
local payload belongs to a TranslateIT release without creating another translation
model registry or a generic package manager.

## Questions To Resolve

1. Which existing owner should carry immutable external source revisions and which owner
   should carry the hash of the **prepared release payload/archive**?
2. Can current `model_manifest.json` fields (`repo_id`, `revision`, `checksum`,
   `expected_path`) own model source identity cleanly while a release-only contract owns
   artifact/archive identity?
3. How are non-model runtime payloads (packaged helper/Python, TTS assets, route support)
   represented without turning `model_manifest.json` into a generic package registry?
4. What is the minimum schema needed by future package preflight and NSIS sidecar staging?
5. Which hashes can be committed as release input metadata now, and which must be created
   only from locally prepared payload bytes?

## Constraints

- keep `model_manifest.json` the model identity/inventory owner;
- do not create a second model-selection registry;
- do not fabricate source revisions or SHA-256 values;
- do not download or commit large runtime/model bytes in ChatGPT -> GitHub;
- do not add a network downloader or package manager;
- do not begin NSIS payload-copy implementation until the input identity contract is
  resolved;
- do not claim hash/source metadata proves model load or translation quality.

## Plan Acceptance

The plan is complete only when it identifies:

1. one owner for model source identity and one bounded owner (existing if possible) for
   prepared release-artifact identity;
2. the minimum fields for model + non-model payloads;
3. how immutable source revisions are obtained and reviewed without fabricated values;
4. how SHA-256 values are generated from real staged bytes later;
5. one bounded Developing slice for source metadata/preflight before NSIS transport.

## Next Step

Plan **Release Payload Identity + Reproducible Source Contract** from the current model
inventory and release/package owners; do not implement a new payload registry until that
ownership is resolved.

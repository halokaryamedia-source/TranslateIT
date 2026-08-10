# Next Action

Updated: 2026-08-11  
Working branch: `New`  
Status: **The Local Model Asset Delivery + Acceptance plan is resolved. TranslateIT will keep one normal Windows setup experience, but the initial controlled release must not depend on one monolithic NSIS executable containing all AI assets. The selected topology is a small NSIS setup plus local sidecar runtime payloads distributed together; Setup owns verification/placement so users do not install Python or models manually and the product does not need an initial network downloader. The next source slice is the packaged-runtime path foundation required before installer hooks or payload staging can be implemented safely. No Rust/TypeScript/Python/static-validator/model-load/installer/Windows runtime proof has been obtained.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/knowledge/decision-log.md D-023 / D-024
-> docs/foundation/02-product-requirements.md PR-011..013 / PR-021..023 / PR-025 / PR-028 / PR-140..143 / PR-180..181
-> .agents/skills/development-brief/SKILL.md
-> .agents/skills/release-packaging-development/SKILL.md
-> inspect engine/paths.rs + app_bootstrap.rs + current callers only
```

## Current Mode

**Developing** — next bounded slice only.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust/TypeScript/Python execution, static-validator execution, actual model files/load,
translation quality, CUDA/CPU latency, Windows audio, packaged installer execution,
installed operation, and clean-machine proof remain `LOCAL PROOF REQUIRED`.

# Closed Source Boundaries

The current core already has these bounded source contracts:

```text
Translation
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id

Meeting lifecycle
Ready -> Starting -> Live -> Stopping -> Ended

Normal navigation
Meeting / Text / Settings

Normal Settings
Meeting / Advanced
```

Normal Meeting/Text requests are mode-free and tone-free. Meeting outbound depends on
ID->EN; reverse EN->ID remains separately degradable for optional incoming. Text
readiness follows the selected direction. History/Saved, Pause/Resume, Tone/Context,
and user-facing Realtime/Quality remain outside the initial core.

# Closed Plan — Local Model Asset Delivery + Acceptance

## Evidence that controls the plan

Current source shows:

```text
tauri.conf.json
-> bundle active
-> Windows target = NSIS
-> no runtime-asset resource mapping yet

.gitignore
-> ASR/Translation/Piper model bytes stay out of Git

ProjectPaths::discover()
-> currently assumes repository-style EngineData + UserData root

helper bridge
-> currently falls back to .venv / environment / system Python

model_manifest.json
-> metadata only; model bytes are not repository content
```

The current core model payload is already too large for a sensible single standard NSIS
installer: the primary faster-whisper model is roughly 1.62 GB and the two selected
Marian PyTorch checkpoints add roughly another 0.58 GB before Python/Torch/TTS/runtime
files. A monolithic NSIS bundle is therefore rejected rather than made into a fragile
release constraint.

## Selected controlled-release topology

```text
TranslateIT release package
├─ TranslateIT_<version>_x64-setup.exe
└─ payload/
   ├─ required runtime payload(s)
   ├─ ASR payload
   ├─ marianmt-id-en payload
   └─ marianmt-en-id payload
```

The user runs Setup only. The payload is release-owned input, not something the user
places manually.

Initial release behavior must be:

```text
local setup + local payload
-> verify expected release payload
-> install/copy to canonical packaged runtime location
-> launch TranslateIT
```

Do **not** add by default:

```text
first-run internet model downloader
in-app package manager
manual Hugging Face/Python setup
silent cloud fallback
NLLB fallback
generic capability-profile framework
```

A network downloader can be reconsidered later only if controlled local-payload
distribution proves operationally worse.

## Required versus optional is boundary-specific

Release acceptance requires **both** Marian directions because standalone Text is an
ID<->EN core capability:

```text
release payload gate
marianmt-id-en = required
marianmt-en-id = required
```

Meeting runtime readiness remains intentionally different:

```text
required Meeting outbound Start
marianmt-id-en = required

optional incoming
marianmt-en-id missing
-> incoming/reverse capability unavailable/degraded
-> healthy ID->EN outbound is not blocked
```

Do not collapse these two gates into one global `required` flag.

## Reproducible release identity

The release asset contract should stay small. For each externally sourced model payload,
release inputs need at minimum:

```text
repo/source ID
immutable source revision/commit
expected installed target
release payload/archive SHA-256
```

`model_manifest.json` remains the model identity/inventory owner. Release staging may
add the release artifact/hash boundary when implemented, but must not become a second
model-selection registry.

## Installed path architecture

Current repository-style path discovery is not sufficient for an installed product.
The target split is:

```text
immutable packaged runtime root
-> worker/runtime/model/voice assets
-> resolved from the installed Tauri resource/runtime location

writable application-local data root
-> CacheData
-> LogData
-> future approved persistent user data
-> resolved from the Windows app-local data location

repository development root
-> bounded development fallback only
```

`engine/paths.rs` remains the semantic path owner. `app_bootstrap.rs` is the existing
Tauri setup boundary that can provide installed path information. Do not create a second
path service.

# Next Developing Slice — Packaged Runtime Layout Foundation

## Goal

Make runtime path ownership valid for both repository development and a future installed
Tauri build before adding installer payload hooks.

## In scope

1. extend the existing `ProjectPaths` owner to distinguish immutable packaged runtime
   assets from writable app-local user data;
2. initialize installed-path context through the existing Tauri `app_bootstrap` setup
   boundary using current Tauri v2 path APIs;
3. preserve a bounded repository-development fallback so current source/dev execution
   does not require an installer;
4. route current runtime/model/worker path consumers through that one canonical owner;
5. add/update only the static source/package checks needed to prevent regression;
6. reconcile canonical docs after the source slice.

## Out of scope

- NSIS external-payload copy/install hooks;
- downloading model bytes;
- committing model binaries;
- choosing a Python freezing/embedding mechanism;
- building an installer in ChatGPT -> GitHub;
- runtime/model quality or clean-machine testing;
- changing translation models;
- reopening deferred product features.

## Acceptance criteria

1. installed runtime resources and writable user data no longer depend on finding an
   `EngineData + UserData` repository root beside the executable;
2. one `ProjectPaths` semantic owner supplies runtime asset, worker, cache, and log roots;
3. packaged/runtime asset paths are immutable-install paths while user cache/log paths
   resolve to an app-writable Windows application-data location;
4. repository/dev fallback is explicit and cannot masquerade as installed-path proof;
5. no new downloader, path registry, or second runtime owner is introduced.

# Later Release Slices Already Bounded By This Plan

After the path foundation is source-aligned, release work can proceed separately:

```text
1. release payload contract + pinned revisions/hashes
2. NSIS local sidecar payload hook/staging
3. packaged Python/helper dependency delivery
4. local build/install/clean-machine acceptance
```

The current helper still relying on `.venv`, environment override, or system Python is
therefore an explicit release gap, not an acceptable installed-user setup.

## Hold

- do not make the user install Python, uv, pip, or models;
- do not bundle all large AI payloads into one standard NSIS executable merely to claim
  a one-file installer;
- do not add a first-run downloader while controlled local payload delivery is the
  selected initial strategy;
- do not make EN->ID reverse availability block healthy Meeting outbound;
- do not claim package/runtime success from source or manifest presence.

## Next Step

Implement **Packaged Runtime Layout Foundation** through the existing `engine/paths.rs`
and Tauri `app_bootstrap.rs` owners, then stop before NSIS payload-hook implementation.
# TranslateIT — Source Ownership

Current responsibility → primary owner map for branch `Local`. This file answers **who owns what**; active status belongs in `next-action.md`, durable reasons in `decision-log.md`, and actual behavior in current source plus matching verification.

## Repository governance

| Responsibility | Primary owner |
|---|---|
| GitHub branch/ref, tool fit, writes, CI/API/security, retries, STOP | `GITHUB_RULES.md` |
| Boot, work modes, continuity routing, skill budget | `AGENTS.md` |
| Stable product/repository orientation | `CONTEXT.md` |
| Active continuation / exactly one next step | `docs/knowledge/next-action.md` |
| Durable decisions/reasons | `docs/knowledge/decision-log.md` |
| Product/system requirements | `docs/foundation/` |
| Static governance verification | `tools/verify_repository.py` + `.github/workflows/repository-verify.yml` |
| Command parity gate (registry <-> bridge) | `EngineData/Frontend/RustApp/scripts/validate_command_parity.mjs` |

## Product / frontend

| Responsibility | Primary owner |
|---|---|
| Product scope | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` |
| App/navigation composition | `EngineData/Frontend/RustApp/src/App.svelte` |
| Setup | `src/pages/FirstSetup.svelte` |
| Meeting | `src/pages/Meeting.svelte` + `src/components/meeting/` |
| Text | `src/pages/Text.svelte` |
| My Voice | `src/pages/MyVoice.svelte` + `src/components/my-voice/` |
| My Voice recording/build bridge | `src/app/bridge/myVoiceApi.ts` + `src/app/bridge/myVoiceBuildApi.ts` |
| Product runtime/readiness projection | `src/app/bridge/runtimeProductFacade.ts` |
| General runtime bridge | `src/app/bridge/runtimeApi.ts` |
| Shared visual tokens/layout | `src/styles/tokens.css`, `src/styles/app.css` |

## Desktop / Meeting runtime

| Responsibility | Primary owner |
|---|---|
| Tauri invoke registry | `src-tauri/src/commands/registry.rs` |
| Meeting runtime | `src-tauri/src/commands/meeting_session.rs` + `src-tauri/src/engine/runtime_state.rs` |
| Settings / persisted settings | `src-tauri/src/commands/settings.rs` + `src-tauri/src/engine/settings.rs` |
| Safe application/runtime/user paths | `src-tauri/src/engine/paths.rs` |
| Packaged private Python resolution | `src-tauri/src/commands/bridge_paths.rs` |
| Persistent Python worker bridge | `src-tauri/src/commands/helper_bridge.rs` + `helper_bridge_runtime.rs` |
| Microphone capture | `src-tauri/src/engine/audio/live_capture.rs` |
| Deferred incoming queue | `src-tauri/src/commands/meeting_session.rs` (embedded subsystem) |
| Meeting translated output | `src-tauri/src/engine/audio/meeting_output.rs` |
| Virtual Meeting microphone | `src-tauri/src/commands/virtual_mic_route.rs` |

## Local AI / My Voice

| Responsibility | Primary owner |
|---|---|
| Worker process / newline-JSON entrypoint | `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py` + `realtime_local_worker_base.py` |
| Worker paths/limits/device probes/helpers | `worker_runtime_common.py` |
| ASR + Voice Actor runtime | `worker_io_runtime.py` + `voice_lab_gpt_sovits.py` |
| Canonical ID ↔ EN MiLMMT runtime | `milmmt_translation_provider.py` |
| Standalone Text segmentation | `realtime_local_worker_base.py` + `translation_envelope.py` |
| My Voice model build | `voice_lab_build.py` + `voice_lab_upstream_stage.py` |
| Built-in voice packs & selection | `RuntimeAssets/Voice/BuiltInVoices` + `select_builtin_voice` (`voice_lab_build.rs`) |
| Worker dependency graph | `pyproject.toml` + `uv.lock` |
| Model inventory / immutable identity | `model_manifest.json` |
| Hugging Face acquisition / revision marker | `prepare_model_assets.py` + `prepare_model_assets_core.py` |
| Runtime asset payload | `EngineData/Backend/RuntimeAssets/` |
| MiLMMT static contract | `tools/translation_quality/validate_canonical_milmmt_repo.py` + `.github/workflows/milmmt-repo-contract.yml` |

## R3 release / packaging

| Responsibility | Primary owner |
|---|---|
| Small Tauri Setup resource map + per-machine NSIS mode | `EngineData/Frontend/RustApp/src-tauri/tauri.release.conf.json` |
| Controlled release input staging | `scripts/stage_release_inputs.ps1` |
| Model revision verification | `scripts/validate_release_model_revisions.mjs` |
| Complete staged payload validation | `scripts/validate_release_payload.mjs` |
| Release-only payload optimization | `scripts/optimize_release_payload.py` |
| External 7z/LZMA2 payload + trusted build hook | `scripts/build_r3_external_payload.py` |
| NSIS payload lifecycle source | `src-tauri/windows/r3_payload_hooks.template.nsh` + `r3_payload_installer.ps1` |
| R3 release/source checks | `scripts/validate_release_package_contract.mjs` + `validate_tauri_package_preflight.mjs` |
| Controlled Windows release entry | `scripts/build_release.ps1` |
| Hosted R3 verification | `.github/workflows/release-payload-verify.yml` |
| VB-CABLE release bytes/notice | `EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/` |
| Third-party notice generation | `scripts/generate_third_party_notices.mjs` |
| Installed runtime manifest | generated by `r3_payload_installer.ps1` at `EngineData/Backend/TRANSLATEIT_INSTALLED_RUNTIME.json` (installed evidence, not source owner) |

## Dependency / CI owners

| Responsibility | Primary owner |
|---|---|
| Frontend dependencies | `EngineData/Frontend/RustApp/package.json` + `package-lock.json` |
| Rust dependencies | `src-tauri/Cargo.toml` + `Cargo.lock` |
| Worker Python dependencies | `WorkerRuntime/pyproject.toml` + `uv.lock` |
| Read-only WorkerRuntime lock consistency | `.github/workflows/workerruntime-lock.yml` |
| Repository governance | `.github/workflows/repository-verify.yml` |

## Specialist routing

| Area | Specialist |
|---|---|
| Desktop shell/navigation/state/settings | `desktop-runtime-development` |
| Visual UI | `desktop-ui-design-development` |
| ASR/translation/TTS/model runtime | `local-ai-runtime-development` |
| Physical Windows audio/Meeting microphone | `windows-audio-runtime-development` |
| Installer/private runtime/models/provider distribution | `release-packaging-development` |

## Ownership rules

```text
Who owns this?          → this file
What must it do?        → named current owner / foundation requirements
What is active now?     → next-action.md
Why was it chosen?      → decision-log.md
What actually works?    → current source + matching verification
```

Create a new owner only when the existing owner cannot represent the responsibility without mixing unrelated jobs. Do not create duplicate services, registries, state stores, compatibility layers, or workflows merely because a current filename is inconvenient.

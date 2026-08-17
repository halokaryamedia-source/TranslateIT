# TranslateIT — Source Ownership

Current responsibility → owner map for branch `New`.

This file answers **who owns what**. It does not own current milestone/status, proof results, or durable rationale. Active continuation belongs in `next-action.md`; durable reasons belong in `decision-log.md`; actual behavior is current source plus relevant proof.

## Repository operating owners

| Responsibility | Canonical owner |
|---|---|
| GitHub branch/ref, tool fit, write/history, CI/API/security, retries, STOP | `GITHUB_RULES.md` |
| Boot, work modes, source precedence, continuity routing, skill budget | `AGENTS.md` |
| Stable product/repository orientation | `CONTEXT.md` |
| Active continuation / one next step | `docs/knowledge/next-action.md` |
| Durable decisions/reasons | `docs/knowledge/decision-log.md` |
| Product/system requirements | `docs/foundation/` |
| Work-mode routing reference | `docs/knowledge/flow.md` |
| Specialist selection/inventory | `docs/knowledge/skills/` |
| Non-trivial Developing contract | `.agents/skills/development-brief/SKILL.md` |
| Static governance verification | `tools/verify_repository.py` + `.github/workflows/repository-verify.yml` |

## Product and frontend owners

| Responsibility | Canonical owner |
|---|---|
| Product scope / familiar UI contract | `docs/foundation/01-product-overview.md`, `docs/foundation/02-product-requirements.md` |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` |
| Frontend application / workspace projection | `EngineData/Frontend/RustApp/src/App.svelte` |
| First Setup | `EngineData/Frontend/RustApp/src/pages/FirstSetup.svelte` |
| Meeting UI | `EngineData/Frontend/RustApp/src/pages/Meeting.svelte`, `src/components/meeting/MeetingActivity.svelte` |
| Text UI | `EngineData/Frontend/RustApp/src/pages/Text.svelte` |
| VoiceLab page | `EngineData/Frontend/RustApp/src/pages/VoiceLab.svelte` |
| VoiceLab build/evaluation UI | `EngineData/Frontend/RustApp/src/components/voice-lab/VoiceLabBuild.svelte` |
| Primary navigation | `EngineData/Frontend/RustApp/src/components/layout/Sidebar.svelte` |
| Semantic visual tokens | `EngineData/Frontend/RustApp/src/styles/tokens.css` |
| Shared application composition / normal UI CSS | `EngineData/Frontend/RustApp/src/styles/app.css` |
| Product runtime facade/readiness projection | `EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts` |
| General runtime bridge | `EngineData/Frontend/RustApp/src/app/bridge/runtimeApi.ts` |
| VoiceLab recording bridge | `EngineData/Frontend/RustApp/src/app/bridge/voiceLabApi.ts` |
| VoiceLab build bridge | `EngineData/Frontend/RustApp/src/app/bridge/voiceLabBuildApi.ts` |

## Desktop / Meeting runtime owners

| Responsibility | Canonical owner |
|---|---|
| Tauri invoke registration | `EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs` |
| Meeting application authority | `EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs` + `EngineData/Frontend/RustApp/src-tauri/src/engine/runtime_state.rs` |
| Shared runtime command boundary | `EngineData/Frontend/RustApp/src-tauri/src/commands/runtime.rs` |
| Settings transaction / device preferences | `EngineData/Frontend/RustApp/src-tauri/src/commands/settings.rs` |
| Persisted settings schema/sanitization | `EngineData/Frontend/RustApp/src-tauri/src/engine/settings.rs` |
| Runtime settings projection | `EngineData/Frontend/RustApp/src-tauri/src/engine/runtime_settings.rs` |
| Safe application paths | `EngineData/Frontend/RustApp/src-tauri/src/engine/paths.rs` |
| Packaged private Python resolver | `EngineData/Frontend/RustApp/src-tauri/src/commands/bridge_paths.rs` + `EngineData/Frontend/RustApp/src-tauri/src/engine/paths.rs` |
| Canonical microphone capture | `EngineData/Frontend/RustApp/src-tauri/src/engine/audio/live_capture.rs` |
| Meeting translated output | `EngineData/Frontend/RustApp/src-tauri/src/engine/audio/meeting_output.rs` |
| Meeting virtual route / matched pair | `EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_mic_route.rs` |
| Capture lifecycle / Mic Test boundaries | `EngineData/Frontend/RustApp/src-tauri/src/engine/capture_lifecycle.rs` + `EngineData/Frontend/RustApp/src-tauri/src/commands/runtime_capture.rs` |
| Windows lifecycle convergence | current Tauri main-window / canonical Meeting Stop wiring |

## VoiceLab owners

| Responsibility | Canonical owner |
|---|---|
| VoiceLab actor/storage/promotion contract | `EngineData/Frontend/RustApp/src-tauri/src/commands/voice_lab.rs` |
| Guided recording commands/script | `EngineData/Frontend/RustApp/src-tauri/src/commands/voice_lab_recording.rs` |
| VoiceLab build/evaluation desktop owner | `EngineData/Frontend/RustApp/src-tauri/src/commands/voice_lab_build.rs` |
| Guided audio sink/resampling | `EngineData/Frontend/RustApp/src-tauri/src/engine/audio/guided_take.rs` |
| Shared PCM16 WAV writing | `EngineData/Frontend/RustApp/src-tauri/src/engine/audio/live_segment_writer.rs` |
| One-shot training/evaluation child | `EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_build.py` |
| GPT-SoVITS build/inference adapter | `EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_gpt_sovits.py` |
| Headless upstream training stage boundary | `EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_upstream_stage.py` |
| Approved persistent actor | `UserData/SavedProject/VoiceLab/MyVoice` through VoiceLab storage owners |
| Temporary VoiceLab build data | `UserData/CacheData/VoiceLab` through VoiceLab storage owners |

## Local AI runtime owners

| Responsibility | Canonical owner |
|---|---|
| Canonical helper bridge | `EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs` + `EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs` |
| Normal ASR / translation / trained-voice worker | `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py` |
| Voice Actor preflight/synthesis worker commands | `realtime_local_worker.py::handle_voice_actor_preflight`, `handle_voice_actor_synthesize` |
| Loaded trained-actor cache | `realtime_local_worker.py::get_voice_actor_runtime` + `voice_lab_gpt_sovits.py::load_voice_actor_runtime` |
| Worker Python dependency graph | `EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml` + `uv.lock` |
| Release model inventory | `EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json` |
| ASR / translation / Voice runtime assets | `EngineData/Backend/RuntimeAssets/` according to model manifest / release contract |

## Release and packaging owners

| Responsibility | Canonical owner |
|---|---|
| Tauri release resource map | `EngineData/Frontend/RustApp/src-tauri/tauri.release.conf.json` |
| Release payload validation | `EngineData/Frontend/RustApp/scripts/validate_release_payload.mjs` |
| Release package/source contract | `EngineData/Frontend/RustApp/scripts/validate_release_package_contract.mjs` |
| Controlled Windows release entry | `EngineData/Frontend/RustApp/scripts/build_release.ps1` |
| Meeting audio provider release payload | `EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/` + release resource/validator owners |
| Third-party notice generation | `EngineData/Frontend/RustApp/scripts/generate_third_party_notices.mjs` |
| Installed private Python runtime | `EngineData/Backend/LocalWorker/PythonRuntime/python.exe` as controlled release input |
| Installed WorkerRuntime | `EngineData/Backend/LocalWorker/WorkerRuntime/` filtered by release contract |
| Current packaging-format decision | product/release policy + `docs/knowledge/next-action.md`; implementation only after explicit decision |

## Dependency owners

| Responsibility | Canonical owner |
|---|---|
| Frontend dependencies | `EngineData/Frontend/RustApp/package.json` + `package-lock.json` |
| Rust dependencies | `EngineData/Frontend/RustApp/src-tauri/Cargo.toml` + `Cargo.lock` |
| Worker Python dependencies | `EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml` + `uv.lock` |

## Specialist ownership

| Semantic boundary | Project specialist |
|---|---|
| Desktop shell/navigation/state/readiness/settings integration | `desktop-runtime-development` |
| Visual hierarchy/layout/tokens/rendered UI acceptance | `desktop-ui-design-development` |
| Local ASR/translation/TTS/model/provider/runtime | `local-ai-runtime-development` |
| Physical mic/capture/segmentation/Windows devices/Meeting route | `windows-audio-runtime-development` |
| Installer/package/private runtime/models/provider distribution | `release-packaging-development` |

`development-brief` is the non-trivial Developing front door and does not replace these semantic owners.

## Ownership rules

```text
Who owns this?
→ this file

What exactly must it do?
→ open the named current owner / foundation contract

What is active now?
→ next-action.md

Why was a durable choice made?
→ decision-log.md

What actually works?
→ current source + matching proof
```

Do not put milestone labels such as `A6 CLOSED`, `P4`, `R3`, run IDs, or other active-status fields into this map. Ownership should remain stable when milestones move.

Create a new owner only when an existing owner cannot represent the responsibility without mixing unrelated jobs. Do not create a new service, state store, config authority, registry, compatibility layer, or workflow solely because the current filename is inconvenient.

# TranslateIT — Current Context

Stable orientation for TranslateIT on branch `New`. Active continuation belongs in `docs/knowledge/next-action.md`; durable reasoning belongs in `docs/knowledge/decision-log.md`; detailed ownership belongs in `docs/knowledge/source-ownership.md`.

## Authority

- Development authority: `New`.
- `Developing` is the only retained historical/recovery branch and is not current product authority.
- `DevelopingData`, old reports, generated proof artifacts, and Git history are bounded recovery evidence only.
- Product policy is owned by `docs/foundation/01-product-overview.md` and `docs/foundation/02-product-requirements.md`.
- GitHub execution discipline is owned by root `GITHUB_RULES.md`.

## Product target

TranslateIT is a local-first Windows translator focused on Indonesian and English.

Approved top-level product:

```text
Meeting
Text
VoiceLab
Settings
```

Primary Meeting outbound:

```text
Indonesian speech
→ final Indonesian transcript
→ English translation
→ approved trained My Voice
→ TranslateIT Meeting Microphone
```

Optional incoming assistance:

```text
English Meeting Sound
→ final English transcript
→ Indonesian text
```

Text supports explicit Indonesian ↔ English translation independently from Meeting audio and VoiceLab readiness.

Normal Meeting lifecycle:

```text
Ready → Starting → Live → Stopping → Ended
```

Pause/Resume, Push to Talk, general History/Saved, Documents, Audio Studio/broadcast workflows, multiple voice engines/profiles, quick-clone/import-audio VoiceLab modes, additional languages, user-facing Realtime/Quality or tone/context modes, partial translated subtitles, incoming Indonesian TTS, and automatic mid-session Meeting Sound rebind remain outside the approved initial boundary.

## Runtime architecture

```text
Tauri 2 desktop application
├─ Svelte 5 frontend
├─ Rust desktop/runtime backend
└─ one canonical Python local worker for normal ASR / translation / TTS inference
```

Rust owns Meeting/session authority, Windows audio integration, routing, settings, paths, and desktop integration.

The canonical Python worker owns local ASR, direction-based Indonesian ↔ English translation, and daily trained Voice Actor inference.

VoiceLab training is a bounded occasional build operation. It does not create a second daily inference worker or a second product/runtime authority.

## Frontend architecture

Approved frontend stack:

```text
Tauri 2
+ Svelte 5
+ Vite
+ TypeScript
+ Tailwind CSS 4
+ semantic CSS custom-property tokens
+ selective Bits UI
+ @lucide/svelte
```

Current application graph is one Svelte mount through `src/main.ts` and `src/App.svelte`, with normal product pages:

```text
FirstSetup
Meeting
Text
VoiceLab
Settings
```

Svelte owns presentation/application state, not duplicate Rust/runtime truth. Normal-user UI remains product-facing; runtime, worker, model, CUDA, provider, queue, checkpoint, and pipeline detail belongs in Advanced / Diagnostics.

## Translation contract

- Meeting required outbound is Indonesian → English.
- Text supports Indonesian → English and English → Indonesian.
- Current worker routes those directions through the canonical Marian model owners.
- Finalized stable speech is normal Meeting translation truth.
- Source text is not silently truncated and known incomplete generation is not promoted as complete.
- Previous turns, general History, and standalone Text are not automatic model context.
- Optional incoming may degrade/disable without blocking safe outbound.

## VoiceLab and My Voice

VoiceLab is required before final target-Windows release acceptance.

Canonical direction:

```text
guided English recording
→ replay / accept / retry
→ GPT-SoVITS V2ProPlus fine-tuning
→ held-out evaluation
→ user listening approval
→ atomic promotion to My Voice
```

Approved engine baseline remains GPT-SoVITS V2ProPlus pinned to the repository-recorded upstream revision.

Quality is prioritized over instant creation. Normal application startup, Meeting startup, and each translated utterance do not retrain the actor.

Training and an active Meeting are mutually exclusive in the initial product.

One approved persistent actor exists:

```text
UserData/SavedProject/VoiceLab/MyVoice
```

Temporary recordings, prepared data, checkpoints, generated evaluations, and build evidence belong under:

```text
UserData/CacheData/VoiceLab
```

A rebuild cannot replace the approved actor until the new candidate has completed evaluation and explicit user approval.

Meeting Start performs generation-bound My Voice readiness and binds the approved actor identity to that Meeting generation. Live synthesis fails closed if the approved identity changes or becomes unavailable; alternate fallback voices are not required outbound authority.

## Meeting and audio ownership

`commands/meeting_session.rs` + `engine/runtime_state.rs` remain the application Meeting authority.

Start is transactional: required outbound readiness must succeed before `Live`. Stop revokes output authority before cleanup and converges capture, output, helper, and transient Meeting state through the canonical Stop path.

The Meeting Microphone runtime route consumes one matched Windows virtual-audio playback/recording pair. Runtime detection/delivery remains owned by Rust/CPAL.

The initial release provider direction is the standard VB-Audio VB-CABLE package. Provider distribution/installation is a release boundary, not a second audio runtime owner.

Actual driver installation, elevation/restart behavior, endpoint appearance, matched-pair behavior, and Zoom/Meet/Teams reception remain target-Windows evidence.

## Persisted settings

The current persisted settings schema is version 6 and keeps the small Meeting-oriented settings boundary:

```text
schema_version
source_language
target_language
meeting_setup_state
meeting_setup_checkpoint
audio.input_device_id
audio.output_device_id
```

`engine/settings.rs` is the schema/sanitization owner. VoiceLab does not introduce a multi-profile selector or second settings store.

## Release architecture

Installed Python execution remains one private application runtime:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
└─ PythonRuntime/
   └─ python.exe
```

Models remain under `EngineData/Backend/RuntimeAssets`.

The controlled release source path is:

```text
controlled payload staging
→ release-input validation / notice generation
→ scripts/build_release.ps1
→ Tauri release configuration
→ Windows bundle input
```

Release inputs include the private Python runtime, required ASR and bidirectional translation assets, GPT-SoVITS/VoiceLab assets, required local language data, the reviewed FFmpeg payload, the standard VB-CABLE provider payload, and required third-party notice material.

Repository `.venv`, system-Python discovery, unrelated GPT-SoVITS WebUI/server/UVR tooling, and first-use model download are not the approved installed-runtime path.

## Packaging boundary

The current controlled offline payload is approximately 9.4 GB. Hosted R3 evidence established that the payload can be staged and preflighted and that the Tauri application executable can build, but the standard classic-NSIS single-executable packaging path hits a large-installer mmap/offset boundary. Disabling NSIS compression did not remove that boundary.

This is a packaging-format decision, not evidence that the application/runtime/model source is broken.

The active release decision is whether to preserve one user-facing fully offline setup experience while allowing installer + colocated external payload file(s), or approve another explicitly evaluated packaging boundary. Do not silently introduce a bootstrap download system, alternate installer framework, model/runtime reduction, or another release architecture before that decision.

## Evidence boundary

GitHub/static/hosted proof may establish source ownership, compile/test behavior, bounded hosted execution, deterministic staging, and packaging-format behavior actually exercised by the runner.

It does not establish:

```text
real trained-speaker quality
target CUDA/VRAM practicality
real custom-TTS latency
physical microphone behavior
driver installation/restart behavior
Meeting virtual-audio delivery
Zoom/Meet/Teams reception
sleep/wake behavior on target hardware
installed private-runtime execution
clean-machine operation
```

Those remain target-capable proof. Local Windows validation is currently deferred until explicitly reactivated.

## Repository operating direction

- `New` is pinned explicitly for current work.
- Read only the minimum context that can change the decision.
- Diagnose the first wrong owner before editing.
- Use `development-brief` for non-trivial Developing.
- Use at most one TranslateIT project specialist per bounded Developing slice.
- Prefer one canonical owner and the minimum complete solution.
- Match proof to the exact claim.
- Keep active continuation compact.
- Stop when the requested acceptance boundary is satisfied.

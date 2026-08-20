# TranslateIT — Current Context

Stable orientation for branch `Local`. Active continuation belongs in `docs/knowledge/next-action.md`; durable historical reasoning remains in `docs/knowledge/decision-log.md`; detailed ownership remains in `docs/knowledge/source-ownership.md`.

## Authority

- Development authority: `Local`.
- Product policy: `docs/foundation/01-product-overview.md` and `docs/foundation/02-product-requirements.md`.
- GitHub execution discipline: `GITHUB_RULES.md`.
- Target Windows evidence is required only for claims that depend on actual GPU, audio devices, installed runtime, or real Meeting applications.

## Product target

TranslateIT is a local-first Windows Indonesian ↔ English translator with four approved top-level areas:

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

## Runtime architecture

```text
Tauri 2 desktop application
├─ Svelte 5 frontend
├─ Rust desktop/runtime backend
└─ one canonical Python WorkerRuntime for ASR / translation / Voice Actor inference
```

Rust owns Meeting/session authority, Windows audio integration, routing, settings, paths, and desktop integration. The Python worker owns local ASR, Indonesian ↔ English translation, and trained Voice Actor inference. VoiceLab training is a bounded build operation, not a second daily inference runtime.

## Translation contract

Canonical translator:

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
one resident model for ID → EN and EN → ID
PyTorch / Transformers 4.57.6
CUDA BF16 primary
CPU fallback remains explicit degraded operation
```

Runtime rules:

- use the official Xiaomi translation prompt;
- deterministic generation (`do_sample=false`);
- decode causal continuation only, never the prompt;
- preserve semantic-unit planning for standalone Text;
- never silently truncate source text;
- reject known incomplete generation instead of promoting partial output;
- require the exact RuntimeAssets revision marker before declaring the model ready;
- do not retain M2M100, Marian, or another translator as an automatic fallback/router.

The canonical WorkerRuntime pins Transformers 4.57.6, matching the selected MiLMMT quality/latency authority. The former 4.50.0 compatibility result remains historical evidence only: it executed all 24 representative cases but changed 8 deterministic outputs and was materially slower. Keep `pyproject.toml`, `uv.lock`, release-license material, and repo validators synchronized with the 4.57.6 boundary.

## ASR and VoiceLab

ASR primary remains `dropbox-dash/faster-whisper-large-v3-turbo`, with the existing medium fallback boundary. Voice Actor inference remains GPT-SoVITS V2ProPlus and one approved persistent actor under:

```text
UserData/SavedProject/VoiceLab/MyVoice
```

A rebuild cannot replace the approved actor until evaluation and explicit user approval complete. Meeting Start binds the approved actor identity to that Meeting generation and fails closed if it changes or becomes unavailable.

## Runtime assets

Installed private runtime remains:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
└─ PythonRuntime/
```

Models remain under `EngineData/Backend/RuntimeAssets`. Hugging Face assets are acquired from `WorkerRuntime/model_manifest.json` at immutable revisions. Successful acquisition writes `.translateit_model_revision`; model presence without the expected marker is not readiness proof.

## Evidence boundary

Repository/static proof may establish source ownership, syntax/contracts, unit behavior with mocks, deterministic staging, dependency-lock consistency, and packaging structure.

It does **not** establish real target GPU latency/VRAM, trained-speaker quality, physical microphone behavior, driver behavior, virtual-audio delivery, Zoom/Meet/Teams reception, installed private-runtime execution, or clean-machine operation.

Target-PC validation is intentionally deferred while repo-side MiLMMT integration and hardening are completed.

## Repository operating direction

- Keep `Local` explicit for current work.
- Prefer one canonical owner and one runtime path.
- Diagnose the first wrong owner before editing.
- Keep source, manifest, tests, smoke tooling, and continuity authority synchronized.
- Match proof to the exact claim; never upgrade static evidence into a target-PC claim.
- Avoid duplicate runtime environments, duplicate translator providers, and compatibility aliases that silently preserve retired production behavior.

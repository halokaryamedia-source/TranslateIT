# TranslateIT

**Local-first Windows desktop translation for Indonesian ↔ English meetings.**

> Working development authority: `Local`. Stable/default repository authority: `main`. Source/CI presence is not proof of target-Windows runtime, GPU, audio-route, installer or clean-machine behavior.

## Product

```text
Meeting
Text
My Voice
Settings
```

### Meeting

Required outbound:

```text
Indonesian speech
→ final Indonesian transcript
→ English translation
→ selected Meeting voice
   ├─ Built-in Male/Female
   └─ approved My Voice
→ TranslateIT Meeting Microphone
→ meeting application
```

Optional incoming assistance:

```text
English Meeting Sound
→ final English transcript
→ Indonesian translated text
```

Normal lifecycle:

```text
Ready → Starting → Live → Stopping → Ended
```

Outbound Meeting translation may use the last three committed own-voice translation pairs from the same live session as bounded context. Incoming remains context-free.

### Text

Standalone Indonesian ↔ English text translation with explicit direction, Translate, result review and Copy. Document/file translation is not current scope.

### My Voice

Meeting works on day one with two built-in English voice references. My Voice is an optional high-fidelity upgrade created from the user's authorized recordings:

```text
guided recording
→ replay / accept / retry
→ GPT-SoVITS V2ProPlus training
→ held-out evaluation
→ user approval
→ approved reusable My Voice
```

### Current exclusions

General History/Saved UI, Document Translation, Audio Studio, Push to Talk, Pause/Resume, user-facing Realtime/Quality or tone modes, additional languages, imported-audio/quick-clone My Voice modes, multiple normal voice engines, partial translated subtitles, incoming Indonesian TTS and automatic mid-session Meeting Sound rebind are outside the current product boundary.

## Architecture

```text
Tauri 2
├─ Svelte 5 + Vite + TypeScript
├─ Rust desktop/runtime backend
└─ one canonical Python local worker
   ├─ ASR
   ├─ Indonesian ↔ English translation
   └─ GPT-SoVITS voice runtime
```

Canonical roots:

```text
EngineData/Frontend/RustApp/
EngineData/Backend/LocalWorker/WorkerRuntime/
EngineData/Backend/RuntimeAssets/
UserData/
```

Historical development material is retained by Git history rather than exposed as a second current source tree.

## Repository operating model

```text
AGENTS.md
→ execution context / work mode / semantic routing

GITHUB_RULES.md
→ branch/ref / GitHub-first partition / atomic delivery / CI / security / retry / STOP

CONTEXT.md
→ stable orientation

docs/foundation/
→ current product/system law

docs/knowledge/next-action.md
→ current continuation + exactly one next step

docs/knowledge/current-validation.md
→ proof interpretation
docs/knowledge/source-ownership.md
→ responsibility → current owner

docs/knowledge/decisions/
→ durable decisions and reasons
```

Normal GitHub work follows:

```text
PIN
→ EXECUTION CONTEXT
→ EXHAUST REMOTE_GITHUB PARTITION
→ READ MINIMUM
→ DIAGNOSE
→ TOOL + TRANSFER GATE
→ WRITE ONCE
→ VERIFY + FAILURE POLICY
→ STOP
```

## Branch model

```text
Local
→ active development / working authority

main
→ stable/default repository history
```

Non-trivial/high-impact work should use a bounded task branch based on `Local` and a PR back to `Local`; squash is preferred so one logical outcome becomes one `Local` commit. Stable promotion is a dedicated `Local → main` PR using the `Stable Release Gate` and a normal merge commit.

## Development entrypoints

Desktop:

```bash
cd EngineData/Frontend/RustApp
npm ci
npm run validate:quick
npm run build:frontend
```

Worker:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/
pyproject.toml + uv.lock
```

Repository policy:

```bash
python tools/verify_repository.py
```

Use only proof required by the changed claim. Hosted/static proof does not become target-Windows proof.

## Release boundary

Current controlled offline distribution uses:

```text
TranslateIT-Setup.exe
TranslateIT-Payload.7z
```

Setup owns validating and installing its colocated payload, private Python/runtime/model assets and supported Meeting audio provider inputs. Normal users are not asked to run pip, manually extract runtime assets or download core models.

Publishing a tag/GitHub Release is a separate explicit action and is not automatic after a stable `main` promotion.

## Security / contribution

See `SECURITY.md` and `CONTRIBUTING.md`. Public repository visibility does not itself grant reuse or redistribution rights; license policy remains an explicit owner decision.

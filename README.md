# TranslateIT

**Local-first Windows desktop translation for Indonesian ↔ English meetings.**

> **Development authority:** branch `New`. Repository/source presence is not proof of target-Windows runtime, device, model, audio-route, installer, or clean-machine readiness.

## Product

Current top-level navigation:

```text
Meeting
Text
VoiceLab
Settings
```

### Meeting

Required outbound:

```text
Indonesian speech
→ final Indonesian transcript
→ English translation
→ approved trained My Voice
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

### Text

Standalone Indonesian ↔ English text translation with explicit direction, Translate, editable result, and Copy.

### VoiceLab

VoiceLab creates one approved reusable `My Voice` actor from the user's authorized voice:

```text
guided English recording
→ replay / accept / retry
→ GPT-SoVITS V2ProPlus training
→ held-out evaluation
→ user listening approval
→ My Voice
```

Training is occasional. Normal Meeting use reuses the approved actor without retraining.

### Settings

Normal settings focus on Meeting devices/setup. Technical runtime/model information belongs in Advanced / Diagnostics.

## Initial boundary

Current initial product intentionally excludes general History/Saved UI, Documents, Audio Studio/broadcast workflows, Push to Talk, Pause/Resume, user-facing Realtime/Quality or tone/context modes, additional languages, imported-audio/quick-clone VoiceLab modes, multiple voice engines/profiles, partial translated subtitles, incoming Indonesian TTS, and automatic mid-session Meeting Sound rebind.

## Architecture

```text
Tauri 2 desktop application
├─ Svelte 5 frontend
├─ Rust desktop/runtime backend
└─ one canonical Python local worker
   ├─ ASR
   ├─ Indonesian ↔ English translation
   └─ trained My Voice inference
```

Canonical implementation roots:

```text
EngineData/Frontend/RustApp/
→ Svelte frontend + Tauri/Rust desktop/runtime

EngineData/Backend/LocalWorker/WorkerRuntime/
→ canonical local AI worker + VoiceLab build/inference logic

EngineData/Backend/RuntimeAssets/
→ controlled production model/audio/runtime assets

UserData/
→ runtime/user-owned writable data

DevelopingData/
→ historical/recovery evidence only
```

The desktop application is the single product shell. VoiceLab training is a bounded build operation and does not create a second daily inference worker.

## Repository operating model

```text
AGENTS.md
→ boot / work modes / continuity / semantic routing

GITHUB_RULES.md
→ branch/ref / tool fit / atomic delivery / history / CI / security / retries / STOP

CONTEXT.md
→ stable product/repository orientation

docs/foundation/
→ durable product/system requirements

docs/knowledge/next-action.md
→ active continuation and exactly one next step

docs/knowledge/source-ownership.md
→ responsibility → current owner

docs/knowledge/decision-log.md
→ durable decisions/reasons

.agents/skills/
→ bounded TranslateIT development procedures
```

Normal GitHub work follows:

```text
PIN
→ READ MINIMUM
→ DIAGNOSE
→ TOOL FIT
→ WRITE ONCE
→ VERIFY MINIMUM
→ STOP
```

`New` is current development authority. `Developing` and `DevelopingData` are recovery evidence only.

## Development entrypoints

Desktop package:

```text
EngineData/Frontend/RustApp
```

Useful current source checks include:

```bash
npm ci
npm run validate:quick
npm run build:frontend
npm run typecheck
```

Rust and Python proof are selected according to the changed claim rather than run ceremonially for every repository edit.

Worker package:

```text
EngineData/Backend/LocalWorker/WorkerRuntime
```

Its Python environment is owned by `pyproject.toml` + `uv.lock`, with focused tests under `tests/`.

## Release boundary

Installed builds use one private application-local Python runtime and controlled local model/runtime assets. Normal users are not expected to install Python, pip, repositories, or core models manually.

Current controlled offline payload is approximately 9.4 GB. R3 established that staging/preflight and the application executable build can succeed, while the standard classic-NSIS all-in-one executable path hits a large-installer size boundary.

The next release task is therefore a **packaging-boundary decision**, not a model/runtime rewrite.

See `docs/knowledge/next-action.md` for the active continuation.

## Evidence rule

Use the cheapest proof that can genuinely falsify the claim.

Examples:

```text
routing/docs
→ Repository Verify

frontend compile/type
→ targeted frontend checks

Rust behavior
→ targeted cargo proof

Python worker behavior
→ focused worker tests/runtime proof

Windows audio/device
→ target Windows evidence

model quality / GPU practicality
→ actual matching runtime/hardware

installer / installed runtime / clean machine
→ actual packaging/install evidence
```

Hosted/static proof never silently upgrades itself into target-PC proof.

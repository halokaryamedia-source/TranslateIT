# TranslateIT

**Local-first Windows desktop translation for online meetings.**

TranslateIT is a desktop translation project focused on helping Indonesian and English speakers communicate more naturally during online meetings. The product is designed around a simple user-facing workflow while keeping ASR, translation, TTS, acceleration, helper-process, and audio-routing complexity behind the application.

> **Development status:** active development on branch `New`. Source presence does not by itself imply Windows runtime, device, model, audio-route, or installer readiness.

## Product Overview

### Primary — Meeting Voice

Outbound meeting flow:

```text
Indonesian speech
-> Indonesian transcript
-> English translation
-> English TTS
-> TranslateIT meeting microphone/audio route
-> meeting application
```

Inbound meeting assistance:

```text
English speech
-> English transcript
-> Indonesian translated text
-> local user
```

The intended normal interaction is **Session Listening**: the user starts a meeting session once, TranslateIT listens continuously, segments speech using natural-pause/VAD boundaries, translates locally, and routes translated English voice to the meeting input until the session is stopped.

Push to Talk remains a secondary interaction mode, with `Ctrl+Space` as the default shortcut.

### Secondary — Text Translation

Standalone Indonesian <-> English text translation remains independently useful when meeting voice is unavailable, not configured, or simply not needed.

### Secondary — Document Translation

Initial first-class document formats:

- TXT
- Markdown
- DOCX
- text-based PDF
- SRT
- VTT

Document translation is designed around local processing, semantic chunking where needed, practical structure preservation, and explicit Save/Export behavior.

### Advanced — Audio Studio

Audio Studio is an advanced/post-core workflow for creating and managing an authorized local custom English voice profile for outbound translated TTS. It is part of the product direction but is not an initial core-release blocker.

## Initial Product Scope

| Area | Initial direction |
| --- | --- |
| Platform | Windows |
| Languages | Indonesian and English |
| Core runtime | Local-first, offline-capable after required assets are installed |
| Outbound meeting voice | Indonesian speech -> English voice |
| Inbound meeting assistance | English speech -> Indonesian text |
| Translation modes | `Realtime` and `Quality` |
| Tone modes | `Auto`, `Formal`, `Casual` |
| Acceleration | CUDA preferred when available; CPU fallback required |
| Cloud | Optional future capability only; never a silent core fallback |
| Meeting output | Translated English voice, not raw Indonesian microphone audio by default |

Not part of the initial scope: additional language pairs, English speech -> Indonesian TTS, mandatory cloud services, OCR-first document translation, or broadcast-style voice production tooling.

## Product Principles

TranslateIT is designed around several durable principles:

- **Local-first:** core translation behavior should remain usable without a mandatory cloud dependency after required local assets are installed.
- **Meaning-preserving translation:** intended meaning and factual/entity fidelity take priority over literal word order.
- **Simple normal-user UX:** helper processes, model paths, CUDA/provider internals, preload controls, pipeline handoffs, and raw logs belong behind Developer Diagnostics.
- **Truthful readiness:** `Ready`, `Degraded`, `Setup Needed`, `Unavailable`, and `Checking` describe actual capability state rather than optimistic UI state.
- **No silent substitution:** missing meeting audio routing must not silently fall back to raw microphone, speaker output, or cloud routing.
- **Explicit privacy boundaries:** History, Saved content, temporary audio, logs, and developer validation output have separate ownership.

## Architecture

Current architecture baseline:

```text
+-------------------------------+
| TranslateIT Desktop           |
| Rust / Tauri                  |
| TypeScript / CSS frontend     |
+---------------+---------------+
                |
                | Tauri commands / runtime facade
                v
+-------------------------------+
| Local Runtime                 |
| Rust runtime integration      |
| + Python helper/worker        |
+---------------+---------------+
                |
        +-------+-------+
        |       |       |
        v       v       v
       ASR  Translation  TTS
        |       |       |
        +-------+-------+
                |
                v
      Windows audio / meeting route
```

Canonical implementation roots:

```text
EngineData/Frontend/RustApp
-> desktop application, frontend, Tauri/Rust runtime

EngineData/Backend/LocalWorker/WorkerRuntime
-> internal Python local worker/runtime

EngineData/Backend/RuntimeContracts
-> runtime contracts

EngineData/Backend/RuntimeAssets
-> production runtime/model/audio assets
```

The desktop application remains the single product shell. Python is internal runtime support, not a second product application.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Repository working, evidence, scope, and agent rules |
| `CONTEXT.md` | Stable project facts, architecture, and terminology |
| `.agents/skills/` | Project-specific development procedures selected by semantic owner |
| `docs/foundation/` | Approved product/system direction and requirements |
| `docs/knowledge/` | Current project knowledge, source ownership, decisions, and continuation state |
| `EngineData/` | Canonical product implementation and production runtime assets/contracts |
| `UserData/` | Runtime/user-owned data destination |
| `DevelopingData/` | Historical/recovery/reference development evidence only |
| `.tmp/` | Ignored temporary development and validation output |

### Root Data Boundaries

```text
EngineData
-> product implementation

UserData
-> runtime/user data

DevelopingData
-> historical/reference evidence
```

Production code, build/package inputs, and runtime discovery must not depend on `DevelopingData`. Developer/source-validation output belongs under ignored `.tmp/` paths rather than `UserData`.

## User Data Ownership

```text
UserData/CacheData/
-> disposable runtime/session data

UserData/LogData/
-> runtime diagnostics and operational logs

UserData/SavedProject/
-> persistent user-approved/user-visible data
```

Raw/source microphone audio and generated TTS are temporary by default. Saved content is explicit and must remain independent from automatic local History behavior.

## Development

The current desktop package is:

```text
EngineData/Frontend/RustApp
```

From that directory, the primary developer entrypoints are:

```bash
npm install
npm run validate:quick
npm run dev:frontend
npm run dev:app
```

Additional current validation entrypoints include:

```bash
npm run build:frontend
npm run test:auto-map
npm run test:contract-reports
npm run check:tauri-rust-local
```

### Validation Levels

| Level | Example | What it proves |
| --- | --- | --- |
| Source contracts | `npm run validate:source-contracts` | Current source ownership and static contracts |
| TypeScript | `npm run typecheck` | Type-level frontend consistency |
| Frontend build | `npm run build:frontend` | Frontend buildability |
| Diagnostic matrices | `npm run test:auto-map` | Bounded source/functional diagnostic evidence |
| Contract reports | `npm run test:contract-reports` | Deeper non-blocking source-contract diagnostics |
| Local Rust/Tauri | `npm run check:tauri-rust-local` | Local Rust/Tauri compile proof |

Rendered UI correctness, Windows microphone/device behavior, ASR/translation/TTS execution, CUDA performance, meeting-route delivery, latency, and clean-machine installer readiness require the appropriate local/target proof. A green source check is not equivalent to runtime readiness.

## Product Navigation

The intended normal product navigation is:

```text
Meeting
Text
Documents
History
Saved
Settings
```

Meeting is the primary workspace. Developer Diagnostics remains available through an Advanced/Developer surface rather than normal navigation controls.

## Project Documentation

For durable project information, use the canonical owners below:

- [`CONTEXT.md`](CONTEXT.md) — stable project context and architecture
- [`docs/foundation/01-product-overview.md`](docs/foundation/01-product-overview.md) — product overview and scope hierarchy
- [`docs/foundation/02-product-requirements.md`](docs/foundation/02-product-requirements.md) — detailed approved requirements
- [`docs/knowledge/source-ownership.md`](docs/knowledge/source-ownership.md) — semantic requirement-to-source ownership
- [`docs/knowledge/decision-log.md`](docs/knowledge/decision-log.md) — durable decisions and reasoning
- [`docs/knowledge/next-action.md`](docs/knowledge/next-action.md) — current continuation point
- [`AGENTS.md`](AGENTS.md) — repository working and evidence rules

## Development Authority

`New` is the current TranslateIT development authority. Older branches remain useful as historical implementation/recovery evidence but do not override current product policy, source ownership, or repository state.

---

TranslateIT is under active development. Product direction is defined by the foundation documents, actual behavior is defined by current source plus proof, and runtime/device/release claims remain bounded by the evidence that has actually been obtained.

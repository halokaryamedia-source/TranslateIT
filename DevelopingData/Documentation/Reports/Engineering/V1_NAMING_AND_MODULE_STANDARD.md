# V1 Naming and Module Standard

Status: active naming standard for TranslateIT V1 refactor work.

## Goal

Make TranslateIT easier to maintain by keeping file names aligned with their actual responsibility.

## Core naming rule

A file name must answer one question clearly:

```text
What responsibility does this file own?
```

Avoid names that describe technology only when the file actually owns a product responsibility.

## Approved product vocabulary

Use these product terms consistently:

| Term | Use for |
| --- | --- |
| `translation` | text translation flow, translation request/response, translation model readiness |
| `speech` | spoken input/output domain, user-facing voice/speech features |
| `audio` | low-level audio capture, buffers, devices, preprocessing |
| `capture` | microphone capture lifecycle and recording flow |
| `transcript` | captured/generated text transcript session data |
| `runtime` | app/engine readiness and lifecycle state |
| `worker` | Python helper runtime and subprocess boundary |
| `model` | local ASR/translation/TTS model inventory and readiness |
| `settings` | persisted user/runtime configuration |
| `diagnostics` | developer-facing status, evidence, traces, and validation output |
| `preview` | design/prototype material not imported by runtime |

## Frontend naming rules

Active UI files live under:

```text
EngineData/Frontend/RustApp/src/app/active-launcher
```

Preferred suffixes:

| Suffix | Use for |
| --- | --- |
| `Controller.ts` | Orchestrates a user flow or feature area |
| `View.ts` | Builds/render HTML fragments or view models |
| `Renderer.ts` | Renders a specific panel/section into existing DOM refs |
| `Rules.ts` | Pure UI/domain validation rules |
| `State.ts` | UI state shape/defaults only |
| `Bindings.ts` | Event binding only |
| `Api.ts` | Tauri/frontend bridge calls |
| `Trace.ts` | User/developer trace collection |

Avoid growing files named only `launcher*` when the responsibility is actually translation, capture, settings, attachment, chat session, or diagnostics.

## Rust naming rules

Active Rust/Tauri files live under:

```text
EngineData/Frontend/RustApp/src-tauri/src
```

Preferred modules:

| Path | Use for |
| --- | --- |
| `main.rs` | Minimal app entrypoint only |
| `app_bootstrap.rs` | Desktop window/app shell bootstrap |
| `commands/registry.rs` | Tauri command registration list |
| `commands/*.rs` | Thin Tauri command wrappers |
| `engine/services/` | Orchestration/use-case logic |
| `engine/domain/` | Pure rules, DTOs, and state transitions |
| `engine/adapters/` | Adapter boundary for existing migrated logic |
| `engine/audio/` | Low-level audio primitives |
| `engine/inference/` | Model/backend readiness and inference boundary |

## Rename migration rule

Do not rename many files at once.

Each rename migration must include:

1. old path;
2. new path;
3. reason;
4. affected imports;
5. validation command used;
6. rollback note.

## Current high-priority rename targets

| Current pattern | Target direction | Reason |
| --- | --- | --- |
| `launcherController.ts` | split into feature controllers | Too many responsibilities in one controller |
| broad `launcher*.ts` names | feature-specific names such as `translationController.ts`, `captureController.ts`, `settingsController.ts` | Easier ownership and future updates |
| command files with orchestration logic | move orchestration into `engine/services` | Keep Tauri command files thin |
| pure validation/readiness logic in adapters | move pure logic into `engine/domain` | Easier testing and maintenance |

## Safe naming status

The current pass adds the standard and modular boundaries first. Actual large file renames should be done in later small PRs after local validation is available.
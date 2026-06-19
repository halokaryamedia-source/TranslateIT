# Root File Rules

## Purpose

This document is the placement guide for future AI, Codex, and engine work in the TranslateIT repository.

Use this file before adding, moving, or renaming files. Do not guess file placement from old paths or branch history.

## Approved root layout

Only these root entries are expected:

```text
DevelopingData/
EngineData/
UserData/
.gitattributes
.gitignore
README.md
TranslateIT.lnk
```

## Root entries and function

| Root entry | Function | Release rule |
| --- | --- | --- |
| `README.md` | Human and AI entry point for current repo structure, active route, and safety rules. | Included. Keep concise and current. |
| `.gitignore` | Prevents local runtime outputs, cache, logs, model binaries, retired runtime paths, and build outputs from being tracked. | Included. Must protect release hygiene. |
| `.gitattributes` | Defines text/binary handling for scripts, images, icons, SVG, and Windows shortcut files. | Included. Keep at root. |
| `TranslateIT.lnk` | Root shortcut for opening the packaged desktop app on Windows. | Included only if it points to the approved packaged app route. |
| `DevelopingData/` | Development-only docs, reports, QA references, samples, and maintenance tooling. | Excluded from release. App runtime must not depend on it. |
| `EngineData/` | Runtime source ownership area for frontend, backend, desktop app package, worker route, contracts, and local runtime asset slots. | Included as the app/runtime source area, excluding ignored local assets. |
| `UserData/` | Local cache, logs, validation evidence, and user saved project placeholders. | Runtime-generated contents excluded; README placeholders may remain. |

## DevelopingData function

`DevelopingData` is not a runtime dependency.

Allowed:

```text
DevelopingData/Documentation/
DevelopingData/Quality/
DevelopingData/Samples/
DevelopingData/Tooling/
```

Function by area:

| Path | Function | Must not contain |
| --- | --- | --- |
| `DevelopingData/README.md` | Rules for development-only ownership and release exclusion. | Runtime source. |
| `DevelopingData/Documentation/` | Current durable docs, source docs, concise reports, templates. | Active frontend/backend implementation. |
| `DevelopingData/Documentation/Source/` | Source-of-truth project docs, including this rootfile guide. | Runtime code. |
| `DevelopingData/Documentation/Reports/Engineering/` | Concise engineering reports and cleanup notes. | Active app reports that are package-specific. |
| `DevelopingData/Quality/` | QA references and diagnostic/test documentation only. | Runtime test runners required by release. |
| `DevelopingData/Samples/` | Safe sample references only. | Production assets or active runtime data. |
| `DevelopingData/Tooling/` | Development-only Node/PowerShell maintenance tooling. | Runtime engine files or release-required app code. |

Release rule:

```text
DevelopingData can be removed for release.
The app must still open and run without DevelopingData.
```

## EngineData function

`EngineData` owns runtime-facing project structure.

Current structure:

```text
EngineData/
  README.md
  Frontend/
  Backend/
```

Current active branches:

```text
EngineData/
  Backend/
  Frontend/
```

These are the active engine branches. All docs should live under `DevelopingData/`.

Current practical source of truth:

```text
EngineData/Frontend/RustApp
DevelopingData/
UserData/
```

Function by area:

| Path | Function | Rule |
| --- | --- | --- |
| `EngineData/README.md` | Runtime ownership map and current/target app route explanation. | Keep current when moving app paths. |
| `EngineData/Frontend/` | Frontend ownership notes and naming guide. | Do not put backend runtime code here. |
| `EngineData/Frontend/UI/` | UI component/page ownership notes. | UI guide only; active UI source is inside app package. |
| `EngineData/Frontend/Runtime/` | Runtime status, settings, and shell-flow ownership notes. | Active source is inside app package. |
| `EngineData/Frontend/Translate/` | Translation UI ownership notes. | Active source is inside app package. |
| `EngineData/Frontend/Transcript/` | Capture and transcript UI ownership notes. | Active source is inside app package. |
| `EngineData/Backend/` | Backend runtime ownership map. | Backend runtime-related docs and routes belong here. |
| `EngineData/Backend/Runtime/` | Rust backend runtime ownership notes. | Active Rust source is inside app package until package migration. |
| `EngineData/Backend/Translate/` | Translation backend ownership notes. | Active Rust source is inside app package until package migration. |
| `EngineData/Backend/Transcript/` | Capture and transcript backend ownership notes. | Active Rust source is inside app package until package migration. |
| `EngineData/Backend/Worker/` | Python worker ownership notes. | Active Rust source is inside app package until package migration. |
| `EngineData/Backend/LocalWorker/WorkerRuntime/` | Active Python local worker runtime, requirements, manifest, setup, and smoke script. | This is the only approved Python runtime route. |
| `EngineData/Backend/RuntimeContracts/` | Backend JSON contracts and model readiness manifest. | Contract files must not be placed in app root or DevelopingData. |
| `EngineData/Backend/RuntimeAssets/` | Local model/Piper/runtime asset slots and README placeholders. | Model binaries and Piper files must stay ignored by Git. |
| `EngineData/Frontend/` | Active desktop app package area. | Keep as the app package owner. Do not confuse it with frontend-only ownership. |
| `EngineData/Frontend/RustApp/` | Current physical Tauri app package folder. | Keep this as the active package route. |
| `EngineData/Frontend/RustApp/src-tauri/src/commands/` | Tauri command bridge layer. | Keep command modules thin and split by responsibility. |
| `EngineData/Frontend/RustApp/src-tauri/src/engine/` | Rust engine domain logic. | Keep backend logic here, not in command handlers or UI files. |

## Frontend package rule

Current active physical app package:

```text
EngineData/Frontend/RustApp
```

Do not rename `RustApp` to another package name unless the package-path migration is being executed in full and the docs are updated in the same change.

## App package function

Files that are specific to the desktop app package stay inside the app package.

Examples:

```text
EngineData/Frontend/RustApp/index.html
EngineData/Frontend/RustApp/src/
EngineData/Frontend/RustApp/src-tauri/
EngineData/Frontend/RustApp/DesignPreview/
EngineData/Frontend/RustApp/UI_PAGE_TEMPLATE.md
EngineData/Frontend/RustApp/UI_REFERENCE_GUIDE.md
EngineData/Frontend/RustApp/docs/ui-reference/
EngineData/Frontend/RustApp/*REPORT*.md
EngineData/Frontend/RustApp/*REPORT*.json
EngineData/Frontend/RustApp/*CHECKLIST*.md
```

Do not move app-specific docs into `DevelopingData`, `Frontend`, or `Backend` unless they are no longer tied to the app package.

## Backend runtime contracts

Active contract route:

```text
EngineData/Backend/RuntimeContracts/
```

Expected contract files:

```text
ATTACHMENT_RUNTIME_CONTRACT.json
AUDIO_PIPELINE_RUNTIME_CONTRACT.json
TRANSLATION_RUNTIME_CONTRACT.json
MODEL_RUNTIME_MANIFEST.json
```

Rules:

- Do not duplicate these in `RustApp` root.
- Do not place them in `DevelopingData`.
- Update tooling/status scripts to read from this route.

## Runtime asset slots

Active runtime asset slot route:

```text
EngineData/Backend/RuntimeAssets/
```

Expected slots:

```text
EngineData/Backend/RuntimeAssets/ASR/ModelData/
EngineData/Backend/RuntimeAssets/Translation/ModelData/
EngineData/Backend/RuntimeAssets/Voice/Piper/
```

Rules:

- README placeholders may be tracked.
- Model binaries, ONNX files, Piper binaries, generated audio, and large runtime data must not be tracked.
- Do not restore `EngineData/Backend/RuntimeAssets` at root.

## UserData function

`UserData` owns runtime-created local data.

```text
UserData/
  README.md
  CacheData/
  LogData/
  SavedProject/
```

Function by area:

| Path | Function | Git rule |
| --- | --- | --- |
| `UserData/CacheData/` | Disposable runtime cache and temporary files. | Ignore generated contents. |
| `UserData/LogData/` | Logs, diagnostics, validation evidence. | Ignore generated contents. |
| `UserData/SavedProject/` | User-approved saved project data. | Ignore generated contents unless explicitly approved. |

## Retired paths

Do not recreate these paths:

```text
DeveloperData/
DevelopingData/DocumentationData/
DevelopingData/Reports/
DevelopingData/ToolKitData/
DevelopingData/Samples/
EngineData/VoiceEngine/
Launcher/
Launcher/Preview/
TranslateIT.vbs
TranslateIT.cmd
```

## Placement decision rules

When adding a file, use this decision order:

1. Is it active desktop app code, app UI, app-specific preview, app-specific report, or Tauri config? Put it in `EngineData/Frontend/RustApp` until the package is renamed to `App`.
2. Is it backend worker runtime code or worker setup/smoke execution? Put it in `EngineData/Backend/LocalWorker/WorkerRuntime`.
3. Is it a backend JSON contract or model readiness manifest? Put it in `EngineData/Backend/RuntimeContracts`.
4. Is it a local model/Piper/runtime asset slot? Put README placeholders in `EngineData/Backend/RuntimeAssets`; keep actual assets ignored.
5. Is it development-only documentation, report, QA reference, sample, or maintenance tooling? Put it in `DevelopingData`.
6. Is it user-generated cache/log/save data? Put it in `UserData` and keep generated data ignored.
7. If none match, stop and update this guide before adding a new path.

## Modularization rule

For large Rust files, prefer moving cohesive logic into a dedicated module instead of adding more branching inside `main.rs`, a command file, or a single engine file. Favor these units:

- protocol and report types
- filesystem and manifest access
- readiness and validation logic
- bridge or adapter state
- command wrapper entrypoints

This keeps the rewrite aligned with future maintenance and avoids another monolith.

## Hard rules for AI and Codex

- Do not create a new root folder without updating this document and the root README.
- Do not put active runtime engine files in `DevelopingData`.
- Do not make the app depend on `DevelopingData` at runtime.
- Do not duplicate contracts between `RustApp` and `Backend/RuntimeContracts`.
- Do not restore retired root paths.
- Do not move the Tauri package by only changing docs; move the full package tree and references together.
- Do not claim release readiness from structure cleanup alone.


# TranslateIT V1 Active File Ownership Map

Status: first-pass ownership map for safe cleanup.

Base branch: `V1`

Work branch: `audit/v1-safe-structure-cleanup`

## Classification labels

| Label | Meaning | Move/delete rule |
| --- | --- | --- |
| `active-runtime` | Required for the current app to run or build. | Do not move/delete without migration patch and validation. |
| `active-contract` | Runtime contract or manifest used to guide/validate active behavior. | Do not duplicate; update validators if moved. |
| `active-preview` | Preview/design-only material intentionally outside runtime flow. | Can stay near app package, but must not be imported by runtime unless promoted. |
| `development-only` | Reports, QA, maintenance tooling, audit scripts, and human docs. | Must not be required by release runtime. |
| `scaffold-only` | Placeholder or contract route that is not completed runtime. | Must be labeled clearly; do not claim readiness. |
| `legacy-historical` | Historical context only. | Keep or archive; never treat as source of truth. |
| `candidate-for-archive` | Likely obsolete/noisy but not yet verified safe to remove. | Review before moving/deleting. |

## Active runtime surfaces

| Path | Classification | Owner / purpose | Notes |
| --- | --- | --- | --- |
| `EngineData/Frontend/RustApp` | `active-runtime` | Active Tauri desktop app package. | Physical package contains both UI and app-embedded Rust backend. |
| `EngineData/Frontend/RustApp/src` | `active-runtime` | Active frontend runtime source. | Keep runtime UI behavior here. |
| `EngineData/Frontend/RustApp/src/app/active-launcher` | `active-runtime` | Main launcher UI modules. | Needs further split because `launcherController.ts` is still a broad orchestrator. |
| `EngineData/Frontend/RustApp/src-tauri` | `active-runtime` | Tauri/Rust backend bridge and app shell. | Treat as app-embedded backend, not frontend-only code. |
| `EngineData/Frontend/RustApp/src-tauri/src/commands` | `active-runtime` | Tauri command wrapper layer. | Keep wrappers thin; move domain logic to engine/service modules. |
| `EngineData/Frontend/RustApp/src-tauri/src/engine` | `active-runtime` | Rust domain/runtime logic. | Good modular direction, but boundaries should be clarified into services/domain/io. |
| `EngineData/Backend/LocalWorker/WorkerRuntime` | `active-runtime` | Python helper runtime route. | This is the approved Python helper route only. |
| `EngineData/Backend/RuntimeContracts` | `active-contract` | Runtime contracts, manifests, route policies. | Do not duplicate in app root or DevelopingData. |
| `EngineData/Backend/RuntimeAssets` | `active-runtime` | Placeholder slots for local ASR/translation/voice assets. | Track README placeholders only; model binaries stay ignored. |
| `UserData` | `active-runtime` | Runtime-generated local cache/log/save roots. | Generated contents ignored unless explicitly approved. |

## Preview and design surfaces

| Path | Classification | Owner / purpose | Notes |
| --- | --- | --- | --- |
| `EngineData/Frontend/RustApp/Preview` | `active-preview` | UI preview/design review only. | Must not become runtime dependency unless files are deliberately promoted. |
| `EngineData/Frontend/RustApp/docs/ui-reference` | `development-only` | App-specific UI reference evidence. | Keep with package while it directly describes the app. |
| `EngineData/Frontend/RustApp/page-template.md` | `development-only` | UI page template reference. | App-specific doc; not runtime. |
| `EngineData/Frontend/RustApp/ui-reference.md` | `development-only` | UI baseline/reference guide. | App-specific doc; not runtime. |

## Development-only surfaces

| Path | Classification | Owner / purpose | Notes |
| --- | --- | --- | --- |
| `DevelopingData/Documentation` | `development-only` | Durable docs, reports, source docs. | Release runtime must not depend on it. |
| `DevelopingData/Documentation/Reports/Engineering` | `development-only` | Current engineering docs and cleanup reports. | Active documentation index decides source of truth. |
| `DevelopingData/Planning` | `development-only` | Architecture planning. | Should not be runtime dependency. |
| `DevelopingData/Quality` | `development-only` | QA references and diagnostic docs. | Runtime tests required by release should not live only here. |
| `DevelopingData/Tooling/Scripts/Execution` | `development-only` | Maintenance/status tooling. | Good home for noisy validators not required by app package. |

## Script classification policy

### Keep as common package commands

```text
npm run dev
npm run build
npm run build:frontend
npm run typecheck
npm run check:rust
npm run validate:quick        # recommended new alias
```

### Keep but label as internal validation

```text
validate:internal
validate:architecture-contracts
validate:single-active-engine
validate:userdata-root-policy
validate:helper-bridge
validate:runtime-flow
```

### Move behind heavy/local profile

```text
validate:full
validate:auto:worker
models:*
gpu:*
smoke:worker*
```

### Candidate for consolidation

All one-off `status:*`, duplicate `validate:*`, UI-specific audits, and script names that only call another script should be routed through a single profile-based tool instead of remaining as many top-level commands.

## Known cleanup findings

1. Some docs still mention `Dev-Rust` even though this audit is for `V1`.
2. Some folder rules need reconciliation before file movement; a path should not be both allowed and retired.
3. `RustApp` is an acceptable temporary package name, but docs should consistently describe it as the active desktop app package.
4. `launcherController.ts` should be split before adding more UI behavior.
5. Command and engine modules are a good modular start, but service/domain/io boundaries should be made explicit.
6. Preview/design files should stay visibly separate from runtime source.
7. Contract/scaffold files must not be interpreted as finished runtime features.

## Safe next action

Do not delete or move files yet. First update stale documentation labels, then simplify scripts with backwards-compatible aliases, then split large controller/orchestration files in small validated commits.
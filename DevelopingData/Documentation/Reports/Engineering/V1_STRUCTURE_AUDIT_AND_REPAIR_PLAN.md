# TranslateIT V1 Structure Audit and Repair Plan

Status: non-destructive audit and repair-planning document.

Base branch: `V1`

Work branch: `audit/v1-safe-structure-cleanup`

## Safety rule

This cleanup must not directly delete, rename, or move active runtime files until the active/legacy map has been reviewed.

Local pull is not automatic. Pull to local must wait for explicit user confirmation.

## Audit snapshot

The repository direction is already moving toward a Rust/Tauri desktop application with a Python helper runtime. The current active runtime route is documented as:

```text
EngineData/Frontend/RustApp
EngineData/Backend/LocalWorker/WorkerRuntime
EngineData/Backend/RuntimeContracts
EngineData/Backend/RuntimeAssets
UserData
```

The branch still has cleanup risk because active runtime files, package-level validation scripts, design previews, development reports, and scaffold/contract files are all close together.

## Current assessment

### 1. App is partially modular, but not cleanly modular yet

The app is no longer a single-file monolith. The Rust side has a `commands` layer and an `engine` layer, and the frontend has `active-launcher` modules.

However, several surfaces are still too broad:

- `src-tauri/src/main.rs` is still responsible for importing and registering many command handlers.
- `src-tauri/src/commands/` contains thin command files and larger implementation files in the same layer.
- `src-tauri/src/engine/adapters/` contains many logic modules, but some domain ownership boundaries are still unclear.
- `src/app/active-launcher/launcherController.ts` still acts as a central orchestrator for warmup, runtime rendering, chat/session handling, attachment handling, text translation, voice capture, settings, diagnostics, and UI notices.

Verdict: modular direction exists, but maintenance risk remains medium-high because orchestration is still concentrated in a few coordinator files.

### 2. Frontend/backend naming is still confusing

`EngineData/Frontend/RustApp` is physically the active app package. It contains:

- frontend source under `src/`
- Tauri/Rust backend bridge under `src-tauri/`
- package scripts under `scripts/`
- preview-only UI under `Preview/`

This is valid for Tauri, but the folder name `Frontend` can mislead future work into thinking Rust backend logic belongs elsewhere. Until a full package migration is approved, the safest wording is:

```text
EngineData/Frontend/RustApp = active desktop app package
EngineData/Frontend/RustApp/src = active UI runtime
EngineData/Frontend/RustApp/src-tauri = app-embedded Rust backend / Tauri bridge
EngineData/Backend/LocalWorker/WorkerRuntime = active Python helper runtime
EngineData/Backend/RuntimeContracts = backend contracts
```

### 3. Script and validator load is too high

`package.json` currently exposes many `status:*`, `validate:*`, `models:*`, `gpu:*`, and `audit:*` commands. Some are release-relevant, but many are development-maintenance tooling.

Risk:

- too many scripts make the engine/workflow feel heavy;
- new contributors cannot tell which validators are required before pull/build;
- CI/local validation can become slow or noisy;
- package-level scripts depend on `DevelopingData`, even though `DevelopingData` should be removable for release.

Repair direction:

- keep only a small set of package-level public commands;
- move development-only validators into `DevelopingData/Tooling/Scripts/Execution`;
- make one aggregator script call optional validators by profile;
- add clear profiles: `dev-fast`, `internal`, `release-preflight`, `full-local`.

### 4. Active vs legacy/scaffold boundary is not strong enough

The docs already state that superseded reports may stay as historical context, but they should not become source of truth unless listed in the active documentation index.

Remaining risk:

- some documents still mention old branch names;
- some scaffold-only/contracts may look like completed runtime features;
- some route names imply readiness even when implementation is placeholder or metadata-only;
- preview files live close to runtime files and need stronger promotion rules.

Repair direction:

- add an active file ownership map;
- mark scaffold/contract/preview-only files clearly;
- avoid deleting legacy history until validator and local test pass;
- only archive or move files after a reviewed migration list.

## Recommended repair phases

### Phase 1 — Non-destructive inventory gate

Create and maintain an active ownership map before file movement.

Output:

```text
DevelopingData/Documentation/Reports/Engineering/V1_ACTIVE_FILE_OWNERSHIP_MAP.md
```

Rules:

- classify each surface as `active-runtime`, `active-contract`, `active-preview`, `development-only`, `scaffold-only`, `legacy-historical`, or `candidate-for-archive`;
- no delete/move in this phase;
- update docs that still reference stale branch names or contradictory folder status.

### Phase 2 — Script simplification

Create a script policy with three levels:

```text
required: dev, build, typecheck, check:rust, validate:quick
internal: validate:internal, validate:contracts, validate:single-active-engine
local-heavy: validate:full, models:*, gpu:*, worker smoke tests
```

Move or hide noisy scripts that are not required for normal app work. Keep backwards-compatible aliases for a short transition period so GitHub and local workflow do not break.

### Phase 3 — Runtime module boundary cleanup

Frontend split target:

```text
src/app/active-launcher/controller/
  launcherController.ts        # boot and coordination only
  runtimeStatusController.ts
  translationController.ts
  captureController.ts
  settingsController.ts
  attachmentController.ts
  chatSessionController.ts
```

Rust split target:

```text
src-tauri/src/commands/        # Tauri wrappers only
src-tauri/src/engine/services/ # orchestration/use cases
src-tauri/src/engine/domain/   # types and pure rules
src-tauri/src/engine/io/       # filesystem/process access
```

Python worker stays under:

```text
EngineData/Backend/LocalWorker/WorkerRuntime
```

### Phase 4 — Legacy/archive movement after validation only

Only after Phase 1-3 pass:

- move obsolete reports to a clearly named historical area, or mark them in-place as historical;
- remove duplicate validator entrypoints only when aliases are proven unused;
- avoid deleting any runtime file until `npm run typecheck`, `npm run check:rust`, and the selected validation profile pass locally.

### Phase 5 — Final pull readiness gate

Before asking the user to pull locally:

- confirm branch diff is limited and explain each change;
- confirm no destructive deletions were made without approval;
- provide exact pull command only after user confirmation;
- do not claim packaged readiness unless local build/validation evidence exists.

## Immediate safe changes in this audit branch

This branch only adds documentation and index references. It does not move runtime files, delete files, or change app behavior.

## Decision needed before destructive cleanup

Before any actual file move/delete, the user must approve the active ownership map and the script simplification profile.
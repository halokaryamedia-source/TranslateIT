# Branch Repair Dev-Rust Architecture Alignment

## Purpose
This document crosschecks the misplaced `Developing` branch repair against the actual `Dev-Rust` architecture.

## Confirmed Dev-Rust architecture
- The active desktop app route is `EngineData/LauncherApp/RustApp`.
- The active app backend is Rust/Tauri under `EngineData/LauncherApp/RustApp/src-tauri/src/commands` and `EngineData/LauncherApp/RustApp/src-tauri/src/engine`.
- Backend-owned local worker runtime files belong under `EngineData/Backend/LocalWorker/WorkerRuntime`.
- Runtime contracts belong under `EngineData/Backend/RuntimeContracts`.
- Runtime assets belong under `EngineData/Backend/RuntimeAssets`.

## Repair rule after crosscheck
Python files from the misplaced range may only be treated as helper or compatibility files for translation/runtime support.
They must not replace Rust/Tauri app logic.
They must not be wired into `RustApp` as the primary app route without a Rust-side boundary or worker contract.

## Current migrated Python helper areas
- `EngineData/TranslateEngine/*` contains migrated translation/helper contracts from the misplaced range.
- `EngineData/TranscriptEngine/*` contains migrated transcript/helper contracts from the misplaced range.
- These files are currently treated as helper-side compatibility assets, not as the active Tauri app implementation.

## Required adjustment before future development
Before adding new realtime features, decide whether each migrated Python helper should be:
1. kept as a helper module under `EngineData/TranslateEngine` or `EngineData/TranscriptEngine`,
2. moved behind the existing `EngineData/Backend/LocalWorker/WorkerRuntime` command boundary,
3. translated into Rust under `EngineData/LauncherApp/RustApp/src-tauri/src/engine`, or
4. kept only as documentation/test evidence.

## Explicitly blocked
- Do not overwrite Rust files with Python logic.
- Do not claim the Python helper path is the active Rust/Tauri runtime.
- Do not continue feature development until branch repair and architecture classification are complete.

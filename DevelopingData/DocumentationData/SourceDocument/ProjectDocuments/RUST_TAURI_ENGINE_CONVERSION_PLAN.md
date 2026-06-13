# Rust and Tauri Engine Conversion Plan

## Document control

- Project: TranslateIT
- Branch: `ChatGPT-ConvertEngine`
- Conversion version: `0.6.0-rust-tauri-conversion-start`
- Date: `2026-06-14`
- Status: Active conversion baseline
- Root baseline used: `Developing` commit `f412ba06bace37f6c0118eb20a6a2f91f0a63e76`
- Observed commit: `76139bc13bd0b8f59f4307d98703a5f335460470`

## Purpose

This document controls the migration from the current Python/PySide6 TranslateIT runtime toward a Rust/Tauri implementation.

The current Python engine remains the behavior reference until Rust parity is proven. The conversion must not report runtime features as ready before those features are actually implemented and validated.

## Baseline created in this branch

```text
EngineData/LauncherApp/RustApp/
  README.md
  package.json
  index.html
  src/main.ts
  src/styles.css
  src-tauri/Cargo.toml
  src-tauri/build.rs
  src-tauri/tauri.conf.json
  src-tauri/src/main.rs
```

The scaffold includes a clean frontend shell, a Rust command bridge, and explicit pending-state responses.

## Observed commit handling

The observed commit added a RustApp scaffold checker. In this branch, the checker is placed in the documented tooling path:

```text
DevelopingData/ToolKitData/Scripts/Execution/check_rust_app.py
```

This preserves the intent of the commit while avoiding a second tooling root.

## Non-negotiable rules

1. Do not delete the Python engine until Rust parity is proven.
2. Do not silently change ASR, translation, TTS, CUDA, latency, cache, log, or save behavior.
3. Do not silently degrade CUDA-first behavior to CPU.
4. Do not show false `Ready` status for unconverted features.
5. Keep the user-facing UI clean and simple.
6. Update documentation in the same change set as code changes.
7. Remove or update obsolete documentation when it becomes misleading.
8. Keep final integrated testing at the end of the milestone, following the user request.

## Target architecture

```text
Tauri Frontend
  -> Rust Command API
     -> Lifecycle State
     -> Audio Capture and Calibration
     -> VAD
     -> ASR Adapter
     -> Translation Adapter
     -> TTS and Output Adapter
     -> UserData Cache, Log, and Save Writers
```

## Conversion phases

### Phase 0 — Branch and scaffold baseline

Status: Started.

- Create `ChatGPT-ConvertEngine`.
- Add `RustApp` scaffold.
- Add scaffold checker.
- Add conversion documentation.
- Update project documentation and history.

### Phase 1 — Tauri shell parity

- Match the clean main UI direction.
- Stabilize frontend/backend command payloads.
- Keep pending features clearly labeled.

### Phase 2 — Rust runtime state and config

- Port config models.
- Port audio settings persistence.
- Port lifecycle transitions.
- Preserve `UserData` paths.

### Phase 3 — Audio capture and VAD

- Port microphone discovery.
- Port calibration.
- Port 16 kHz mono pipeline.
- Preserve raw-audio VAD behavior.

### Phase 4 — ASR adapter parity

- Preserve Faster-Whisper Large V3 Turbo behavior unless a replacement is explicitly approved.
- Preserve Medium fallback behavior.
- Preserve CUDA-first validation.

### Phase 5 — Translation adapter parity

- Preserve local NLLB primary behavior.
- Preserve Marian Indonesian-English fallback behavior.
- Preserve deterministic short-phrase handling.

### Phase 6 — TTS/output parity

- Preserve local output behavior.
- Preserve custom voice profile visibility.
- Preserve stop/cancel behavior.

### Phase 7 — Final integrated validation

Testing is reserved for the end of the conversion milestone.

Planned final validation commands:

```powershell
python .\DevelopingData\ToolKitData\Scripts\Execution\check_rust_app.py
cd .\EngineData\LauncherApp\RustApp
npm install
npm run typecheck
npm run check:rust
npm run build
```

Manual QA must verify that the app opens as a desktop app, the UI state is truthful, microphone flow works, CUDA policy is visible, translation output works, audio output works, and logs remain in the documented `UserData` paths.

## Documentation sync files

The following files must stay aligned during the conversion:

```text
DevelopingData/DocumentationData/SourceDocument/MASTER_PROJECT_DOCUMENTATION.md
DevelopingData/DocumentationData/LogData/PROJECT_HISTORY.md
DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/RUST_TAURI_ENGINE_CONVERSION_PLAN.md
EngineData/LauncherApp/RustApp/README.md
```

## Current implementation truth

This branch currently contains a Rust/Tauri scaffold and migration documentation. The runtime engine itself is not fully converted yet.

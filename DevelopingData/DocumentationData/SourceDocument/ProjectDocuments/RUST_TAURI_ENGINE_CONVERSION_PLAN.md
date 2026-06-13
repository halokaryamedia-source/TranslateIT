# Rust and Tauri Engine Conversion Plan

## Document control

- Project: TranslateIT
- Branch: `ChatGPT-ConvertEngine`
- Conversion version: `0.6.3-rust-device-calibration-inference-contracts`
- Date: `2026-06-14`
- Status: Full-Rust target with runtime support, audio gate, device/calibration contracts, and native inference backend selection boundary
- Root baseline used: `Developing` commit `f412ba06bace37f6c0118eb20a6a2f91f0a63e76`
- Observed commit: `76139bc13bd0b8f59f4307d98703a5f335460470`

## Purpose

This document controls the migration from the current Python/PySide6 TranslateIT runtime toward a Rust/Tauri implementation.

The final target is a Rust-owned runtime. Python remains only a behavior reference during the migration and must not be required by the final runtime.

## Full-Rust target definition

`Full Rust` for TranslateIT means:

- Tauri desktop app shell.
- Rust command bridge.
- Rust lifecycle state.
- Rust configuration and path ownership.
- Rust runtime settings persistence.
- Rust runtime logging and diagnostics.
- Rust audio capture, calibration, and VAD.
- Rust-owned adapter boundaries for ASR, translation, and TTS.
- No Python runtime dependency in the final app.
- CUDA inference may use native CUDA-capable libraries through Rust FFI or native bindings.

This does not mean every CUDA kernel or model runtime must be handwritten in Rust. The important rule is that the final application runtime must be Rust-owned and must not depend on Python to operate.

## Baseline created in this branch

```text
EngineData/LauncherApp/RustApp/
  README.md
  package.json
  tsconfig.json
  index.html
  src/main.ts
  src/styles.css
  src-tauri/Cargo.toml
  src-tauri/build.rs
  src-tauri/tauri.conf.json
  src-tauri/src/main.rs
  src-tauri/src/engine/mod.rs
  src-tauri/src/engine/state.rs
  src-tauri/src/engine/config.rs
  src-tauri/src/engine/cuda_policy.rs
  src-tauri/src/engine/paths.rs
  src-tauri/src/engine/settings.rs
  src-tauri/src/engine/logging.rs
  src-tauri/src/engine/models.rs
  src-tauri/src/engine/diagnostics.rs
  src-tauri/src/engine/audio/mod.rs
  src-tauri/src/engine/audio/device.rs
  src-tauri/src/engine/audio/calibration.rs
  src-tauri/src/engine/audio/evidence.rs
  src-tauri/src/engine/audio/vad.rs
  src-tauri/src/engine/inference/mod.rs
  src-tauri/src/engine/inference/backend.rs
  src-tauri/src/engine/adapters/mod.rs
  src-tauri/src/engine/adapters/asr.rs
  src-tauri/src/engine/adapters/translation.rs
  src-tauri/src/engine/adapters/tts.rs
```

The scaffold includes a clean frontend shell, a Rust command bridge, runtime state contracts, config contracts, path discovery, settings persistence, logging, diagnostics, audio device/calibration/evidence/VAD contracts, native inference backend selection records, CUDA policy contracts, and explicit pending-state responses.

## Observed commit handling

The observed commit added a RustApp scaffold checker. In this branch, the checker is placed in the documented tooling path:

```text
DevelopingData/ToolKitData/Scripts/Execution/check_rust_app.py
```

This preserves the intent of the commit while avoiding a second tooling root.

## Non-negotiable rules

1. Do not delete the Python engine until Rust parity is proven.
2. Final runtime must not depend on Python.
3. Do not silently change ASR, translation, TTS, CUDA, latency, cache, log, or save behavior.
4. Do not silently degrade CUDA-first behavior to CPU.
5. Do not show false `Ready` status for unconverted features.
6. Keep the user-facing UI clean and simple.
7. Update documentation in the same change set as code changes.
8. Remove or update obsolete documentation when it becomes misleading.
9. Keep final integrated testing at the end of the milestone, following the user request.

## Target architecture

```text
Tauri Frontend
  -> Rust Command API
     -> Rust Lifecycle State
     -> Rust Config and Path Layer
     -> Rust Settings Persistence
     -> Rust Runtime Logging and Diagnostics
     -> Rust Audio Device Discovery
     -> Rust Audio Calibration
     -> Rust Audio Evidence Gate
     -> Rust VAD
     -> Native ASR Adapter
     -> Native Translation Adapter
     -> Native TTS and Output Adapter
     -> Native CUDA Inference Backend
     -> UserData Cache, Log, and Save Writers
```

## Rawan area and controls

| Area | Risk | Control |
| --- | --- | --- |
| CUDA translation | Rust alone does not guarantee faster CUDA inference | Use native CUDA-capable backend through Rust-owned adapter |
| Native inference selection | Wrong backend can break quality, latency, or packaging | Record candidate backend and reason before implementation |
| NLLB and Marian tokenizer parity | Output can change if tokenizer behavior differs | Treat Python output as reference until parity QA passes |
| ASR parity | Faster-Whisper behavior can change if backend differs | Preserve model, decode profile, prompt, and confidence rules |
| CPU fallback | App can feel working but no longer meets target performance | CUDA must be visibly validated before Ready |
| Audio gate | Silence/noise could reach ASR if capture is ported too directly | Rust audio evidence and VAD gate must reject weak input before ASR |
| Audio device selection | Wrong input/output route can make app look broken | Device discovery and calibration must be explicit and logged |
| TTS/custom voice | Easy to regress into default voice or double playback | Adapter must report provider, fallback, cache, and cancel behavior |
| Packaging | Windows DLL/runtime packaging can break CUDA at user launch | Validate native dependencies only in the final milestone gate |

## Conversion phases

### Phase 0 — Branch and scaffold baseline

Status: Done.

- Create `ChatGPT-ConvertEngine`.
- Add `RustApp` scaffold.
- Add scaffold checker.
- Add conversion documentation.
- Update project documentation and history.

### Phase 1 — Tauri shell parity

Status: Started.

- Match the clean main UI direction.
- Stabilize frontend/backend command payloads.
- Keep pending features clearly labeled.
- Expose diagnostics and settings commands without claiming runtime parity.

### Phase 2 — Rust runtime state and config

Status: Started.

- Port config models.
- Port path discovery.
- Port audio settings persistence.
- Port runtime logging.
- Port lifecycle transitions.
- Preserve `UserData` paths.
- Keep Python only as reference.

### Phase 3 — Audio capture and VAD

Status: Started.

- Port microphone discovery.
- Port calibration.
- Port 16 kHz mono pipeline.
- Preserve raw-audio VAD behavior.
- Rust audio evidence and VAD gate baseline is now present.
- Audio device and calibration contracts are now present.

### Phase 4 — ASR adapter parity

Status: Boundary started.

- Preserve Faster-Whisper Large V3 Turbo behavior unless a replacement is explicitly approved.
- Preserve Medium fallback behavior.
- Preserve CUDA-first validation.
- Final adapter must not require Python.
- Native inference backend selection record is now present.

### Phase 5 — Translation adapter parity

Status: Boundary started.

- Preserve local NLLB primary behavior.
- Preserve Marian Indonesian-English fallback behavior.
- Preserve deterministic short-phrase handling.
- Final adapter must not require Python.
- Native inference backend selection record is now present.

### Phase 6 — TTS/output parity

- Preserve local output behavior.
- Preserve custom voice profile visibility.
- Preserve stop/cancel behavior.
- Final adapter must not require Python.

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
DevelopingData/DocumentationData/SourceDocument/RUST_TAURI_CONVERSION_MASTER_ADDENDUM.md
DevelopingData/DocumentationData/LogData/RUST_TAURI_CONVERSION_LOG.md
DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/RUST_TAURI_ENGINE_CONVERSION_PLAN.md
EngineData/LauncherApp/RustApp/README.md
```

## Current implementation truth

This branch currently contains a Rust/Tauri scaffold, Rust runtime support modules, audio device/calibration/evidence/VAD gate modules, native inference backend selection contracts, CUDA policy boundary, adapter contracts, and migration documentation. The runtime engine itself is not fully converted yet.

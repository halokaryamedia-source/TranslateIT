# Rust Tauri Conversion Log

## Current entry

- Version: `0.6.2-rust-runtime-support-and-audio-gate`
- Date: `2026-06-14`
- Branch: `ChatGPT-ConvertEngine`
- Status: Full-Rust target documented; runtime support and Rust audio evidence gate baseline added
- Root baseline: `Developing` commit `f412ba06bace37f6c0118eb20a6a2f91f0a63e76`
- Observed commit: `76139bc13bd0b8f59f4307d98703a5f335460470`

## Summary

Created the professional Rust/Tauri conversion baseline, extended it with Rust-owned runtime contracts, then added runtime support modules and the first Rust audio evidence/VAD gate baseline. The final target remains full Rust ownership of the runtime without a Python dependency in the final application.

## Changes made

- Created `EngineData/LauncherApp/RustApp/`.
- Added Tauri package metadata.
- Added clean TypeScript frontend shell.
- Added clean CSS layout.
- Added Rust Tauri command bridge.
- Added explicit pending-state responses for unconverted runtime features.
- Added RustApp scaffold checker under the approved tooling tree.
- Added Rust/Tauri conversion plan.
- Updated folder README files so the new scaffold is documented.
- Added Rust engine module root under `src-tauri/src/engine/`.
- Added Rust lifecycle state contract.
- Added Rust engine config contract.
- Added Rust CUDA policy contract.
- Added Rust adapter contracts for ASR, translation, and TTS.
- Rewired Tauri commands so `main.rs` delegates to the Rust engine module.
- Added Rust project path discovery.
- Added Rust runtime settings load/save model.
- Added Rust runtime JSONL logging helper.
- Added Rust transcript, latency, quality, and saved-session data models.
- Added Rust runtime diagnostics payload.
- Added frontend Diagnostics and Save Settings command wiring.
- Added Rust audio target format contract.
- Added Rust audio evidence calculation.
- Added Rust VAD gate contract.
- Extended the scaffold checker to validate runtime support and audio gate files.

## Important decision

The final target is full Rust runtime ownership. Python is allowed only as a behavior reference during migration. CUDA inference may still use native CUDA-capable libraries through Rust FFI or native bindings, because rewriting proven CUDA model runtimes from scratch would increase risk and may reduce performance.

The user-provided commit added a check script under a separate `DevelopingData/Tools/` path. This branch keeps the same validation intent but places the script under:

```text
DevelopingData/ToolKitData/Scripts/Execution/check_rust_app.py
```

This keeps the project aligned with the existing documented root structure.

## Testing status

No final runtime test was run in this step. This is intentional because the requested workflow is to perform efficient testing at the end after the conversion milestone is ready.

## Next conversion target

- Add native Rust microphone device discovery plan and module boundary.
- Add Rust calibration data contract.
- Add native ASR backend selection record.
- Add native translation backend selection record.
- Preserve CUDA-first behavior, ASR behavior, translation behavior, TTS/output visibility, and `UserData` path rules.

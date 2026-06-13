# Rust Tauri Conversion Log

## Current entry

- Version: `0.6.3-rust-device-calibration-inference-contracts`
- Date: `2026-06-14`
- Branch: `ChatGPT-ConvertEngine`
- Status: Full-Rust target documented; device/calibration and native inference backend contracts added
- Root baseline: `Developing` commit `f412ba06bace37f6c0118eb20a6a2f91f0a63e76`
- Observed commit: `76139bc13bd0b8f59f4307d98703a5f335460470`

## Summary

Created the professional Rust/Tauri conversion baseline, extended it with Rust-owned runtime contracts, added runtime support modules, added audio evidence/VAD gate baseline, and added native device/calibration plus inference backend selection contracts. The final target remains full Rust ownership of the runtime without a Python dependency in the final application.

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
- Added Rust audio device discovery contract.
- Added Rust calibration profile contract.
- Added Rust native inference backend selection contract.
- Extended the scaffold checker to validate runtime support, audio gate, device/calibration, and inference files.

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

- Add concrete native Rust microphone backend choice.
- Add calibration save/load file path.
- Add CUDA backend probe boundary.
- Add ASR and translation adapter skeletons that consume the native inference backend selection record.
- Preserve CUDA-first behavior, ASR behavior, translation behavior, TTS/output visibility, and `UserData` path rules.

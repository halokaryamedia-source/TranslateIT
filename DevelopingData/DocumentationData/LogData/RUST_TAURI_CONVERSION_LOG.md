# Rust Tauri Conversion Log

## Current entry

- Version: `0.6.5-rust-input-preparation-boundary`
- Date: `2026-06-14`
- Branch: `ChatGPT-ConvertEngine`
- Status: Rust input preparation boundary added, Start command routed to input status, and direct input status command exposed
- Root baseline: `Developing` commit `f412ba06bace37f6c0118eb20a6a2f91f0a63e76`
- Observed commit: `76139bc13bd0b8f59f4307d98703a5f335460470`

## Summary

Created the Rust/Tauri conversion baseline, extended it with Rust-owned runtime contracts, added runtime support modules, added audio evidence and VAD gate baseline, added native device and inference backend contracts, advanced diagnostics with native audio discovery, CUDA host probe, ASR and translation backend plans, and added Rust input preparation.

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
- Added native Rust audio device discovery using `cpal`.
- Added Rust input preparation boundary using `cpal` default input inspection.
- Routed `start_capture` through Rust input preparation status.
- Exposed direct `get_input_status` Tauri command.
- Added Rust calibration profile contract.
- Added Rust calibration profile status path under `UserData/CacheData/rust_calibration_profile.json`.
- Added Rust native inference backend selection contract.
- Added native CUDA host probe boundary using `nvidia-smi`.
- Added ASR adapter plan that consumes native backend selection and CUDA probe.
- Added translation adapter plan that consumes native backend selection and CUDA probe.
- Updated frontend diagnostics to show native audio, input preparation, CUDA, calibration, and adapter-plan information.
- Extended the scaffold checker to validate runtime support, audio input, audio gate, device/calibration, inference, and CUDA probe files.

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

- Add Rust audio frame buffering boundary after input preparation.
- Add calibration command flow after input buffering is available.
- Add concrete CUDA backend validation for the chosen native inference path.
- Add ASR and translation adapter execution skeletons after backend selection is finalized.
- Preserve CUDA-first behavior, ASR behavior, translation behavior, TTS/output visibility, and `UserData` path rules.

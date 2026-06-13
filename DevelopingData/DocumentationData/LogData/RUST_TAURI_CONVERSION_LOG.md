# Rust Tauri Conversion Log

## Current entry

- Version: `0.6.1-rust-engine-contract-baseline`
- Date: `2026-06-14`
- Branch: `ChatGPT-ConvertEngine`
- Status: Full-Rust target documented; Rust engine contract baseline added
- Root baseline: `Developing` commit `f412ba06bace37f6c0118eb20a6a2f91f0a63e76`
- Observed commit: `76139bc13bd0b8f59f4307d98703a5f335460470`

## Summary

Created the first professional Rust/Tauri conversion baseline and then extended it with Rust-owned runtime contracts. The final target is full Rust ownership of the runtime without a Python dependency in the final application.

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
- Extended the scaffold checker to validate engine contract files.

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

- Port runtime path resolution and persisted settings into Rust.
- Add native Rust logging/report writing under `UserData/LogData`.
- Add Rust data models for transcript, translation, latency, and saved-session payloads.
- Preserve CUDA-first behavior, ASR behavior, translation behavior, TTS/output visibility, and `UserData` path rules.

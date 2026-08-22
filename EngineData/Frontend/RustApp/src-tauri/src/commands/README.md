# Tauri Command Modules

This folder contains the Tauri command boundary for the current Meeting / Text / My Voice / Settings product.

## Active modules

- `meeting_session.rs` — Meeting status, committed turns, Start/Stop orchestration, and Meeting lifecycle commands.
- `helper_bridge.rs` / `helper_bridge_runtime.rs` — persistent local Python worker bridge and scheduler.
- `audio.rs` — microphone/device status and device checks used by setup.
- `mic_test.rs` — Microphone Test Start/Stop wrappers.
- `runtime.rs` / `runtime_inventory.rs` — runtime readiness and explicit model-presence verification.
- `settings.rs` — runtime settings load/save and audio-device selection.
- `text_translate.rs` — standalone Text translation through the same worker.
- `virtual_mic_route.rs` — managed virtual microphone used by the meeting application.
- `voice_lab.rs`, `voice_lab_recording.rs`, `voice_lab_build.rs` — legacy internal module/protocol identifiers for the product feature now named **My Voice**. These names remain temporarily because they are coupled to persisted storage/protocol contracts; they are not user-facing product vocabulary.
- `diagnostic_trace.rs` — bounded diagnostics trace command support.
- `bridge_paths.rs` — packaged private Python/runtime path resolution.
- `registry.rs` — Tauri invoke registration list.

## Naming rule

Prefer names that describe the responsibility directly. New product-facing or semantic source must use **My Voice** (`MyVoice`, `myVoice`, or `my_voice` according to language convention). Do not introduce new `VoiceLab` product terminology. Existing `voice_lab` command/storage identifiers may remain only where changing them would require an explicit compatibility migration.

New command wrappers should be added only when a current product requirement and direct caller require them.

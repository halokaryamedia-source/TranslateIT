# Tauri Command Modules

The production command layer is intentionally small and follows the current Meeting / Text / Settings product.

## Active Boundaries

- `meeting_session.rs` — application Meeting status, committed turns, Start, Stop, and required/optional lane orchestration.
- `helper_bridge.rs` / `helper_bridge_runtime.rs` — one persistent local worker bridge and scheduler.
- `audio.rs` — microphone/device status and candidate checks used by setup.
- `runtime_capture.rs` — Mic Test Start/Stop wrappers only.
- `runtime.rs` / `runtime_inventory.rs` — explicit model-presence verification used by setup; normal readiness does not repeatedly scan models.
- `settings.rs` — runtime settings load/save.
- `text_translate.rs` — explicit Text translation through the same worker.
- `virtual_mic_route.rs` / `virtual_audio_route_runtime.rs` — internal Meeting Microphone route owners; they are not a manual frontend command surface.
- `pipeline_handoff.rs` — the small reset hook still required by Meeting cleanup.
- `registry.rs` — the authoritative production invoke surface.

Deferred feature command modules are removed rather than kept as compatibility surface. New command wrappers should be added only when a current product requirement and direct caller require them.

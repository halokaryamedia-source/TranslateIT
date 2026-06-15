# Tauri Command Modules

This folder keeps the Tauri command layer categorized by responsibility.

## Modules
- `diagnostics.rs`: runtime status, readiness, validation, CUDA/backend checks.
- `hardware.rs`: hardware usage command bridge.
- `runtime.rs`: lifecycle/session state commands and start/stop capture command entrypoints.
- `audio.rs`: audio input, capture planning, calibration, VAD, ASR profile, latency, and live capture support commands.
- `pipeline.rs`: translation pipeline planning, worker health, dry-run, native execution, playback, and transcript planning commands.
- `settings.rs`: runtime settings load/save commands.
- `chat.rs`: launcher chat persistence commands.
- `translation.rs`: manual text translation command.

## Maintenance rule
Command modules should stay thin. Put domain logic in `engine/`, then expose it through these command wrappers.

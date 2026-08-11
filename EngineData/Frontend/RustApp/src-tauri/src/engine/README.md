# Engine Translate Runtime Modules

This folder contains the Rust-side runtime logic that is still reachable from the current Meeting / Text / Settings product.

## Current owners

- `audio/`: physical microphone capture, Meeting Sound capture, finalized speech/VAD, and temporary finalized WAV handoff.
- `capture_lifecycle.rs`: bounded Mic Test Start/Stop ownership only.
- `runtime_state.rs`: one application Meeting/capture session and generation authority.
- `runtime_settings.rs` + `settings.rs`: persisted runtime settings.
- `paths.rs`: repository-development and installed runtime/user-data path ownership.
- `logging.rs`: bounded runtime log writer used by current settings/runtime paths.
- `state.rs`: shared command/lifecycle result types.

ASR, translation, and TTS inference are owned by the persistent local worker rather than a parallel Rust inference/planning engine.

## Maintenance rule

Keep only runtime logic with a current caller. Do not reintroduce dry-run planners, professional readiness gates, History/Chat persistence, transcript-save planning, native inference candidates, or generic service/domain scaffolding merely because older branches contained them.

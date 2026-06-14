# Rust/Tauri Handoff Lifecycle Status

## Scope

This report tracks the current safe runtime handoff state for the Rust/Tauri migration branch.

The goal is to make the migration status explicit without claiming that real microphone capture, ASR inference, translation inference, TTS, playback, final UI integration, or final validation are complete.

## Current implemented flow

1. Realtime Handoff records a fresh runtime snapshot.
2. Start checks lifecycle gate and records an active `preparing` session when allowed.
3. Duplicate Start is blocked while an active session exists.
4. Stop clears active session and stored handoff state.
5. CPAL input config probing is available.
6. CPAL capture stream planning is available.
7. CPAL capture build/callback contract is available.
8. Registered `capture_gate.rs` is available as the final pre-stream readiness gate.
9. Runtime readiness/status bundles summarize blockers and next action.
10. Migration closure gate keeps review/release claims behind manual validation and owner approval.

## Safety boundaries

Still not executed:

- real microphone stream opening;
- real ASR execution;
- real translation execution;
- real TTS/playback execution;
- final UI integration;
- final build/test/validation.

## Runtime modules

- `engine/runtime_state.rs`
- `engine/audio/input_config.rs`
- `engine/audio/capture_plan.rs`
- `engine/audio/stream_build.rs`
- `engine/audio/capture_gate.rs`
- `engine/adapters/native_capture_bridge_logic.rs`
- `src/runtimeLifecycle.ts`
- `src/runtimePanel.ts`

## Remaining work

- Expose `capture_gate` command after the tool block is cleared.
- Wire the final clean UI shell.
- Add real CPAL stream creation.
- Connect real ASR, translation, and TTS/playback.
- Run final validation only after explicit approval.

## Status

Draft migration state. This is a pre-stream readiness checkpoint, not a production readiness claim.

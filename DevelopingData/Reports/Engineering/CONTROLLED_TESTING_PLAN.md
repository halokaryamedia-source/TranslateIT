# Controlled Testing Plan

## Purpose

This document defines the next controlled testing phase for the Rust/Tauri TranslateIT migration.

This plan is not evidence that tests have been executed. It is the execution order to follow once testing is approved.

## Testing order

1. Repository and branch sanity check
   - Confirm branch: `ChatGPT-ConvertEngine`.
   - Confirm PR remains draft.
   - Confirm no ready-for-review, release-candidate, or production-ready claim is made.

2. Static project inspection
   - Verify RustApp folder exists.
   - Verify `src-tauri/Cargo.toml` exists.
   - Verify `src-tauri/src/main.rs` exposes the expected Tauri commands.
   - Verify frontend helper files exist.

3. Dependency and environment check
   - Confirm Rust toolchain is installed.
   - Confirm Node package manager is available.
   - Confirm Tauri prerequisites are installed on the target PC.
   - Confirm microphone permissions are available on Windows.

4. Build validation
   - Run dependency install.
   - Run TypeScript check if configured.
   - Run Rust check.
   - Run Tauri dev/build command only after dependency checks pass.

5. Command registration validation
   - Verify `get_runtime_status_bundle` is callable from the frontend.
   - Verify runtime status bundle contains `capture_gate`.
   - Verify `probe_native_input_config` is callable.
   - Verify `plan_native_capture_stream_state` is callable.
   - Verify `plan_native_capture_stream_build_state` is callable.
   - Verify `analyze_native_capture_bridge_state` is callable.

6. Pre-stream runtime validation
   - Run Realtime Handoff.
   - Confirm handoff snapshot exists.
   - Confirm Start gate is allowed only after fresh handoff.
   - Start should record a preparing session.
   - Duplicate Start should be blocked.
   - Capture gate should be visible in runtime status bundle.
   - Stop should clear active session and handoff state.

7. Real microphone stream validation
   - Enable/implement real CPAL stream opening only after pre-stream validation passes.
   - Confirm stream opens on the target Windows PC.
   - Confirm stream closes safely.
   - Confirm permission errors are reported clearly.
   - Confirm no duplicate stream ownership occurs.

8. ASR/translation/TTS validation
   - Connect real ASR execution.
   - Connect real translation execution.
   - Connect real TTS/playback execution.
   - Confirm each stage reports truthful readiness and blockers.

9. Final UI validation
   - Replace debug-heavy UI with the final clean TranslateIT shell.
   - Verify Start, Stop, status panel, warnings, and translation flow.
   - Verify no confusing extra buttons remain in the final user path.

10. Closure validation
   - Run manual runtime smoke test.
   - Run packaging validation.
   - Require owner approval.
   - Only then move PR out of draft.

## Stop conditions

Testing must stop if any of these occur:

- Build fails.
- Tauri command registration fails.
- Runtime status bundle shape does not match frontend expectations.
- Capture gate is missing from status bundle.
- Start can run without fresh handoff.
- Duplicate Start is not blocked.
- Stop does not clear runtime state.
- Real microphone stream opens without tracked ownership.
- Any component claims production readiness before final validation.

## Current phase

Current state: ready to begin controlled testing, but testing has not been executed yet.

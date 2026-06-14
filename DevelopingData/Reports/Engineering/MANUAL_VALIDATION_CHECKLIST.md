# Manual Validation Checklist

## Instructions

Use this checklist during controlled testing. Mark each item as PASS, FAIL, or BLOCKED.

Do not move the PR out of draft until all required validation items pass and owner approval is recorded.

## Build and startup

| Item | Status | Notes |
|---|---|---|
| Dependencies install successfully | PENDING | |
| Rust check completes | PENDING | |
| TypeScript check completes if configured | PENDING | |
| Tauri dev startup succeeds | PENDING | |
| Desktop app opens without browser fallback | PENDING | |
| No immediate runtime panic is shown | PENDING | |

## Command registration

| Item | Status | Notes |
|---|---|---|
| `get_engine_status` callable | PENDING | |
| `get_runtime_diagnostics` callable | PENDING | |
| `get_runtime_status_bundle` callable | PENDING | |
| `get_runtime_status_bundle.capture_gate` exists | PENDING | |
| `probe_native_input_config` callable | PENDING | |
| `plan_native_capture_stream_state` callable | PENDING | |
| `plan_native_capture_stream_build_state` callable | PENDING | |
| `analyze_native_capture_bridge_state` callable | PENDING | |
| `analyze_migration_closure` callable | PENDING | |

## Runtime handoff lifecycle

| Item | Status | Notes |
|---|---|---|
| Realtime Handoff records snapshot | PENDING | |
| Snapshot age is reported | PENDING | |
| Stale snapshot is blocked after max age | PENDING | |
| Start is blocked with no snapshot | PENDING | |
| Start is allowed with fresh ready snapshot | PENDING | |
| Start records active preparing session | PENDING | |
| Duplicate Start is blocked | PENDING | |
| Stop clears active session | PENDING | |
| Stop clears handoff snapshot | PENDING | |

## CPAL pre-stream checks

| Item | Status | Notes |
|---|---|---|
| Default input device is detected or clear blocker is shown | PENDING | |
| Default input config is detected or clear blocker is shown | PENDING | |
| Supported config ranges are returned | PENDING | |
| Capture stream planner selects rate/channels/format | PENDING | |
| Resample/downmix flags are truthful | PENDING | |
| Capture build/callback contract reports buffer capacity | PENDING | |
| Capture gate blocks without active session | PENDING | |
| Capture gate is visible through runtime status bundle | PENDING | |

## Real runtime checks

| Item | Status | Notes |
|---|---|---|
| Real microphone stream opens only after approval | PENDING | |
| Real microphone stream closes safely | PENDING | |
| ASR execution returns transcript | PENDING | |
| Translation execution returns target text | PENDING | |
| TTS/playback returns audible output | PENDING | |
| Runtime errors are user-readable | PENDING | |

## Final UI checks

| Item | Status | Notes |
|---|---|---|
| Final UI is clean and simple | PENDING | |
| Debug-heavy controls are removed from normal user flow | PENDING | |
| Start/Stop/status path is clear | PENDING | |
| Warnings are visible but not overwhelming | PENDING | |
| App works as standalone desktop app | PENDING | |

## Closure approval

| Item | Status | Notes |
|---|---|---|
| Manual runtime smoke test passed | PENDING | |
| Packaging validation passed | PENDING | |
| Owner approval recorded | PENDING | |
| PR can move out of draft | PENDING | |

## Result

Overall status: PENDING

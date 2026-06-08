# TranslateIT Engine Stability Baseline

Workspace: `D:\Work\AI Stuff\TranslateIT\Developing\Experimental`

This note records the guardrail baseline we want to preserve before any future latency work.

## What must stay stable

- Speaker/TTS backend stays unchanged.
- ASR model stays unchanged.
- Translation model stays unchanged.
- Playback backend stays unchanged.
- UI latency modal must remain clickable and stable.
- Start/Stop must work repeatedly without requiring an app restart.
- Cache/session state must not leak across starts.
- Worker failures must be logged clearly instead of being hidden.

## Stability logs now in use

- `UserData/LogData/engine_health_latest.json`
- `UserData/LogData/engine_stability_audit_latest.json`
- `UserData/LogData/start_stop_lifecycle_latest.json`
- `UserData/LogData/worker_health_latest.json`
- `UserData/LogData/playback_health_latest.json`
- `UserData/LogData/cache_session_guard_latest.json`
- `UserData/LogData/short_path_guard_latest.json`
- `UserData/LogData/long_turn_safety_latest.json`
- `UserData/LogData/ui_interaction_health_latest.json`
- `UserData/LogData/error_health_latest.json`

## Root causes we already found

1. UI click paths can drift away from the known-good V2 behavior even when syntax still compiles.
2. A compile-successful patch can still break runtime dialog behavior if the click callback or modal lifecycle changes.
3. The transcript UI can fail if a method signature changes while the caller still passes the older arguments.
4. Session reset and worker health are easy places for stale state to leak back in if they are not guarded explicitly.

## Safe rules for future patches

- Do not change speaker/TTS behavior unless the user explicitly asks for it.
- Do not change ASR or translation models during stability work.
- Do not collapse multiple UI signals into one handler without verifying the modal still opens and closes cleanly.
- Do not hide runtime failures; log them.
- Do not treat compile success as proof that runtime behavior is safe.
- Keep any new guard lightweight and non-blocking.

## Validation

Use the validation script before future patches:

`D:\Work\AI Stuff\TranslateIT\Developing\Experimental\DevelopingData\Tools\validate_engine_stability.py`

It should verify:

- the workspace exists
- the engine tree imports cleanly
- the engine compiles
- the log folder is writable



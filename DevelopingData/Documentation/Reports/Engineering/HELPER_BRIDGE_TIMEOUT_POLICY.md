# Helper Bridge Timeout Policy

Branch: `Dev-Rust`

## Purpose

The helper bridge uses a long-running Python worker and JSON-line requests over stdin/stdout. A worker response that never arrives can make runtime commands appear stuck.

This policy separates the current frontend guard from the required backend hardening.

## Current repo-side guard

The frontend runtime API applies timeout guards to helper bridge commands:

- `start_helper_bridge`: 15 seconds.
- helper lifecycle/request commands: 8 seconds.

When timeout happens, the frontend returns a non-ready result with:

```text
runtime_claim = frontend_timeout_backend_result_unknown
```

This prevents the user interface from waiting indefinitely, but it does not prove the backend command has stopped.

## Required backend hardening

Backend helper bridge commands still need timeout/deadline behavior around worker stdout response reads.

Required future behavior:

1. Worker request is assigned a deadline.
2. If stdout response is not received before deadline, the command returns a blocked/timeout result.
3. The worker process is either marked unhealthy or restarted on next Start Helper.
4. Timeout evidence is written under `UserData/CacheData/HelperBridge/logs/`.
5. Any late response is ignored if the generation token no longer matches.

## Required timeout states

Allowed helper timeout states:

- `timeout_frontend_only`
- `timeout_backend_read`
- `timeout_worker_unhealthy`
- `timeout_worker_restarted`

## UI rule

The UI may show a timeout warning, but must not claim that backend work was cancelled unless backend evidence confirms cancellation.

## Not ready claim

Frontend timeout guards improve UX, but full timeout reliability is not complete until backend stdout response deadline handling has passed target-PC validation.

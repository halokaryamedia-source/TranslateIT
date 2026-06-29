# TranslateIT V1-Advance Local-Only Script Restoration Plan

Branch: `V1-Advance`
Status: restoration plan for deferred package scripts

## Purpose

This plan explains how to restore deferred local-only package scripts later without breaking the current CI-safe branch.

## Restore order

Restore in this order only after GitHub CI is stable:

1. Rust full check
2. Frontend build verification
3. Worker setup
4. Worker smoke tests
5. Model inventory/setup/verify
6. GPU checks/setup
7. Voice/runtime reports
8. Audio Studio local validation
9. Release/Tauri package build

## Rules

Restore one group at a time.

After each group is restored, run the matching local target-PC validation before restoring the next group.

Do not mix local runtime restoration with unrelated feature work.

Do not promote any restored local-only command into GitHub CI until it is proven CI-safe and does not require CUDA, models, microphone, virtual microphone, TTS provider runtime, or installer packaging.

## Current deferred placeholder meaning

A placeholder such as:

```text
echo local-only worker setup deferred
```

means the script name is preserved for documentation and matrix validation, but the real command is intentionally not active in non-local CI.

## Not claimed

This plan does not claim that any deferred script is ready. It only defines the safe restoration order.

# V1 Automation Validation System

Branch: `automation/v1-validation-system`

## Goal

Reduce repeated manual testing by turning the common local validation flow into automated scripts and readable reports.

## Added files

```text
EngineData/Frontend/RustApp/scripts/run_v1_local_sync_and_test.ps1
EngineData/Frontend/RustApp/run_v1_local_sync_and_test.cmd
EngineData/Frontend/RustApp/scripts/install_v1_auto_sync_task.ps1
EngineData/Frontend/RustApp/scripts/uninstall_v1_auto_sync_task.ps1
```

## Recommended manual command

From the local repository root:

```powershell
cd "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\EngineData\Frontend\RustApp"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\run_v1_local_sync_and_test.ps1" -OpenReport
```

This script performs:

1. stash local changes if needed;
2. fetch origin;
3. checkout `V1`;
4. pull `V1` with fast-forward only;
5. install dependencies unless skipped;
6. run `npm run validate:quick`;
7. run `npm run test:runtime-report`;
8. open the latest runtime report when `-OpenReport` is passed.

## Double-click option

Run:

```text
EngineData/Frontend/RustApp/run_v1_local_sync_and_test.cmd
```

This calls the PowerShell automation script and opens the latest runtime report.

## Optional Windows auto-sync task

Install scheduled sync/validation:

```powershell
cd "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\EngineData\Frontend\RustApp"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\install_v1_auto_sync_task.ps1" -EveryMinutes 60
```

Remove scheduled sync/validation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\uninstall_v1_auto_sync_task.ps1"
```

## Important auto-sync note

A local PC cannot be pulled automatically from GitHub unless a local agent or scheduled task is installed on that PC. The scheduled task is optional because automatic pulling can be disruptive while editing files.

The script stashes local changes before pulling, but it should still be used carefully.

## Reports

Automation logs:

```text
UserData/LogData/Automation/
```

Runtime reports:

```text
UserData/LogData/RuntimeTestReports/latest-runtime-test.md
UserData/LogData/RuntimeTestReports/latest-runtime-test.json
```

## What should still be fixed next

Current visible runtime issues should be addressed using report evidence:

1. Text translation is showing local preview/fallback output instead of verified model output.
2. Voice capture can still fail if microphone start/stop or ASR evidence is blocked.
3. UI smoothness/hang needs profiling after runtime report identifies whether worker/model loading is blocking the app.

## Recommended next PR after this system

After the first automated report is produced, the next PR should focus on the exact failing layer:

- worker dependency/model path repair if report says worker/model failed;
- CUDA/provider setup if report says CPU fallback;
- frontend voice state handling if report passes but mic UI still fails;
- UI performance profiling if runtime model loading causes UI jank.

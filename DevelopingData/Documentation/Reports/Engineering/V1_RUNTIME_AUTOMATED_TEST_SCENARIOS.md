# V1 Runtime Automated Test Scenarios

Branch: `fix/v1-runtime-test-harness`

## Goal

Make local testing more effective by generating a readable runtime report before manual UI testing.

The report is designed to answer:

1. Is the local worker reachable?
2. Are Python dependencies available?
3. Is the translation model actually loading?
4. Is GPU/CUDA available or is the worker falling back to CPU?
5. Does Realtime ID > EN translation work?
6. Does Quality translation work?
7. Does EN > ID quality fallback work?
8. Is local TTS available?

## New command

Run from:

```text
EngineData/Frontend/RustApp
```

Command:

```text
npm.cmd run test:runtime-report
```

Or full local pre-test:

```text
npm.cmd run test:local-final
```

`test:local-final` runs:

```text
validate:quick
runtime worker report
```

## Report output

The command writes:

```text
UserData/LogData/RuntimeTestReports/latest-runtime-test.json
UserData/LogData/RuntimeTestReports/latest-runtime-test.md
```

The Markdown report is the main file to read first.

## Automated scenarios

1. Worker ping.
2. Worker status/preflight.
3. Realtime ID > EN translation.
4. Quality ID > EN translation.
5. Quality EN > ID translation.
6. TTS synthesize.

## How to use the report

### If `worker_alive` is false

The app cannot reach the local Python worker. Check Python installation and worker path.

### If `status_ok` is false

The worker exists but dependencies or models are missing. Read `blocker` in the report.

### If `realtime_translation_ok` is false

Text translation from the app will not be reliable yet. Read blocker from `translation_realtime`.

### If `selected_translation_device` is CPU

The worker is not using GPU for translation. Check `torch_cuda_available` and the CUDA setup scripts.

### If TTS fails

Voice output will not work even if text translation works. The report will show whether Piper or Windows SAPI is available.

## Manual UI checks after report passes

1. Start app with `npm.cmd run dev`.
2. Wait 10-15 seconds for startup readiness.
3. Test text translation once.
4. Test mic click-toggle for at least 2 seconds.
5. Stop mic and read latest audio evidence:

```text
UserData/LogData/RustAppValidation/latest_audio_pipeline_evidence.json
```

## Current limitation

This report does not directly click the Tauri UI. It validates the runtime engine path that the UI depends on. If the report passes but UI fails, the issue is likely frontend event/state handling rather than model/provider readiness.
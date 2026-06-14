# TranslateIT RustApp

## Purpose

`RustApp` is the Tauri-based desktop shell for the TranslateIT local realtime translation application.

The product direction is local-first:

- no API translation dependency,
- no cloud ASR dependency,
- no browser launcher dependency,
- one desktop app entry point,
- clean ChatGPT-like user flow,
- realtime Indonesian to English speech translation,
- truthful readiness status before any owner or release-candidate claim.

## Current status

Status: `local realtime worker pre-validation`.

This branch is not production-ready yet. The app has local worker commands, model readiness checks, runtime status UI, validation scripts, and smoke-test evidence paths. Real commercial readiness still requires local build validation, installed model assets, microphone smoke tests, ASR smoke tests, translation smoke tests, TTS smoke tests, and launcher package validation.

## Runtime profiles

Only two user-facing profiles should be shown:

| Profile | Target | Stack |
| --- | --- | --- |
| `Realtime` | Short phrase latency around 1000 ms after preload | Faster Whisper Large V3 Turbo + MarianMT ID-EN + Piper |
| `Quality` | Higher translation quality with slower response | Faster Whisper Large V3 Turbo + NLLB 200 distilled 600M + Piper |

## Required local assets

The app expects these local files and folders before real inference can be marked ready:

```text
EngineData/TranscriptEngine/ModelData/faster-whisper-large-v3-turbo/model.bin
EngineData/TranslateEngine/ModelData/marianmt-id-en/
EngineData/TranslateEngine/ModelData/nllb-200-distilled-600M/
EngineData/VoiceEngine/Piper/piper.exe
EngineData/VoiceEngine/Piper/**/*.onnx
```

The helper checker is:

```text
DevelopingData/ToolKitData/Scripts/Execution/check_local_runtime_models.py
```

## Local worker workflow

```powershell
# Install local worker dependencies and inspect model readiness
EngineData\LauncherApp\Workers\setup_realtime_worker.ps1

# Validate local worker contracts, model checker, smoke scripts, and stack manifest
npm run validate:worker

# Validate local model and Piper asset readiness
npm run validate:models

# Run full app validation after dependencies and assets are ready
npm run validate:full
```

## Folder map

```text
RustApp/
  README.md
  package.json
  tsconfig.json
  index.html
  src/
    main.ts
    styles.css
  src-tauri/
    Cargo.toml
    build.rs
    tauri.conf.json
    src/
      main.rs
      engine/
        mod.rs
        state.rs
        config.rs
        cuda_policy.rs
        paths.rs
        settings.rs
        logging.rs
        models.rs
        diagnostics.rs
        audio/
          mod.rs
          device.rs
          calibration.rs
          evidence.rs
          vad.rs
          live_capture.rs
          live_audio_buffer.rs
          live_segment_writer.rs
        inference/
          mod.rs
          backend.rs
          cuda_probe.rs
        adapters/
          mod.rs
          local_worker_manifest_logic.rs
          internal_validation_gate_logic.rs
Workers/
  realtime_local_worker.py
  requirements-realtime.txt
  realtime_stack_manifest.json
  setup_realtime_worker.ps1
  run_realtime_worker_smoke.ps1
```

## Development rules

- Keep the main UI simple and user-facing.
- Keep detailed diagnostics behind the developer panel.
- Do not claim production readiness before validation evidence passes.
- Do not claim CUDA readiness just because GPU hardware is visible.
- Do not claim realtime latency until ASR, translation, and TTS smoke tests report measured timings.
- Do not hide CPU fallback; report it clearly when CUDA is unavailable.
- Keep user-facing runtime choices limited to `Realtime` and `Quality`.
- Keep model installation and readiness checks explicit.

## Validation gates

Owner validation is blocked until all of these are true:

- Rust check passed,
- TypeScript typecheck passed,
- frontend build passed,
- Tauri package build passed,
- local worker stack passed,
- model assets are present,
- microphone capture smoke test passed,
- ASR transcript smoke test passed,
- translation smoke test passed,
- TTS/playback smoke test passed,
- launcher package open test passed.

Release-candidate status remains blocked until owner validation is allowed and explicitly promoted.

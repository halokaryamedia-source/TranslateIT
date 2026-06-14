# TranslateIT RustApp

## Purpose

`RustApp` is the Tauri-based desktop shell for the TranslateIT local realtime translation application.

The product direction is local-first:

- no API translation dependency,
- no cloud ASR dependency,
- no browser launcher dependency,
- one packaged desktop app entry point,
- startup warmup before the main UI,
- clean ChatGPT/Discord-like user flow,
- realtime Indonesian to English speech translation,
- truthful readiness status before any owner or release-candidate claim.

## Current status

Status: `local realtime worker pre-validation`.

This branch has local worker commands, model readiness checks, startup warmup UI, runtime status UI, validation scripts, and smoke-test evidence paths. Real commercial readiness still requires local build validation, installed model assets, microphone smoke tests, ASR smoke tests, translation smoke tests, TTS smoke tests, and package open validation.

## Runtime profiles

Only two user-facing profiles should be shown:

| Profile | Target | Stack |
| --- | --- | --- |
| `Realtime` | Short phrase latency around 1000 ms after preload | Faster Whisper Large V3 Turbo + MarianMT ID-EN + Piper |
| `Quality` | Higher translation quality with slower response | Faster Whisper Large V3 Turbo + NLLB 200 distilled 600M + Piper |

## Required local assets

The app expects these local files and folders before real inference can be marked ready:

```text
EngineData/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo/model.bin
EngineData/RuntimeAssets/Translation/ModelData/marianmt-id-en/
EngineData/RuntimeAssets/Translation/ModelData/nllb-200-distilled-600M/
EngineData/RuntimeAssets/Voice/Piper/piper.exe
EngineData/RuntimeAssets/Voice/Piper/**/*.onnx
```

The helper checker is:

```text
DevelopingData/Tooling/Scripts/Execution/translateit_tooling.mjs validate-models
```

## Local worker workflow

```powershell
EngineData\LauncherApp\Workers\setup_realtime_worker.ps1
npm run validate:worker
npm run validate:models
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
        inference/
        adapters/
Workers/
  realtime_local_worker.py
  requirements-realtime.txt
  realtime_stack_manifest.json
  setup_realtime_worker.ps1
  run_realtime_worker_smoke.ps1
```

## Development rules

- Keep the main UI simple and user-facing.
- Keep detailed diagnostics behind the settings/developer panel.
- Keep CUDA readiness tied to actual backend evidence.
- Keep realtime latency tied to measured ASR, translation, and TTS smoke results.
- Keep CPU fallback visible when CUDA is unavailable.
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
- package open test passed.

Release-candidate status remains blocked until owner validation is allowed and explicitly promoted.

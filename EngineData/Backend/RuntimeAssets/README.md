# RuntimeAssets

## Purpose

`RuntimeAssets` is the controlled local payload area for TranslateIT runtime/model dependencies. Runtime orchestration remains in the canonical Rust/Tauri + LocalWorker owners; this tree contains release/runtime assets only.

## Current Release Layout

```text
RuntimeAssets/
├─ ASR/
│  └─ ModelData/
│     ├─ faster-whisper-large-v3-turbo/   # required release ASR
│     └─ faster-whisper-medium/            # optional validated fallback
├─ Translation/
│  └─ ModelData/
│     ├─ marianmt-id-en/                   # required Meeting/Text ID -> EN
│     └─ marianmt-en-id/                   # required Text/incoming EN -> ID
└─ Voice/
   └─ GPTSoVITS/
      └─ Source/                           # pinned V2ProPlus source + pretrained assets
```

The authoritative model/release inventory is `EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json`. Large payload bytes are intentionally ignored by Git and staged as controlled release inputs before the Windows installer build.

## Packaging Boundary

`EngineData/Frontend/RustApp/src-tauri/tauri.release.conf.json` maps only the approved runtime payload into the Tauri resource root. `scripts/validate_release_payload.mjs` fails closed before release build when required Python/model/VoiceLab payload is missing, empty, revision-mismatched, or contains known unapproved GPT-SoVITS WebUI/server/auxiliary baggage.

Presence in this folder is release-input evidence only. It does not prove model load, training quality, speaker fidelity, GPU/VRAM practicality, latency, Windows audio delivery, installed execution, or clean-machine behavior.

## Rules

- Do not add application orchestration source here.
- Keep model binaries, GPT-SoVITS source/pretrained payload, FFmpeg, NLTK data, and other large runtime assets out of Git.
- Do not restore Piper, NLLB, alternate custom-voice engines, provider registries, or first-use download flows without a new approved product decision.
- Do not bundle upstream GPT-SoVITS WebUI/server/UVR/ASR tooling merely because upstream ships it.
- Runtime orchestration remains in `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py` and the bounded VoiceLab build owners.

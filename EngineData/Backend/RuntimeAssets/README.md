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

## Release Provenance / License Gate

The controlled release inventory must preserve both **exact provenance** and the applicable upstream notices. Current source audit status:

| Release input | Reviewed source / pin | Declared license status | Release gate |
|---|---|---|---|
| Faster Whisper large-v3-turbo | `dropbox-dash/faster-whisper-large-v3-turbo` @ `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf` | MIT | Preserve license/source identity and stage the pinned bytes. |
| Marian ID -> EN | `Helsinki-NLP/opus-mt-id-en` @ `9a7f1b0d0dfe0a92ba691030b01d6f23f966e7ec` | Apache-2.0 | Preserve Apache-2.0 notice/source identity and stage the pinned bytes. |
| Marian EN -> ID | `Helsinki-NLP/opus-mt-en-id` @ `6e4c52d61a6b16fe3509b0267cbfec65011b860b` | Apache-2.0 | Preserve Apache-2.0 notice/source identity and stage the pinned bytes. |
| GPT-SoVITS source | `RVC-Boss/GPT-SoVITS` @ `d523079fc05d9a8028d6085bffe4a2757c32abb6` | MIT | Preserve upstream license; pretrained/FFmpeg/NLTK inputs have separate obligations below `Voice/README.md`. |
| Standard VB-CABLE | official VB-Audio standard VB-CABLE package | Donationware / conditional distribution | Concrete release redistribution rights are **not** proven by source. The existing VB-CABLE owner remains the authority for the distribution gate. |

`validate_release_payload.mjs` proving that files exist is **not license clearance**. A release operator must not promote a staged payload to a distributable release while an applicable license/provenance gate remains unresolved. The private Python-runtime dependency gate is documented at `LocalWorker/README.md`; the voice-asset detail is documented at `Voice/README.md`.

## Rules

- Do not add application orchestration source here.
- Keep model binaries, GPT-SoVITS source/pretrained payload, FFmpeg, NLTK data, and other large runtime assets out of Git.
- Do not restore Piper, NLLB, alternate custom-voice engines, provider registries, or first-use download flows without a new approved product decision.
- Do not bundle upstream GPT-SoVITS WebUI/server/UVR/ASR tooling merely because upstream ships it.
- Runtime orchestration remains in `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py` and the bounded VoiceLab build owners.

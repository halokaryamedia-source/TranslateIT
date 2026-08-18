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
│     └─ m2m100-418m/                     # one canonical ID ↔ EN translator
├─ ThirdPartyNotices/
│  └─ THIRD_PARTY_NOTICES.txt              # generated from the exact staged payload before release preflight
└─ Voice/
   └─ GPTSoVITS/
      └─ Source/                           # pinned V2ProPlus source + pretrained assets
```

The authoritative model/release inventory is `EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json`. Large payload bytes are intentionally ignored by Git and staged as controlled release inputs before the Windows installer build.

## Packaging Boundary

`EngineData/Frontend/RustApp/src-tauri/tauri.release.conf.json` maps only the approved runtime payload into the Tauri resource root. `scripts/validate_release_payload.mjs` fails closed before release build when required Python/model/VoiceLab payload is missing, empty, revision-mismatched, or contains known unapproved GPT-SoVITS WebUI/server/auxiliary baggage.

Presence in this folder is release-input evidence only. It does not prove model load, translation quality, training quality, speaker fidelity, GPU/VRAM practicality, latency, Windows audio delivery, installed execution, or clean-machine behavior.

## Release Provenance / License Gate

The controlled release inventory must preserve both **exact provenance** and the applicable upstream notices. Current source audit status:

| Release input | Reviewed source / pin | Declared license status | Release gate |
|---|---|---|---|
| Faster Whisper large-v3-turbo | `dropbox-dash/faster-whisper-large-v3-turbo` @ `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf` | MIT | Preserve license/source identity and stage the pinned bytes. |
| M2M100 418M | `facebook/m2m100_418M` @ `55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636` | MIT | Preserve exact source identity and the reviewed model material. The WorkerRuntime acquires only the PyTorch files it consumes and intentionally excludes the duplicate unused Rust-framework weight. |
| GPT-SoVITS source | `RVC-Boss/GPT-SoVITS` @ `d523079fc05d9a8028d6085bffe4a2757c32abb6` | MIT | Preserve upstream license; pretrained/FFmpeg/NLTK inputs have separate obligations below `Voice/README.md`. |
| Standard VB-CABLE | official VB-Audio standard VB-CABLE package | Donationware / conditional distribution | Concrete release redistribution rights are **not** proven by source. The existing VB-CABLE owner remains the authority for the distribution gate. |

`validate_release_payload.mjs` proving that files exist is **not license clearance**. A release operator must not promote a staged payload to a distributable release while an applicable license/provenance gate remains unresolved. The private Python-runtime dependency gate is documented at `LocalWorker/README.md`; the voice-asset detail is documented at `Voice/README.md`.

## Deterministic Third-Party Notice Bundle

`ThirdPartyNotices/THIRD_PARTY_NOTICES.txt` is a derived release artifact, not a manually maintained legal inventory. `scripts/generate_third_party_notices.mjs` builds it offline from the exact staged payload before release preflight: CPython's bundled license, every installed Python distribution's embedded license/notice material and metadata/source references, the canonical model manifest, GPT-SoVITS/FFmpeg materials, CMUdict/NLTK attribution records, and the existing VB-CABLE notice.

The generator fails closed when an installed Python distribution has no embedded license/notice material, when the reviewed `g2p-en`/`frozendict`/`soxr`/`fsspec` versions drift, when the excluded Distance package reappears, or when the two LGPL Python dependencies no longer carry LGPL material. Release preflight rebuilds the expected content in memory and requires an exact match, so a stale notice file cannot be promoted.

The bundle is notice/source-material evidence only. It does not make a legal determination about the combined application, does not replace package-specific source/conveyance obligations, and does not establish the external VB-CABLE redistribution rights required for a concrete release.

## Rules

- Do not add application orchestration source here.
- Keep model binaries, GPT-SoVITS source/pretrained payload, FFmpeg, NLTK data, and other large runtime assets out of Git.
- Keep one canonical translation model; do not restore Marian or another translator as a fallback/router without a new evidence-backed product decision.
- Do not restore Piper, NLLB, alternate custom-voice engines, provider registries, or first-use download flows without a new approved product decision.
- Do not bundle upstream GPT-SoVITS WebUI/server/UVR/ASR tooling merely because upstream ships it.
- Runtime orchestration remains in `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py` and the bounded VoiceLab build owners.

# RuntimeAssets

`RuntimeAssets` is TranslateIT's controlled local release/runtime asset boundary. Application orchestration remains in the Tauri/Rust and LocalWorker owners; this tree contains models, voice assets, audio-provider payload, and generated notices only.

## Current layout

```text
RuntimeAssets/
├─ ASR/ModelData/
│  ├─ faster-whisper-large-v3-turbo/       # required release ASR
│  └─ faster-whisper-medium/                # optional validated fallback
├─ Translation/ModelData/
│  └─ xiaomi-research--MiLMMT-46-1B-v1.0/ # canonical ID ↔ EN translator
├─ Voice/GPTSoVITS/Source/                  # pinned V2ProPlus runtime/build assets
├─ AudioProvider/VBCABLE/
│  ├─ NOTICE.txt
│  └─ Package/                              # reviewed vendor package; release-side only
└─ ThirdPartyNotices/THIRD_PARTY_NOTICES.txt
```

The machine-readable model inventory is `EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json`. Required Hugging Face snapshots use immutable revisions and `.translateit_model_revision` markers. Translation identity is:

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
license metadata: Gemma
```

## R3 packaging boundary

Large runtime bytes are ignored by Git and staged as controlled release inputs. They are packaged into the colocated external `TranslateIT-Payload.7z`; they are **not** embedded in the Tauri resource map. `tauri.release.conf.json` carries only the small WorkerRuntime/control/notices closure used by `TranslateIT-Setup.exe`.

Release staging and validation are owned by `EngineData/Frontend/RustApp/scripts/`. The payload builder binds the external payload to the app version/schema and exact SHA-256. Installer source owns transactional runtime replacement, VB-CABLE vendor invocation/restart signaling, and uninstall cleanup of TranslateIT-owned external runtime. User data and the system VB-CABLE driver are preserved by uninstall policy.

Presence in this tree is not runtime acceptance. It does not prove CUDA/model execution, translation quality, My Voice quality, Windows driver behavior, virtual-audio delivery, or clean-machine installation.

## Provenance / notice boundary

Current high-level release inputs are:

| Input | Pinned source | Declared boundary |
|---|---|---|
| Faster Whisper large-v3-turbo | `dropbox-dash/faster-whisper-large-v3-turbo` @ `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf` | MIT |
| MiLMMT-46-1B-v1.0 | `xiaomi-research/MiLMMT-46-1B-v1.0` @ `4fc480b6c58dec29c159dcdf9fde0f6d5c354995` | Gemma metadata/terms |
| GPT-SoVITS source | `RVC-Boss/GPT-SoVITS` @ `d523079fc05d9a8028d6085bffe4a2757c32abb6` | MIT source; nested assets retain separate obligations |
| Standard VB-CABLE | reviewed official VB-Audio package | donationware / conditional distribution; preserve `NOTICE.txt` |

Exact Python/material hashes and exceptional license sources are machine-owned by `stage_release_license_material.py`, `validate_release_payload.mjs`, the model manifest, and generated third-party notices rather than duplicated here.

## Rules

- Keep one canonical translator; do not restore M2M100/Marian as a production fallback/router.
- Keep model, GPT-SoVITS, FFmpeg, NLTK, VB-CABLE package, and other large runtime bytes out of Git.
- Do not put application orchestration source under RuntimeAssets.
- Do not re-embed the large R3 payload into Tauri resources or add first-use model downloads.
- Preserve package-specific notices/provenance; file presence is not legal clearance or runtime proof.

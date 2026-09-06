# Voice Runtime Assets

## Purpose

This folder owns controlled local voice assets for TranslateIT. Product/session orchestration remains in Tauri/Rust and LocalWorker owners.

Current Meeting voice behavior has two user-facing choices under one runtime contract:

```text
Built-in Male/Female
→ ready without user training

My Voice
→ optional trained upgrade from authorized recordings
```

Existing `voice_lab_*` source/error/storage names are compatibility identifiers only; product terminology is **My Voice**.

## Controlled layout

```text
Voice/
├─ README.md
├─ BuiltInVoices/
│  ├─ SOURCES.json
│  ├─ MaleVoice/
│  │  ├─ reference.wav
│  │  └─ REFERENCE_SOURCE.txt
│  └─ FemaleVoice/
│     ├─ reference.wav
│     └─ REFERENCE_SOURCE.txt
└─ GPTSoVITS/
   └─ Source/
      ├─ TRANSLATEIT_GPTSOVITS_REVISION.txt
      ├─ ffmpeg.exe
      ├─ FFMPEG_LICENSE.txt
      ├─ FFMPEG_SOURCE.txt
      ├─ nltk_data/
      ├─ config.py
      ├─ GPT_SoVITS/
      │  ├─ training/inference source
      │  ├─ configs/
      │  └─ pretrained_models/
      └─ tools/
```

`TRANSLATEIT_GPTSOVITS_REVISION.txt` must contain:

```text
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

The source/model payload remains release-controlled and mostly untracked because of size. The small built-in reference WAV files and their provenance metadata are intentionally tracked controlled inputs.

## Runtime routes

Built-in Meeting voice:

```text
Rust built-in selection
→ pinned BuiltInVoices reference
+ reviewed shared V2ProPlus pretrained weights
→ selected actor/profile contract
→ existing voice_actor_preflight / voice_actor_synthesize worker path
```

My Voice:

```text
authorized guided recordings
→ Rust My Voice build command
→ LocalWorker voice_lab_build.py / voice_lab_upstream_stage.py
→ trained/evaluated candidate
→ explicit user approval
→ UserData/SavedProject/VoiceLab/MyVoice
→ same selected-voice worker inference contract
```

The `VoiceLab` path and `voice_lab_*` filenames are compatibility identifiers, not a second feature. GPT-SoVITS is never launched as a WebUI/server by TranslateIT.

## Built-in voice provenance

`BuiltInVoices/SOURCES.json` is the machine-readable authority. Current references:

```text
MaleVoice
speaker      3752
utterance    3752-4943-0003
source       LibriSpeech dev-clean / OpenSLR SLR12
license      CC-BY-4.0
wav SHA-256  1351eea8182b2f6ef00025b4e68b6a0e5184c059bd7c6d7dacc18988f2dbd200

FemaleVoice
speaker      6313
utterance    6313-66125-0007
source       LibriSpeech dev-clean / OpenSLR SLR12
license      CC-BY-4.0
wav SHA-256  81b131f23a3f4dd8dbef31082e07a957ea42bf7e7b86522c75b0e23209343423
```

These are **CC-BY-4.0**, not public-domain assets. Preserve exact source URL/reference text/utterance/hash metadata and include attribution in the canonical generated third-party notice bundle.

## GPT-SoVITS provenance

Application-consumed GPT-SoVITS source is pinned to `RVC-Boss/GPT-SoVITS` revision:

```text
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

Reviewed pretrained snapshot:

```text
lj1995/GPT-SoVITS
336b2ec4e8d4ac74740798dd40af44e74659ecaf
```

Key reviewed weight SHA-256 values:

```text
s1v3.ckpt                                      87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a
sv/pretrained_eres2netv2w24s4ep4.ckpt          4f5a0bf73c61eb41b174e1bb54e7ee3c83233892be8e0af1f187024e8e581a35
v2Pro/s2Dv2ProPlus.pth                         635cd84bf6f7f9b8d41c88c7106f81d782c794c61f931845214ea037b0c5bef2
v2Pro/s2Gv2ProPlus.pth                         d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b
```

The enclosing MIT declaration does not erase third-party obligations for nested assets.

## English-only optimized voice payload

The reviewed source snapshot may initially include Chinese RoBERTa bytes for provenance/preflight. Before final packaging, `optimize_release_payload.py` replaces those bytes with `TRANSLATEIT_ENGLISH_ONLY.txt`. Current TranslateIT voice synthesis/training output is English; `voice_lab_upstream_stage.py` supplies the approved English-only stage behavior. This optimization must not be described as Chinese/multilingual support.

## English G2P data

Packaged NLTK data is pinned to `nltk/nltk_data` revision:

```text
550b6625bcef1f2abff2ff770a5a0d272c9c6b2a
```

Package hashes:

```text
corpora/cmudict.zip                          d07cca47fd72ad32ea9d8ad1219f85301eeaf4568f8b6b73747506a71fb5afd6
taggers/averaged_perceptron_tagger.zip      e1f13cf2532daadfd6f3bc481a49859f0b8ea6432ccdcd83e6a49a5f19008de9
taggers/averaged_perceptron_tagger_eng.zip  6025f530624335c67d6547d44757b357b4e79bae030a0383e9887a92c1718f0b
```

The tagger resources are recorded as MIT. CMUdict provenance/acknowledgement follows its original source. No first-use NLTK download is allowed.

## FFmpeg provenance

The My Voice/built-in voice decoder path uses the reviewed static LGPL Windows build:

```text
builder                 BtbN/FFmpeg-Builds
builder release tag     autobuild-2026-08-10-13-17
builder commit          2437e7b868da3c11872367b15f3c613b87c24819
archive                 ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip
archive SHA-256         b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab
FFmpeg source commit    9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b
ffmpeg.exe SHA-256      ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d
LICENSE.txt SHA-256     da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768
license profile         LGPL-3.0-or-later
build profile           win64-lgpl-static
```

Staged companions:

```text
ffmpeg.exe
FFMPEG_LICENSE.txt
FFMPEG_SOURCE.txt
```

Preserve applicable LGPL/source/provenance obligations for distribution. This repository documentation is not a legal opinion or whole-release clearance claim.

## Rules

- Keep one Python/GPT-SoVITS runtime, not a separate environment per voice type.
- Built-in voices and My Voice share one selected-Meeting-voice inference path.
- Do not add Gradio/WebUI, provider dashboards, arbitrary voice engines or silent TTS fallback.
- Do not download required GPT-SoVITS/G2P assets during normal user operation.
- Do not silently fall back from the selected voice to Piper/SAPI/cloud/another voice.
- Keep large runtime/model/generated voice data out of Git; keep only explicitly approved small source/provenance inputs tracked.
- Runtime asset presence is not proof of model load, speaker quality, CUDA behavior or Meeting latency.

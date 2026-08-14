# Voice Runtime Assets

## Purpose

This folder owns local voice-runtime assets used by TranslateIT. Product orchestration remains in the canonical Rust/Tauri + LocalWorker owners; this folder contains model/provider payload only.

## Current / Target Layout

```text
Voice/
├─ README.md
└─ GPTSoVITS/
   └─ Source/
      ├─ TRANSLATEIT_GPTSOVITS_REVISION.txt
      ├─ ffmpeg.exe
      ├─ nltk_data/
      │  ├─ corpora/
      │  │  └─ cmudict/
      │  └─ taggers/
      │     ├─ averaged_perceptron_tagger/
      │     └─ averaged_perceptron_tagger_eng/
      ├─ config.py
      ├─ GPT_SoVITS/
      │  ├─ s1_train.py
      │  ├─ s2_train.py
      │  ├─ prepare_datasets/
      │  ├─ TTS_infer_pack/
      │  ├─ configs/
      │  └─ pretrained_models/
      │     ├─ s1v3.ckpt
      │     ├─ chinese-hubert-base/
      │     ├─ chinese-roberta-wwm-ext-large/
      │     ├─ sv/
      │     │  └─ pretrained_eres2netv2w24s4ep4.ckpt
      │     └─ v2Pro/
      │        ├─ s2Gv2ProPlus.pth
      │        └─ s2Dv2ProPlus.pth
      └─ tools/
```

`TRANSLATEIT_GPTSOVITS_REVISION.txt` must contain exactly:

```text
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

That revision is the reviewed GPT-SoVITS V2ProPlus source baseline. The source tree and model binaries are release/runtime payload, not Git-tracked application source.

`ffmpeg.exe` is the local decoder used by the approved headless English training path. VoiceLab does not rely on a system-PATH FFmpeg installation. `ffprobe.exe` is not part of the current required asset contract because the approved A4 path does not consume it.

The three NLTK directories are packaged English G2P resources. They are runtime assets rather than first-use downloads; VoiceLab must not fetch them while creating a voice.

## Active Orchestration Routes

Daily trained My Voice inference is owned by:

```text
existing realtime_local_worker.py
-> approved UserData/SavedProject/VoiceLab/MyVoice
-> Voice/GPTSoVITS/Source
```

VoiceLab build/evaluation is owned by:

```text
Rust VoiceLab build command
-> canonical LocalWorker Python interpreter
-> EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_build.py
-> EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_upstream_stage.py
-> Voice/GPTSoVITS/Source
```

The headless stage runner only removes the upstream WebUI coupling from `tools.my_utils` for the two functions consumed by the approved path (`clean_path` and `load_audio`). It does not replace GPT-SoVITS model, preprocessing, training, or TTS logic.

The GPT-SoVITS source is never launched as a WebUI or server by TranslateIT.

## Release Provenance / License Gate

### GPT-SoVITS source and pretrained snapshot

- Application-consumed GPT-SoVITS source remains pinned to `RVC-Boss/GPT-SoVITS` revision `d523079fc05d9a8028d6085bffe4a2757c32abb6`; upstream source is MIT and its license must remain with the bundled source.
- The reviewed pretrained-asset snapshot is `lj1995/GPT-SoVITS` revision `336b2ec4e8d4ac74740798dd40af44e74659ecaf`. Do not stage floating `main` as release authority.
- Key release weights must match these SHA-256 values before a distributable payload is approved:

```text
s1v3.ckpt                                      87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a
sv/pretrained_eres2netv2w24s4ep4.ckpt          4f5a0bf73c61eb41b174e1bb54e7ee3c83233892be8e0af1f187024e8e581a35
v2Pro/s2Dv2ProPlus.pth                         635cd84bf6f7f9b8d41c88c7106f81d782c794c61f931845214ea037b0c5bef2
v2Pro/s2Gv2ProPlus.pth                         d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b
```

The repository-level MIT declaration is not permission to discard third-party attribution or license text for nested assets. Preserve the original notices applicable to the packaged HuBERT/RoBERTa/speaker resources.

### English G2P data

The two packaged NLTK averaged-perceptron tagger resources are recorded by NLTK as MIT. NLTK's aggregate metadata lists `cmudict` as ambiguous, so TranslateIT follows the original CMUdict source instead: CMU states research/commercial use is unrestricted and requests acknowledgement of Carnegie Mellon origin when the dictionary is used or redistributed. Preserve that acknowledgement in release notices.

### FFmpeg

`ffmpeg.exe` is **not license-cleared by the current source contract**. FFmpeg is LGPL 2.1-or-later by default, but a build that enables GPL-covered components is governed by GPL terms. The historical GPT-SoVITS-linked Windows binary having a known file hash or being hosted inside an MIT-labelled model repository does not establish its FFmpeg build configuration or license profile.

Before a distributable release, record the exact Windows FFmpeg build origin/configuration and satisfy the corresponding FFmpeg license/source obligations. Do not treat `ffmpeg.exe` presence alone as release clearance.

## Rules

- Keep one canonical Python runtime. Do not add a second GPT-SoVITS environment.
- Do not add Gradio/WebUI, FunASR, UVR5, ModelScope download flows, or provider dashboards merely because upstream includes them.
- Do not download models or English G2P resources on the user's machine during normal VoiceLab creation.
- Do not silently fall back from a selected trained Voice Actor to Piper/SAPI.
- Keep GPT-SoVITS source payload, pretrained models, trained weights, generated audio, FFmpeg binary, and NLTK payload out of Git.
- Runtime asset presence is not proof of model load, training quality, CUDA behavior, speaker similarity, or Meeting latency.

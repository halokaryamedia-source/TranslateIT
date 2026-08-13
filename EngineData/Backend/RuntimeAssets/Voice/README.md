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

## Rules

- Keep one canonical Python runtime. Do not add a second GPT-SoVITS environment.
- Do not add Gradio/WebUI, FunASR, UVR5, ModelScope download flows, or provider dashboards merely because upstream includes them.
- Do not download models or English G2P resources on the user's machine during normal VoiceLab creation.
- Do not silently fall back from a selected trained Voice Actor to Piper/SAPI.
- Keep GPT-SoVITS source payload, pretrained models, trained weights, generated audio, FFmpeg binary, and NLTK payload out of Git.
- Runtime asset presence is not proof of model load, training quality, CUDA behavior, speaker similarity, or Meeting latency.

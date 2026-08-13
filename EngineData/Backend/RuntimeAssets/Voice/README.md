# Voice Runtime Assets

## Purpose

This folder owns local voice-runtime assets used by TranslateIT. Product orchestration remains in the canonical Rust/Tauri + LocalWorker owners; this folder contains model/provider payload only.

## Current / Target Layout

```text
Voice/
├─ README.md
├─ Piper/
│  ├─ piper.exe
│  ├─ *.onnx
│  └─ *.json
└─ GPTSoVITS/
   └─ Source/
      ├─ TRANSLATEIT_GPTSOVITS_REVISION.txt
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

## Active Orchestration Routes

Daily pre-VoiceLab TTS currently remains owned by:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py
```

VoiceLab build/evaluation is owned by:

```text
Rust VoiceLab build command
-> canonical LocalWorker Python interpreter
-> EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_build.py
-> Voice/GPTSoVITS/Source
```

The GPT-SoVITS source is never launched as a WebUI or server by TranslateIT.

## Rules

- Keep one canonical Python runtime. Do not add a second GPT-SoVITS environment.
- Do not add Gradio/WebUI, FunASR, UVR5, ModelScope download flows, or provider dashboards merely because upstream includes them.
- Do not download models on the user's machine during normal VoiceLab creation.
- Do not silently fall back from a selected trained Voice Actor to Piper/SAPI.
- Keep Piper binaries, GPT-SoVITS source payload, pretrained models, trained weights, and generated audio out of Git.
- Runtime asset presence is not proof of model load, training quality, CUDA behavior, speaker similarity, or Meeting latency.

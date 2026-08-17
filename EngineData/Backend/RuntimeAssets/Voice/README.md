# Voice Runtime Assets

## Purpose

This folder owns local voice-runtime assets used by TranslateIT. Product orchestration remains in the canonical Rust/Tauri + LocalWorker owners; this folder contains model/provider payload only.

## Current / Target Layout

Final optimized release layout:

```text
Voice/
├─ README.md
└─ GPTSoVITS/
   └─ Source/
      ├─ TRANSLATEIT_GPTSOVITS_REVISION.txt
      ├─ ffmpeg.exe
      ├─ FFMPEG_LICENSE.txt
      ├─ FFMPEG_SOURCE.txt
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
      │     │  └─ TRANSLATEIT_ENGLISH_ONLY.txt
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

The complete controlled staging input may initially contain the pinned Chinese RoBERTa directory from the reviewed GPT-SoVITS asset snapshot so baseline provenance/preflight can be checked. Before packaging, `scripts/optimize_release_payload.py` replaces those model bytes with `TRANSLATEIT_ENGLISH_ONLY.txt`. This is valid only because TranslateIT's approved VoiceLab dataset, held-out evaluation, and Meeting My Voice synthesis are English-only: the pinned `voice_lab_upstream_stage.py` bypasses Chinese BERT model initialization and supplies zero BERT features for non-Chinese text. Chinese/multilingual GPT-SoVITS use is not an approved release capability.

`ffmpeg.exe` is the local decoder used by the approved headless English training path. VoiceLab does not rely on a system-PATH FFmpeg installation. `FFMPEG_LICENSE.txt` and `FFMPEG_SOURCE.txt` are required release companions for that exact binary. `ffplay.exe`, `ffprobe.exe`, and libav DLLs are not part of the current runtime contract because the approved path does not consume them.

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

The headless stage runner removes the upstream WebUI coupling from `tools.my_utils` for the two functions consumed by the approved path (`clean_path` and `load_audio`) and provides the bounded English-only import/model-init/text-stage shims proven by the Windows release profile. It does not replace GPT-SoVITS acoustic/semantic models, training, or TTS logic.

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

The repository-level MIT declaration is not permission to discard third-party attribution or license text for nested assets. Preserve original notices applicable to the packaged HuBERT and speaker resources. The Chinese RoBERTa binary model is not part of the final optimized English-only release payload; its upstream origin may remain documented as provenance for the reviewed baseline snapshot, but absence of those model bytes must not be described as Chinese/multilingual runtime support.

### English G2P data

The two packaged NLTK averaged-perceptron tagger resources are recorded by NLTK as MIT. NLTK's aggregate metadata lists `cmudict` as ambiguous, so TranslateIT follows the original CMUdict source instead: CMU states research/commercial use is unrestricted and requests acknowledgement of Carnegie Mellon origin when the dictionary is used or redistributed. Preserve that acknowledgement in release notices.

R3 pins the packaged English G2P data to `nltk/nltk_data` revision `550b6625bcef1f2abff2ff770a5a0d272c9c6b2a`. The exact source-package SHA-256 values are:

```text
corpora/cmudict.zip                          d07cca47fd72ad32ea9d8ad1219f85301eeaf4568f8b6b73747506a71fb5afd6
taggers/averaged_perceptron_tagger.zip      e1f13cf2532daadfd6f3bc481a49859f0b8ea6432ccdcd83e6a49a5f19008de9
taggers/averaged_perceptron_tagger_eng.zip  6025f530624335c67d6547d44757b357b4e79bae030a0383e9887a92c1718f0b
```

The staged voice source must include `NLTK_DATA_SOURCE.txt` with that repository revision and all three package hashes. A different NLTK data snapshot must be reviewed and re-pinned before release; first-use NLTK downloads remain forbidden.

### FFmpeg

The VoiceLab decoder provenance/profile is pinned to one reviewed **static LGPL Windows build** rather than the historical provenance-unknown binary:

```text
builder                 BtbN/FFmpeg-Builds
builder release tag     autobuild-2026-08-10-13-17
builder commit          2437e7b868da3c11872367b15f3c613b87c24819
archive                 ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip
archive SHA-256         b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab
FFmpeg version          n8.1.2-34-g9b6c8969e0-20260810
FFmpeg source commit    9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b
ffmpeg.exe SHA-256      ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d
LICENSE.txt SHA-256     da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768
license profile         LGPL-3.0-or-later
build profile           win64-lgpl static executable
```

Hosted inspection of this exact archive confirmed `--pkg-config-flags=--static` and `--enable-version3`, no `--enable-gpl`, no `--enable-nonfree`, and zero DLL files in the archive. `ffmpeg -L` reports GNU Lesser General Public License version 3 or later. A decode smoke using the same VoiceLab shape (`WAV -> f32le / mono / 32 kHz`) also passed. The static executable therefore preserves the existing single-`ffmpeg.exe` runtime behavior; TranslateIT does not add libav DLL loading, `ffprobe`, `ffplay`, or another decoder owner.

The staged runtime must contain exactly these FFmpeg companions beside the GPT-SoVITS source:

```text
ffmpeg.exe
FFMPEG_LICENSE.txt
FFMPEG_SOURCE.txt
```

`FFMPEG_SOURCE.txt` must retain at least these exact records:

```text
source_kind=ffmpeg
binary_builder=BtbN/FFmpeg-Builds
builder_release_tag=autobuild-2026-08-10-13-17
builder_commit=2437e7b868da3c11872367b15f3c613b87c24819
archive=ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip
archive_sha256=b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab
ffmpeg_version=n8.1.2-34-g9b6c8969e0-20260810
ffmpeg_source_commit=9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b
ffmpeg_exe_sha256=ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d
license_profile=LGPL-3.0-or-later
build_profile=win64-lgpl-static
```

This resolves the **binary provenance and observed license profile** source-side; it is not a legal-opinion or whole-release clearance claim. A distributable release must preserve the LGPL license text and make the exact corresponding FFmpeg source/build provenance available in the manner required for that distribution. The release operator remains responsible for satisfying the applicable LGPL and third-party obligations. Do not replace this pin with BtbN `latest`, another build variant, or an arbitrary `ffmpeg.exe` without repeating the provenance/profile and VoiceLab decode proof.

## Rules

- Keep one canonical Python runtime. Do not add a second GPT-SoVITS environment.
- The final release may remove only the Python distributions and Chinese RoBERTa bytes owned by the profiled release optimizer; changing that exclusion boundary requires new Windows evidence.
- Do not add Gradio/WebUI, FunASR, UVR5, ModelScope download flows, or provider dashboards merely because upstream includes them.
- Do not download models or English G2P resources on the user's machine during normal VoiceLab creation.
- Do not silently fall back from a selected trained Voice Actor to Piper/SAPI.
- Keep GPT-SoVITS source payload, pretrained models, trained weights, generated audio, FFmpeg binary, and NLTK payload out of Git.
- Runtime asset presence is not proof of model load, training quality, CUDA behavior, speaker similarity, or Meeting latency.

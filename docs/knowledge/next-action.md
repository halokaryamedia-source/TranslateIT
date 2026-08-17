# TranslateIT — Next Action

## Current Status

`R3.1 RELEASE PAYLOAD OPTIMIZATION IMPLEMENTED — HOSTED PROFILE REQUIRED ON CURRENT HEAD`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

R3 established that the controlled fully offline payload was approximately **9.42 GB** and that the standard Tauri/classic-NSIS one-executable path fails at the large-installer mmap/offset boundary. That remains a packaging-format limitation, not evidence that TranslateIT runtime/model behavior is broken.

## Active Boundary

The release payload is now optimized at the packaging boundary without changing approved product capability:

- the frozen source/build Python closure remains reproducible from `pyproject.toml` + `uv.lock`;
- `scripts/optimize_release_payload.py` removes only the 19 distributions proven unnecessary for TranslateIT's approved English-only VoiceLab/My Voice release path;
- required Torch/CUDA, ASR, Marian translation, GPT-SoVITS training/inference, PyTorch Lightning, TensorBoard, Torchaudio, Transformers, ONNX Runtime, and Matplotlib remain retained;
- Chinese RoBERTa model bytes are removed from the final release payload because approved VoiceLab/My Voice text is English-only and the pinned headless stage supplies zero BERT features for non-Chinese text;
- the removed RoBERTa directory is replaced by a tiny `TRANSLATEIT_ENGLISH_ONLY.txt` marker so the upstream path shape remains explicit without shipping the unused model;
- bytecode/cache generated from Python packages is not retained as release authority.

`build_release.ps1` validates the complete controlled staging input first, applies the deterministic optimizer using the staged private Python runtime, regenerates third-party notices from the optimized Python closure, and only then invokes the local pinned Tauri CLI.

## Current Proof Boundary

The reusable Windows `Release Python Profile` is the proof surface for this optimization. It must establish on the current source state that:

```text
frozen production closure
→ 116 distributions

release optimizer
→ 97 distributions
→ all 19 approved exclusions absent
→ required runtime distributions retained

English-only GPT-SoVITS import/model-init/text stage
→ PASS without Chinese BERT load

pinned Chinese RoBERTa snapshot bytes
→ measured removable release payload
```

The previous successful profiling wave measured:

```text
Python closure saving          117,314,655 bytes
Chinese RoBERTa saving         651,495,070 bytes
projected optimized payload  8,651,382,148 bytes
projected total saving         768,809,725 bytes
```

Those numbers are hosted/profile evidence. The actual final staged payload size must be measured again after the production optimizer is applied to the complete controlled release input.

## Protected Boundaries

This optimization does **not** authorize or perform:

- smaller/quantized replacement models;
- CPU-only Torch or removal of CUDA;
- removal of VoiceLab training/evaluation;
- replacement of GPT-SoVITS V2ProPlus;
- replacement of faster-whisper large-v3-turbo or either Marian direction;
- first-use/core-model download;
- a second Python/runtime environment;
- Meeting/Text/VoiceLab/Settings behavior changes;
- default-branch changes;
- target-Windows quality/latency/device claims.

Local/target Windows validation remains deferred until explicitly reactivated.

## Next Step

**Assemble the complete optimized controlled release payload, run the existing release-input/notice preflight on that staging flow, record the actual final payload size, then decide the post-R3 packaging format from that optimized size.**

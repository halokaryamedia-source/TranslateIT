# TranslateIT — Next Action

## Current Status

`R3.2 QUALITY-PRESERVING SIZE OPTIMIZATION IMPLEMENTED — FINAL COMPLETE-PAYLOAD PROOF RUNNING`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

The post-R3 distribution boundary is approved:

```text
one user-facing automatic offline setup experience
+
TranslateIT-Setup.exe
+
colocated external release payload file(s)
```

Installer implementation remains held until the current R3.2 full-payload and compression proof closes.

## Closed R3.1 Baseline

R3.1 measured the exact current Tauri release resources at **8,630,347,667 bytes** after the first safe optimization pass. That pass removed 19 unnecessary Python distributions, derived bytecode/cache, and the unused Chinese RoBERTa model while preserving Torch/CUDA, faster-whisper large-v3-turbo, both pinned Marian directions, GPT-SoVITS V2ProPlus, VoiceLab training/evaluation, and the fully offline product boundary.

## R3.2 Proven Safe Improvements

Windows `Release Efficiency Profile` established two additional quality-neutral candidates:

1. **PyTorch build/development material**
   - `torch/include`, `torch/share`, and `.lib/.exp/.pdb` build files are not referenced by TranslateIT or the pinned GPT-SoVITS runtime path;
   - removing them preserved the complete Torch runtime DLL inventory and passed the runtime import/operation smoke;
   - measured saving: **88,645,335 bytes**.

2. **Duplicate TensorFlow Marian weights**
   - each pinned Marian snapshot contains `tf_model.h5` even though TranslateIT loads the models through PyTorch `AutoModelForSeq2SeqLM`;
   - removing only `tf_model.h5` preserved exact output parity on the representative ID→EN and EN→ID audit corpus;
   - measured saving: **291,599,120 bytes per direction**, **583,198,240 bytes total**.

Combined new R3.2 safe saving: **671,843,575 bytes** beyond the closed R3.1 baseline.

The production `optimize_release_payload.py` now performs both removals fail-closed. It keeps all Torch runtime DLLs, requires PyTorch Marian weights before deleting `tf_model.h5`, and leaves model architecture/precision unchanged.

`Release Python Profile` run `32065416794` passed on the production optimizer commit and measured:

```text
Python site-packages baseline   4,982,907,539 bytes
Python site-packages optimized  4,776,947,549 bytes
Python saving                     205,959,990 bytes
installed distributions                 116 → 97
English GPT-SoVITS path                    PASS
```

### CTranslate2 Marian candidate rejected

A non-quantized CTranslate2 float32 representation was investigated but **not adopted**. The current pinned converter path failed before a converted model/parity proof could be established (`MarianMTModel ... unexpected keyword argument 'dtype'`). R3.2 does not retry or substitute another translation engine merely to chase size. Current PyTorch Marian inference remains authoritative.

## Current Proof Boundary

A retained `Release Payload Verify` workflow now owns the complete release-input proof surface. It must:

```text
stage exact pinned CPython / Python closure / models / voice / audio provider
→ add reviewed exceptional license material
→ current notice + release-payload preflight
→ production release optimizer
→ optimized 97-distribution structural/runtime smoke
→ both optimized Marian models load and translate
→ exact current Tauri resource measurement
→ lossless ZIP Deflate and 7z/LZMA2 distribution-size benchmark
```

The large payload archives are not persisted; only bounded JSON reports are uploaded.

The projected Tauri resource input from the closed R3.1 measurement minus the two new proven savings is approximately **7,958,504,092 bytes**. This remains a projection until the retained full-payload workflow measures the current source state directly.

## Protected Boundaries

R3.2 does **not** authorize:

- smaller replacement ASR/translation/GPT-SoVITS models;
- INT8 or other quality-reducing quantization without a separate benchmark decision;
- CPU-only Torch or removal of CUDA runtime DLLs;
- removing VoiceLab training/evaluation;
- first-use/core-model downloads;
- a second Python/GPT-SoVITS runtime;
- changing Meeting/Text/VoiceLab/Settings behavior;
- changing the default branch;
- treating hosted Windows as target-GPU/device acceptance.

Local/target Windows validation remains deferred except when it becomes the minimum proof required for a GPU-specific claim.

## Next Step

**Wait for the retained `Release Payload Verify` Windows run on the current `Local` source. If full staging, optimized runtime/model smoke, exact size measurement, and lossless compression benchmarks pass, close R3.2 with the measured final installed-resource size and preferred colocated payload compression boundary; then implement the already-approved `TranslateIT-Setup.exe + colocated external payload file(s)` distribution.**

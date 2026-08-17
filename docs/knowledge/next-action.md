# TranslateIT — Next Action

## Current Status

`R3.2 QUALITY-PRESERVING RELEASE SIZE OPTIMIZATION CLOSED — EXTERNAL-PAYLOAD INSTALLER IMPLEMENTATION NEXT`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

## Active Boundary

The R3 packaging boundary is approved as:

```text
one user-facing automatic fully offline setup experience
+
TranslateIT-Setup.exe
+
colocated external release payload file(s)
```

R3.2 is complete. The release payload was reduced without changing approved ASR, translation, GPT-SoVITS, VoiceLab, CUDA, or offline capability. The active work now moves from payload-size optimization to implementing that approved external-payload packaging boundary.

## Final Measured Release Size

Windows `Release Payload Verify` run `32066467378` assembled the exact pinned controlled input, passed the current notice/release-payload preflight, applied the production optimizer, regenerated notices, verified the optimized Python/Marian runtime, measured the current Tauri resource map, and integrity-tested both compressed distribution candidates.

```text
Complete controlled input before optimization
9,420,585,051 bytes

Optimized controlled components
8,034,765,674 bytes

Exact current Tauri release resources
8,036,451,493 bytes
20,964 files

Controlled-component saving
1,385,819,377 bytes
```

Optimized component breakdown:

```text
PythonRuntime  4,877,787,600 bytes
ASR            1,621,668,947 bytes
Translation      588,006,460 bytes
Voice            943,835,088 bytes
VB-CABLE           3,467,579 bytes
```

## Quality-Preserving Changes

The production optimizer now removes only evidence-backed release baggage:

- 19 unnecessary Python distributions plus derived bytecode/cache;
- unused Chinese RoBERTa bytes from the approved English-only GPT-SoVITS path;
- PyTorch build/development material (`torch/include`, `torch/share`, `.lib/.exp/.pdb`) while preserving the complete runtime DLL inventory;
- duplicate Marian `tf_model.h5` files while preserving the PyTorch model weights actually loaded by TranslateIT.

No approved model was replaced, quantized, or downgraded. Both optimized pinned Marian directions loaded and generated successfully through the private packaged Python runtime. The optimized 97-distribution runtime/import smoke passed. ASR and GPT-SoVITS model selections remain unchanged.

The investigated CTranslate2 Marian float32 representation was not adopted because parity could not be established with the current pinned converter path. Current PyTorch Marian inference remains authoritative.

## Lossless Distribution Compression

The same exact **8,036,451,493-byte** Tauri resource set was compressed and integrity-tested losslessly:

```text
ZIP / Deflate
5,634,641,083 bytes
70.11% of raw
saving vs raw: 2,401,810,410 bytes

7z / LZMA2 solid
4,429,538,835 bytes
55.12% of raw
saving vs raw: 3,606,912,658 bytes

7z advantage over ZIP
1,205,102,248 bytes smaller
```

This compression changes **distribution size only**. Installed resources still expand to the same approximately **8.036 GB** capability-preserving payload.

`7z/LZMA2` is therefore the preferred **size-first candidate** for the colocated offline payload. It is not yet permission to add an unrelated 7-Zip runtime or a second user-facing extraction step; the installer implementation must consume the payload automatically with the smallest justified extraction mechanism.

## Protected Boundaries

Do not reduce size further by:

- replacing or quantizing the approved ASR/translation/GPT-SoVITS models without a separate quality decision;
- removing CUDA runtime capability;
- removing VoiceLab training/evaluation;
- adding first-use/core-model downloads;
- adding a second Python/GPT-SoVITS runtime;
- changing Meeting/Text/VoiceLab/Settings behavior;
- treating hosted Windows proof as target-GPU/device or clean-machine acceptance.

Local/target Windows validation remains deferred until explicitly reactivated or until it becomes the minimum proof required by installer/runtime acceptance.

## Next Step

**Implement the already-approved `TranslateIT-Setup.exe + colocated external payload file(s)` distribution. Start from the measured 7z/LZMA2 size-first candidate, inspect the existing Tauri/NSIS customization surface, and choose the smallest automatic extraction mechanism that preserves one fully offline Setup experience without manual extraction, first-use download, or a second installer/runtime owner.**

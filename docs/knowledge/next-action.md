# TranslateIT — Next Action

## Current Status

`R3.2 QUALITY-PRESERVING RELEASE SIZE OPTIMIZATION CLOSED — INSTALLER IMPLEMENTATION DEFERRED / PRODUCT FEATURE SCOPE REOPENED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

## Active Boundary

The R3 packaging boundary remains approved as:

```text
one user-facing automatic fully offline setup experience
+
TranslateIT-Setup.exe
+
colocated external release payload file(s)
```

That packaging decision is **preserved but deferred**. Do not continue installer/package implementation while additional product features may still be added, because new features can change runtime assets, dependencies, model payload, installed size, release validation, and the final distribution boundary.

R3.2 is complete. Its measurements and optimizer remain the current release-size baseline, not a signal to finalize the installer now.

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

`7z/LZMA2` remains the preferred **size-first candidate** for the future colocated offline payload, but no installer/extraction implementation should proceed until product scope is stable enough to re-freeze the release payload.

## Protected Boundaries

Do not reduce size further by:

- replacing or quantizing the approved ASR/translation/GPT-SoVITS models without a separate quality decision;
- removing CUDA runtime capability;
- removing VoiceLab training/evaluation;
- adding first-use/core-model downloads;
- adding a second Python/GPT-SoVITS runtime;
- changing Meeting/Text/VoiceLab/Settings behavior merely for packaging convenience;
- treating hosted Windows proof as target-GPU/device or clean-machine acceptance.

Also do **not** implement or finalize the installer/package boundary until the user explicitly reactivates installer work after the next feature scope is decided.

Local/target Windows validation remains deferred until explicitly reactivated or until it becomes the minimum proof required by the active feature/runtime slice.

## Next Step

**Define and approve the next product feature slice on `Local`. Keep the R3.2 optimizer, payload measurements, compression evidence, and approved external-payload packaging boundary preserved as deferred release context. Re-open installer/package implementation only after product scope is stable enough to freeze the release payload again.**

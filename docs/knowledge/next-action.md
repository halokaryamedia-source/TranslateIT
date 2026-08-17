# TranslateIT — Next Action

## Current Status

`R3.2 FINAL RELEASE EFFICIENCY AUDIT — OFFLINE PACKAGING BOUNDARY APPROVED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

The user has approved the post-R3 distribution boundary:

```text
one user-facing automatic offline setup experience
+
TranslateIT-Setup.exe
+
colocated external release payload file(s)
```

The installer implementation is intentionally held until one final bounded efficiency audit is complete, so the packaging format is built around the smallest capability-preserving payload rather than the first acceptable size.

## Closed R3.1 Baseline

R3.1 reduced the complete controlled release input without changing approved product capability.

Measured Windows complete staging:

```text
Before optimization
PythonRuntime  5,028,913,865 bytes
ASR            1,621,668,947 bytes
Translation    1,171,204,700 bytes
Voice          1,595,329,945 bytes
VB-CABLE           3,467,579 bytes
Controlled total 9,420,585,036 bytes

After optimization
PythonRuntime  4,888,485,544 bytes
ASR            1,621,668,947 bytes
Translation    1,171,204,700 bytes
Voice            943,835,078 bytes
VB-CABLE           3,467,579 bytes
Controlled total 8,628,661,848 bytes

Exact current Tauri release resources
8,630,347,667 bytes
26,699 files
```

R3.1 removed 19 proven-unnecessary Python distributions, derived bytecode/cache, and the unused Chinese RoBERTa model bytes. Torch/CUDA, faster-whisper large-v3-turbo, both Marian directions, GPT-SoVITS V2ProPlus, VoiceLab training/evaluation, and the fully offline product boundary remain intact.

## R3.2 Audit Boundary

R3.2 may investigate additional efficiency only when the existing product capability remains the acceptance baseline.

### 1. Torch / CUDA package-internal audit

Current optimized PythonRuntime is dominated by `torch==2.11.0+cu126` at approximately **4.13 GB**.

Audit package-internal subtrees for build/development-only material such as headers, CMake metadata, import/static libraries, tests/examples, or other files not consumed by installed inference/training. Do not remove CUDA runtime DLLs or other executable runtime material merely because hosted Windows has no physical GPU. Any pruning must preserve current import, VoiceLab build/training-stage, My Voice inference, and target-GPU proof boundaries.

### 2. Translation representation audit

Current canonical translation still loads `marianmt-id-en` and `marianmt-en-id` through Hugging Face `Transformers + Torch`.

Evaluate a CTranslate2 representation of the exact pinned Marian models because CTranslate2 is already a required TranslateIT runtime dependency. Start with a non-lossy / quality-preserving conversion profile before considering reduced-precision quantization.

Adoption requires measured evidence for:

```text
same approved ID ↔ EN directions
→ deterministic local model load
→ representative translation parity / quality acceptance
→ no first-use download
→ no second worker/runtime
→ materially smaller payload and/or better inference efficiency
```

Do not adopt INT8/model quantization merely for size unless a separate quality benchmark proves the result acceptable.

### 3. Distribution compression audit

After installed-resource optimization closes, measure compression for the colocated offline payload. Compression may reduce shipped/download size but must not be reported as reducing installed runtime size. Setup must still automatically consume the payload without user-managed extraction or additional installers.

## Protected Boundaries

R3.2 does **not** authorize:

- smaller replacement ASR/translation/GPT-SoVITS models;
- quality-reducing quantization without benchmark evidence;
- CPU-only Torch or removal of the approved CUDA capability;
- removing VoiceLab training/evaluation;
- first-use/core-model downloads;
- a second Python/GPT-SoVITS runtime;
- changing Meeting/Text/VoiceLab/Settings behavior;
- changing the default branch;
- treating hosted Windows as target-GPU/device acceptance.

Local/target Windows validation remains deferred until explicitly reactivated, except when it becomes the minimum proof required for a proposed GPU-specific pruning claim.

## Next Step

**Run the bounded R3.2 efficiency audit in this order: measure Torch/CUDA package-internal build-only candidates, evaluate exact Marian ID↔EN CTranslate2 conversion with quality/size parity, then measure external-payload compression. Adopt only savings that preserve the approved fully offline capability; after R3.2 closes, implement the already-approved `TranslateIT-Setup.exe + colocated payload file(s)` packaging boundary.**

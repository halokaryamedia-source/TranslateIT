# TranslateIT — Next Action

## Current Status

`R3.1 RELEASE PAYLOAD OPTIMIZATION COMPLETE — PACKAGING FORMAT DECISION REQUIRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

R3 established that the controlled fully offline payload was approximately **9.42 GB** and that the standard Tauri/classic-NSIS one-self-contained-executable path fails at the large-installer mmap/offset boundary. That remains a packaging-format limitation, not evidence that TranslateIT runtime/model behavior is broken.

R3.1 is now complete. The release payload has been reduced at the packaging boundary without changing approved product capability.

## Completed Optimization

The production release flow now:

```text
complete controlled release staging
→ current release-input / notice preflight
→ deterministic release optimizer
→ regenerate notices from optimized runtime
→ Tauri release packaging
```

The optimizer keeps the frozen source/build Python closure reproducible from `pyproject.toml` + `uv.lock`, then removes only release baggage already proved unnecessary for TranslateIT's approved English-only VoiceLab / My Voice path:

- 19 unnecessary Python distributions are absent from the final staged runtime;
- required Torch/CUDA, faster-whisper, Marian translation support, GPT-SoVITS training/inference, PyTorch Lightning, TensorBoard, Torchaudio, Transformers, ONNX Runtime, Matplotlib, and other required dependencies remain;
- Chinese RoBERTa model bytes are omitted because approved VoiceLab / My Voice text is English-only and the current headless GPT-SoVITS boundary supplies zero BERT features for that path;
- generated Python bytecode/cache is not retained as release authority;
- third-party notices are regenerated from the final optimized Python closure.

No model was quantized, replaced, or downgraded. CUDA remains the preferred execution path and VoiceLab training/evaluation remains part of the product.

## Hosted Proof

### Production optimizer profile

Windows `Release Python Profile` run `32059026994` proved the production optimizer on commit `f8a45ef3d106785e7240e8160acb39b7a0647d97`:

```text
Python site-packages before     4,982,907,539 bytes
Python site-packages optimized  4,865,592,884 bytes
profiled Python saving            117,314,655 bytes
installed distributions                 116 → 97
Chinese RoBERTa removable         651,495,070 bytes
English GPT-SoVITS path                    PASS
```

### Complete controlled staging

Windows complete-staging run `32059827859` then assembled the full controlled release input, added the reviewed exceptional license material, ran the **current** notice generator and `preflight:release-payload`, applied the production optimizer, regenerated final notices, audited the 97-distribution Python closure, and measured the current Tauri resource map.

Measured complete staging:

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

Measured controlled-component saving
791,923,188 bytes
```

The **exact current Tauri release resource input** after final notice generation is:

```text
8,630,347,667 bytes
26,699 files
```

This is measured Windows hosted staging evidence, not a projection. It is still not target-machine installation, GPU/CUDA execution, model quality, latency, physical Meeting audio, driver installation, or clean-machine proof.

## Remaining Size Floor

The remaining payload is dominated by required approved capability rather than obvious release baggage:

```text
PythonRuntime             4,888,485,544 bytes
  └─ torch 2.11 + cu126   4,130,874,538 bytes
ASR                       1,621,668,947 bytes
Translation               1,171,204,700 bytes
Voice                       943,835,078 bytes
```

A materially larger reduction from here would require a new product/runtime decision such as changing or quantizing models, changing the CUDA/Torch boundary, or otherwise altering approved capability. R3.1 does not authorize that.

## Packaging Decision Boundary

The optimized resource payload remains approximately **8.63 GB**. Given the previously reproduced classic-NSIS mmap/offset failure with the approximately 9.42 GB payload, there is no grounded reason to repeat compression variants or another all-in-one classic-NSIS attempt merely to rediscover the same structural size boundary.

Recommended minimum-change direction:

```text
one user-facing offline setup experience
+
TranslateIT-Setup.exe
+
colocated external release payload file(s)
```

The user should still launch one setup executable. The installer should consume its colocated payload automatically; users should not manually install Python, place models, run pip, or perform a second setup. Multiple distribution files do **not** imply multiple setup experiences.

Do not implement an external-payload installer, bootstrapper, first-use download system, alternate installer framework, or model/runtime reduction until the user explicitly approves the packaging boundary.

## Protected Boundaries

Do not proceed by:

- replacing or quantizing approved ASR/translation/GPT-SoVITS models without a separate decision;
- changing CUDA to CPU-only;
- removing VoiceLab training/evaluation;
- adding first-use/core-model downloads;
- creating a second Python/GPT-SoVITS runtime;
- changing Meeting/Text/VoiceLab/Settings behavior;
- changing the default branch;
- treating hosted staging as target-Windows runtime acceptance.

Local/target Windows validation remains deferred until explicitly reactivated.

## Next Step

**DECISION REQUIRED — approve or reject the recommended fully offline distribution boundary: one `TranslateIT-Setup.exe` plus colocated external payload file(s), while preserving one automatic setup experience.**

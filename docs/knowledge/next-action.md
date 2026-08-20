# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CANONICAL / REPO-SIDE TRANSLATION CLEANUP CLOSED / R3 EXTERNAL OFFLINE PAYLOAD SOURCE CONTRACT IMPLEMENTED / SETUP + COLOCATED 7Z/LZMA2 PAYLOAD / BUILD-ARTIFACT PROOF NEXT / TARGET-PC ACCEPTANCE DEFERRED`

## Active Boundary

- `Local` is the current development authority.
- `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- Canonical translator is `xiaomi-research/MiLMMT-46-1B-v1.0` at revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995`.
- Canonical WorkerRuntime dependency authority is Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2.
- M2M100, Marian, Transformers 4.50.0, and retired helper paths may remain only as historical evidence or explicit negative guards.
- The **R3 packaging boundary** is one automatic offline `TranslateIT-Setup.exe` plus colocated `TranslateIT-Payload.7z`; there is no bootstrap download, manual extraction flow, second setup, or user-managed Python/model installation.
- On Windows, the external payload installs its canonical `EngineData/...` tree under `$INSTDIR`, matching the Tauri executable/resource root used by packaged path resolution.
- Target-PC GPU/audio/installed-runtime/clean-machine acceptance remains deferred until explicitly requested.

## R3 source implementation

- `tauri.release.conf.json` now carries only the small worker/control/notices closure; PythonRuntime, ASR models, MiLMMT models, GPT-SoVITS, and the VB-CABLE package are no longer Tauri resources.
- `build_r3_external_payload.py` owns the external payload roots, 7z/LZMA2 creation, SHA-256 evidence, safe archive-entry validation, and generated trusted NSIS hook.
- `r3_payload_hooks.template.nsh` owns PREINSTALL payload verification and POSTINSTALL automatic extraction.
- `r3_payload_installer.ps1` is an installer-internal helper compiled into Setup; users do not run it manually. It verifies SHA-256, uses Windows `tar.exe`, and fail-closes on missing canonical Python/model/Voice/VB-CABLE markers after extraction.
- `build_release.ps1` produces the user-facing pair under `src-tauri/target/translateit-release/` and rejects any deliverable set other than exactly `TranslateIT-Setup.exe` + `TranslateIT-Payload.7z`.
- Release/Tauri source validators reject re-embedding the large payload, network bootstrap behavior, the retired Transformers 4.50 dependency boundary, and committed generated hook evidence.

## Closed Optimization Boundary

Keep MiLMMT-1B, CUDA BF16, PyTorch/Transformers, default SDPA/attention path, default generation cache, and a persistent loaded model. Do not add StaticCache, `torch.compile`, speed-only quantization, alternate inference backends, speculative decoding, a second translator, or phrase rewriting without a new explicit decision and new evidence.

## Next Step

**Run the Windows R3 build-artifact proof from current `Local`: stage/validate controlled release inputs, execute `scripts/build_release.ps1`, and verify the generated release directory contains exactly the hashed `TranslateIT-Setup.exe` + `TranslateIT-Payload.7z` pair. Do not perform installed-runtime, GPU/audio, VB-CABLE, or clean-machine target acceptance unless explicitly requested.**

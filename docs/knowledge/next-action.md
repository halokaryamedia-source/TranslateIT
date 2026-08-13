# TranslateIT — Next Action

## Current Mode

**Developing / VoiceLab A4 — GPT-SoVITS Voice Actor Build + Held-Out Evaluation: CLOSED SOURCE-SIDE**

A1 single-runtime compatibility, A2 Voice Actor/build contracts, and A3 guided recording remain closed. A4 now adds the bounded source path that can turn accepted guided recordings into one reviewable GPT-SoVITS V2ProPlus Voice Actor candidate without creating a second daily AI worker, second microphone engine, provider registry, or WebUI runtime.

## A4 Result

The active source now owns this VoiceLab creation flow:

```text
accepted 32 kHz mono PCM16 guided takes
-> voice authorization confirmation
-> freeze exact training dataset
-> one cancellable VoiceLab build child
-> pinned GPT-SoVITS V2ProPlus source
-> native gpt.ckpt + sovits.pth + reference.wav candidate
-> held-out English evaluation samples
-> user listens and explicitly approves
-> atomic promotion
-> UserData/SavedProject/VoiceLab/MyVoice
```

The GPT-SoVITS integration remains pinned to upstream revision:

```text
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

A4 uses a TranslateIT-owned headless stage boundary instead of importing the upstream Gradio/WebUI surface. The bounded provider path keeps the existing canonical Python runtime as the dependency owner. Gradio, FunASR, ModelScope, `onnxruntime-gpu`, alternate custom-voice engines, and a second packaged Python environment were not adopted.

Permanent worker dependencies are now owned by:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml
EngineData/Backend/LocalWorker/WorkerRuntime/uv.lock
```

The accepted lock is a clean `uv lock` resolution from the canonical `pyproject.toml`, not a manually reconstructed lock. The tracked lock blob is:

```text
93c34e63a4e2dc793606f84ed498a10b09ea40a3
```

The active Windows path resolves Torch/TorchAudio `2.11.0+cu126`, Transformers `4.50.0`, NumPy `1.26.4`, and the other bounded dependencies consumed by the approved A4 English build/evaluation path. English G2P/NLTK resources are explicit local runtime assets; runtime code is not allowed to silently download them.

A4 also closes the long-running build lifecycle gap. Build start is rejected while a guided recording or Meeting owns conflicting runtime resources. Rust keeps generation-bound lifecycle authority, the child publishes real `preparing / training / evaluating / ready_for_review / failed` state, cancellation terminates the build process tree, and an old approved actor is not replaced by an invalid or incomplete rebuild.

The user-facing VoiceLab UI remains intentionally small:

```text
record / replay / retry / accept
-> enough accepted speech
-> Create My Voice
-> Stop Creating when active
-> listen to held-out preview sentences
-> Approve My Voice
```

Internal checkpoints, epochs, provider names, CUDA details, and similarity numbers are not presented as normal product controls. Training completion or an internal similarity value alone is not treated as proof that the voice is good; held-out user listening approval remains required.

The full-product release inventory now includes the GPT-SoVITS VoiceLab source/pretrained asset root as a required manual/release asset. The developer Hugging Face downloader remains limited to revision-pinned Hugging Face assets and does not fabricate GPT-SoVITS or Piper release assets.

## Proof

Two hosted Windows proofs are accepted for A4.

### Pinned provider compatibility

Run `31724026882` proved the exact headless English V2ProPlus dependency boundary against the existing TranslateIT worker:

```text
current TranslateIT worker imports -> PASS
offline English G2P resources -> PASS
pinned GPT-SoVITS headless imports -> PASS
trainer/preprocess source syntax -> PASS
Gradio/FunASR/ModelScope/onnxruntime-gpu exclusion -> PASS
```

### Final current-source closure

Run `31733950503` completed successfully and its log was inspected directly. It proves:

```text
uv lock --check -> PASS
uv sync --frozen --no-install-project -> PASS
Python source compile -> PASS
Python tests -> 25 PASS / 0 FAIL
permanent Torch/TorchAudio/Transformers worker imports -> PASS
unrelated provider dependency exclusion -> PASS
svelte-check -> 0 errors / 0 warnings
Vite production build -> PASS
cargo check --locked -> PASS
cargo test --no-run --locked -> PASS
VoiceLab Rust contract tests -> 5 PASS / 0 FAIL
```

The five VoiceLab Rust tests cover authorization/held-out dataset integrity, generation-bound build/cancel semantics, required native actor artifacts, canonical guided-WAV dataset freezing, and preservation of the currently approved actor when a rebuild candidate is invalid.

The earlier failed lock/source-proof runs are not closure evidence. They exposed and corrected lock transfer/inventory-test issues before this accepted proof.

## Not Proven Yet

A4 source closure does **not** prove:

```text
physical microphone quality on the user's target PC
real GPT-SoVITS pretrained asset placement on the target installation
actual training duration on target hardware
CUDA / GPU / VRAM practicality on the target PC
real cancellation behavior under a long target training workload
subjective speaker identity / fidelity of a trained My Voice
held-out preview quality on the user's own recordings
clean-machine / installer packaging
trained-actor daily inference through the canonical worker
Meeting custom-TTS readiness or latency
physical VB-Cable / meeting-app audio delivery
```

No user-local-PC testing occurred. Hosted Windows source proof is not target-hardware acceptance.

## Next Step

**VoiceLab A5 — Canonical Worker Trained Voice Actor Inference**

Extend the existing canonical Python worker so an already approved `UserData/SavedProject/VoiceLab/MyVoice` actor can synthesize English speech through the GPT-SoVITS V2ProPlus path. Keep the current one-worker architecture and keep provider/checkpoint details private from the product-facing contract.

A5 should prove only the daily inference boundary needed before Meeting integration:

```text
approved MyVoice actor
-> load/validate native actor artifacts
-> prepare/cache canonical reference state
-> synthesize English text
-> return bounded local WAV/audio result
```

Do not add a second inference worker, provider registry, automatic retraining, background training scheduler, voice-profile selector, alternate custom-voice engine, or Meeting lifecycle changes in A5.

**Meeting atomic custom-TTS readiness remains the step after A5.** A5 should not weaken the existing C4/C5 generation-bound Meeting activation contract or silently fall back to the pre-VoiceLab voice when the trained My Voice path is the required authority.
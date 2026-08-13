# TranslateIT — Next Action

## Current Mode

**Developing / VoiceLab A1 — Single-Runtime Compatibility: CLOSED**

The previous pre-local source closure was intentionally reopened by explicit user approval on 2026-08-13 so VoiceLab can become part of the required product before target-Windows validation.

VoiceLab has one approved custom-TTS direction:

```text
GPT-SoVITS V2ProPlus
```

The goal remains speaker fidelity first: guided English recordings are used to fine-tune one reusable Voice Actor. Training is an occasional build operation; normal application/Meeting use performs inference only and must not retrain.

## A1 Result

Canonical product scope, requirements, durable decision, current context, and source ownership now agree that:

```text
Meeting
Text
VoiceLab
Settings
```

is the approved pre-target-validation product boundary.

VoiceLab deliberately remains one workflow and one engine. The first implementation does not add OpenVoice, Qwen zero-shot cloning, Piper/SAPI fallback, MeloTTS, RVC postprocessing, imported-audio branching, provider selection, quick-clone mode, professional/broadcast tiers, background training, or a second daily worker/runtime.

Hosted Windows compatibility proof run `31696783360` completed successfully against audited GPT-SoVITS revision:

```text
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

The bounded A1 proof established:

```text
canonical WorkerRuntime before candidate mutation
-> Python 3.12.10
-> torch 2.13.0+cu126
-> ctranslate2 4.8.1
-> faster-whisper 1.2.1
-> transformers 5.15.0
-> numpy 2.5.2
-> 25 deterministic worker tests PASS

bounded VoiceLab core additions in ephemeral proof environment
-> pytorch-lightning 2.6.5
-> einops 0.8.2

canonical core package identities after candidate mutation
-> unchanged

GPT-SoVITS V2ProPlus model core import
-> PASS

V2ProPlus SoVITS graph construction
-> PASS / 98,338,432 parameters

V2ProPlus acoustic-core import
-> PASS

V2ProPlus configuration contract
-> PASS

TranslateIT worker tests after candidate mutation
-> 25 PASS
```

The proof deliberately did **not** install the full upstream GPT-SoVITS dependency set. Investigation showed several broad upstream imports are not relevant to TranslateIT's English V2ProPlus path and must not become dependencies merely to make raw upstream wrappers importable:

```text
matplotlib
-> imported by learning-rate scheduler for its standalone demo only

F5-TTS / x_transformers
-> eagerly imported for V3 DiT code, not V2ProPlus SynthesizerTrn

librosa through CNHubert utils
-> caused by a demo-only `utils` import in CNHubert

pandas
-> raw upstream semantic-TSV convenience loader

gradio
-> coupled into upstream generic audio utility/UI helpers

torchaudio
-> generic reference audio load/resample wrapper; no matching torchaudio 2.13.0 candidate was adopted and the canonical Torch stack was not downgraded

AP_BWE / peft
-> optional/non-V2ProPlus inference paths

g2p_en / wordsegment
-> English frontend candidates, intentionally not adopted in A1 because the raw `g2p_en` initialization can attempt NLTK resource downloads when resources are absent

tensorboard
-> upstream training logging/UI support, not demonstrated as required by the Voice Actor product contract

FunASR / ModelScope / FastAPI / upstream WebUI
-> unrelated product/tooling surfaces
```

The temporary proof source removed only those non-core eager-import couplings inside its checkout; those edits were not copied into TranslateIT as a vendor dump. Both temporary GitHub Actions workflows were removed after accepted proof.

## A1 Decision Boundary

A1 proves **single-runtime model-core compatibility is viable enough to continue**. It does not yet authorize blindly copying upstream source or committing the ephemeral candidate dependencies into `pyproject.toml` / `uv.lock`.

The next implementation must define a small TranslateIT-owned adapter boundary around only the responsibilities the product actually requires:

```text
exact guided English dataset representation
+ offline-safe English text/phoneme preparation
+ bounded WAV loading/resampling
+ V2ProPlus native actor weights/reference contract
+ long-running build lifecycle
+ later canonical-worker inference contract
```

Do not preserve upstream WebUI/server/data-import architecture when a smaller product-owned boundary is sufficient.

## Not Proven Yet

A1 does **not** prove:

```text
pretrained GPT-SoVITS asset loading
real fine-tuning/training execution
generated speech
speaker similarity / voice fidelity
best-checkpoint selection
CUDA execution or VRAM practicality
CPU practicality
native inference latency
Meeting end-to-end latency
physical microphone / virtual-cable / meeting-app delivery
installer / clean-machine packaging
```

No local-PC test, model tuning, VAD tuning, Meeting audio change, endpoint migration, or installer staging was performed in A1.

## Next Step

**VoiceLab A2 — Voice Actor Contract + Build Lifecycle**

Define and implement the smallest canonical Voice Actor/build boundary before creating the full VoiceLab UI: exact guided-take/dataset schema, temporary-vs-approved storage, atomic actor promotion/rebuild, offline-safe English preparation boundary, bounded audio normalization ownership, native V2ProPlus actor package contract, and one cancellable/mutually-exclusive build lifecycle. Do not execute real training or integrate Meeting TTS yet unless A2's own acceptance requires a smaller deterministic proof.

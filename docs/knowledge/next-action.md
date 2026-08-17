# TranslateIT — Next Action

## Current Status

`R3.1 RELEASE PAYLOAD OPTIMIZATION ACTIVE`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

R3 remains valid evidence: the controlled approximately 9.42 GB fully offline payload staged successfully, the Tauri application executable built, and classic NSIS failed at its large-installer mmap/offset boundary with both normal compression and `compression = none`.

The user has explicitly approved optimizing the release payload before selecting the final packaging format.

## Active Optimization Boundary

Optimization must preserve the approved product capability:

```text
local/offline operation
ASR with faster-whisper large-v3-turbo
Indonesian ↔ English Marian translation
GPT-SoVITS V2ProPlus My Voice inference
VoiceLab training / rebuild / held-out evaluation
CUDA-preferred execution with capability-only CPU fallback
one canonical private Python runtime
no first-use core-model download
no manual Python / pip / repository setup
```

Current R3 size evidence:

```text
PythonRuntime  5,028,520,692 bytes
ASR            1,621,668,947 bytes
Translation    1,171,204,700 bytes
Voice          1,595,329,955 bytes
VB-CABLE           3,467,579 bytes
Total          9,420,191,873 bytes
```

The first proved optimization target is release baggage created by the generic multilingual GPT-SoVITS environment rather than TranslateIT's approved English VoiceLab/My Voice path. Current TranslateIT TTS requests use English text and English prompt language. Pinned upstream GPT-SoVITS eagerly imports multilingual text helpers and PEFT, and its generic TTS initialization loads Chinese RoBERTa even though English preprocessing returns zero BERT features. The approved English training text stage likewise does not consume BERT features.

A reusable Windows `Release Python Profile` proof surface is therefore used to compare the current frozen production closure with an English-only candidate before any dependency/model removal becomes release authority.

Candidate removals are evidence-gated. They currently include only direct packages attributable to unsupported multilingual/LoRA paths plus direct packages not imported by the selected training path:

```text
cn2an
fast-langdetect
jieba
jieba-fast
matplotlib
pandas
peft
pypinyin
split-lang
```

Chinese RoBERTa is also a candidate release-asset removal. It is not removed merely because it is large; the hosted proof must first establish that the TranslateIT English TTS model initialization and English training text stage do not consume it.

## Protected Boundaries

Do not optimize by:

- replacing or quantizing the approved ASR/translation/GPT-SoVITS models without a separate quality/runtime decision;
- removing VoiceLab training or evaluation;
- changing CUDA to CPU-only;
- introducing another Python/GPT-SoVITS runtime;
- adding cloud/first-use model download or manual setup;
- weakening dependency provenance/license validation merely to reduce size;
- treating hosted import/staging evidence as target-Windows training quality, latency, installed-runtime, audio-route, or clean-machine proof.

Local Windows validation remains deferred until explicitly reactivated.

## Next Step

**Run and inspect the reusable Windows release-Python profile; adopt only dependency and Voice-asset removals that measurably reduce the payload and pass the current ASR/translation/English VoiceLab runtime contract.**

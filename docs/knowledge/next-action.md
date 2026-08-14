# TranslateIT — Next Action

## Current Mode

**Maintenance / VoiceLab Pre-Local Quality Audit — SOURCE HARDENING**

VoiceLab A1 through A6 remain source-closed. Target/local Windows validation is explicitly deferred by the user for now. Hosted proof must not be presented as target GPU, speaker-quality, virtual-audio, meeting-app, installer, or clean-machine evidence.

## Pre-Local Audit Scope

The current maintenance pass is intentionally bounded to concrete source-quality gaps that can be proven without the user's PC:

```text
VoiceLab recording -> build UI consistency
normal-user error/message hygiene
PR-113 unusable-dataset build-time rejection
current GPT-SoVITS release-asset wording/ownership
obsolete temporary VoiceLab proof tooling
canonical documentation consistency
```

Do not add another VoiceLab milestone, provider/model selector, fallback TTS, background training, GPU arbitration, generic readiness framework, second lifecycle, second worker, or speculative optimization before target evidence requires it.

## Concrete Findings And Corrections

### Recording -> build state

The build panel previously refreshed only on mount or while a build was active. Accepting or replacing a guided take could therefore leave accepted count, duration, and `can_build` stale until the page was remounted.

The recording owner now advances a bounded refresh revision after a successful accepted take, and the existing build component refreshes from its canonical backend status. No duplicate dataset state was introduced.

### User-facing VoiceLab errors

Normal VoiceLab UI previously forwarded some backend messages directly, which could expose internal `voice_lab:*` protocol text. Recording/build action notices now convert such failures into bounded product-facing guidance while the underlying command error remains available to Diagnostics.

### PR-113 build-time quality gate

The product requirement already states that build-time checks must reject obviously unusable audio, including excessive silence and severe clipping. The one-shot VoiceLab build child now performs conservative structural PCM16 checks before expensive GPT-SoVITS work:

```text
canonical 32 kHz mono PCM16 required
>= 90% near-silence -> reject
>= 5% hard-clipped samples -> reject
otherwise continue to the existing build/evaluation path
```

These bounds are deliberately conservative rejection gates, not speaker-quality scoring and not target-audio tuning claims. Future tuning requires real user recordings.

### Asset/tooling hygiene

Developer model acquisition text no longer names Piper as a current release asset. The active required manual release asset is the pinned GPT-SoVITS VoiceLab bundle described by `model_manifest.json`.

Obsolete temporary A2/A3 proof workflows are removed. The temporary pre-local proof workflow is retained only until this maintenance pass receives its final hosted proof, then it should also be removed.

## Existing A6 Accepted Proof

A6 remains accepted from hosted Windows run `31773954105` at exact checkout SHA `d682f44d02ddd74a731b55bc1d0da6f738bf27f6`:

```text
A6 static authority guard -> PASS
frozen WorkerRuntime lock/import proof -> PASS
Python tests -> 28 PASS / 0 FAIL
frontend validators/typecheck/build -> PASS
cargo check --locked -> PASS
Rust tests -> 42 PASS / 0 FAIL
read-only closure guard -> PASS
A6_FINAL_SOURCE_PROOF -> PASS
```

This proof remains source/hosted evidence only.

## Deferred Target Windows Boundary

The following still require the actual target machine and are intentionally not being tested now:

```text
packaged PythonRuntime + GPT-SoVITS source/pretrained asset placement
real approved MyVoice weights produced from user recordings
real model training/load/synthesis
speaker fidelity and listening acceptance
CUDA/VRAM practicality and CPU behavior
cold/warm latency and longer-session stability
physical VB-Cable/equivalent endpoint behavior
Zoom/Meet/Teams microphone reception
installer and clean-machine execution
```

## Next Step

**Finish the current pre-local hosted proof and cleanup. If it passes, mark VoiceLab `READY FOR LOCAL VALIDATION — USER DEFERRED` and stop source expansion until the user chooses to run local validation or provides a new concrete requirement.**

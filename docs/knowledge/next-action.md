# TranslateIT — Next Action

## Current Mode

**Maintenance / VoiceLab READY FOR LOCAL VALIDATION — USER DEFERRED**

VoiceLab A1 through A6 remain source-closed. The pre-local quality audit is also closed source-side. Target/local Windows validation is explicitly deferred by the user for now. Do not restart local testing, packaging expansion, model tuning, provider work, or another VoiceLab milestone unless the user explicitly chooses to proceed or provides new concrete evidence/requirements.

## Pre-Local Audit Result

The maintenance pass found and corrected only concrete gaps; it did not add a new architecture or feature wave.

### 1. Recording -> build state consistency

Accepting or replacing a guided take could previously leave the Create My Voice panel stale because recording and build UI state refreshed independently.

The recording owner now advances a bounded refresh revision after a successful accepted take, and the existing build component refreshes from canonical backend status. No duplicate dataset owner was introduced.

### 2. User-facing VoiceLab error hygiene

Normal VoiceLab UI could previously forward internal `voice_lab:*` protocol text directly to the user. Recording/build actions now map those failures to bounded product-facing guidance while Diagnostics/runtime owners retain the underlying internal error contract.

### 3. PR-113 unusable-dataset rejection

The one-shot VoiceLab build child now rejects obviously unusable accepted audio before expensive GPT-SoVITS work:

```text
canonical 32 kHz mono PCM16 required
>= 90% near-silence -> reject
>= 5% hard-clipped samples -> reject
otherwise continue to existing build/evaluation
```

These are conservative structural rejection gates only. They are not speaker-quality scoring, automatic quality approval, or target-audio tuning claims.

### 4. Active-build close lifecycle

The native layer already prevented process exit while VoiceLab build was active, but the frontend close path could still call `window.destroy()` without checking build state first. That could leave the application process alive without its main window while training continued.

The frontend close guard now reads the existing canonical VoiceLab build status before destroying the window. Active build blocks close with user-facing guidance; unavailable build status fails closed. No second lifecycle owner was added.

### 5. Asset and stale tooling cleanup

Developer asset wording no longer names Piper as a current release asset. The release inventory remains the pinned GPT-SoVITS VoiceLab bundle owned by `model_manifest.json`.

Obsolete temporary A2, A3, and pre-local A4 proof workflows were removed after proof completed. No permanent proof framework was added.

## Accepted Pre-Local Hosted Proof

Final pre-local quality proof:

```text
run 31776560232
exact checkout SHA bc9491cfaf81d8eb47f3505cb6003efe61877e88
Windows Server 2022
frozen WorkerRuntime lock/sync -> PASS
VoiceLab Python syntax -> PASS
VoiceLab build contract tests -> PASS
model inventory tests -> PASS
frontend source validators -> PASS
svelte-check/typecheck -> PASS
frontend production build -> PASS
cargo check --locked -> PASS
```

The preceding run `31776321151` independently passed the same Python/frontend/Rust gates after the model-inventory cleanup. The first frozen-dependency audit proof `31776193564` also passed after the initial harness dependency issue was corrected.

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

Hosted source proof must not be presented as evidence for those claims.

## Next Step

**STOP source expansion for VoiceLab. Wait until the user explicitly chooses local/target-Windows validation or provides a new concrete VoiceLab requirement.**

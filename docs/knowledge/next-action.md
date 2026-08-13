# TranslateIT — Next Action

## Current Mode

**Developing / VoiceLab A2 — Voice Actor Contract + Build Lifecycle: CLOSED**

A1 single-runtime compatibility remains closed. A2 is now implemented as the bounded internal Rust owner at `EngineData/Frontend/RustApp/src-tauri/src/commands/voice_lab.rs`.

## A2 Result

A2 now owns:

```text
exact guided take + held-out dataset contract
canonical guided WAV input: mono PCM16 / 32 kHz
CacheData/VoiceLab temporary dataset/candidate ownership
SavedProject/VoiceLab/MyVoice approved package ownership
generation-bound build lifecycle
validated candidate promotion with previous-actor preservation
Meeting / VoiceLab build mutual exclusion
```

No public VoiceLab Tauri commands or full VoiceLab page were added because real guided recording and training execution do not exist yet. No Python dependency lock, Meeting TTS, model training, audio routing, or installer behavior changed.

Hosted Windows proof run `31699857917` passed:

```text
frontend production build -> PASS
cargo check -> PASS
cargo test --no-run -> PASS
VoiceLab A2 bounded tests -> 5 PASS / 0 FAIL
public Meeting Start exclusion guard -> PASS
premature VoiceLab Tauri registration -> absent
```

The tests cover dataset authorization/held-out separation, generation-bound cancellation semantics, canonical accepted-WAV dataset freeze, native actor-package validation, and preservation of the current actor when a rebuild candidate is rejected.

The accepted source still has staged `dead_code` warnings for internal A2 functions that have no truthful caller until later stages. Do not hide these with fake commands, placeholder UI, dummy executors, or blanket lint suppression. A3/A4 must consume or remove those staged APIs.

The temporary A2 proof workflow is retired and no longer push-triggered. Connector policy prevented deleting the retired file in this session.

## Not Proven Yet

A2 does not prove real guided recording, real training-process cancellation, GPT-SoVITS training, generated custom speech, voice quality, CUDA/VRAM practicality, trained-actor inference, Meeting custom-TTS latency/readiness, physical audio delivery, or installer behavior.

No user-local-PC testing occurred.

## Next Step

**VoiceLab A3 — Guided Recording + Accepted Take Persistence**

Implement the smallest real guided recording path using the existing Rust/CPAL audio ownership: exact app-provided English line -> Record -> canonical mono PCM16/32 kHz WAV -> Replay -> Retry or Accept -> accepted take under `CacheData/VoiceLab/Takes` -> A2 dataset contract.

Do not add imported-audio support, ASR-based labeling, a second audio engine, a generic conversion framework, or GPT-SoVITS training in A3. Add only the minimum backend/frontend surface required to make guided capture/review/accept usable and truthful.

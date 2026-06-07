# VoiceLab Research Brief

## Objective
Build a custom Translate voice that:
- uses the user's own voice,
- sounds natural and not stiff,
- stays close to the current default latency,
- is trained beforehand from sample data,
- does not rely on voice-cover / XLMM-style imitation at runtime.

This brief is intended for deeper research and planning.

## What We Already Know

### 1) VoiceLab Exists as an Official Voice Path
- The active product direction is `Settings -> VoiceLab`.
- The official custom-voice path is locked to a single method.
- Direct CLI build/publish routes were removed or disabled for the normal path.
- Backup export/import workflows for VoiceLab are disabled in the runtime path.

### 2) Official Method Lock
Important policy from the pack:
- Voice Actor build uses the official bundled Piper script:
  - `EngineData/RuntimeApp/AppSource/translateit/scripts/train-piper-voice.ps1`
- Entry point:
  - `AppBootstrap.build_voice_actor_method(...)`
- New VoiceLab / Voice Actor updates must extend the same official method path.
- No parallel build engines should be introduced.

### 3) Existing Voice Asset Found
There is an existing profile named `marcel`.

Key manifest facts:
- `profile_id`: `marcel`
- `display_name`: `Marcel`
- `language`: `en`
- `created_at`: `2026-04-28T12:00:41.640075`
- `reference_count`: `8`
- `guided_prompt_count`: `40`
- `enrollment_mode`: `guided_wizard`
- `wizard_completed_at`: `2026-04-28T04:57:48.853571+00:00`
- `training_stage`: `draft_ready`
- `ready_for_training`: `false`
- `speaker_pack_ready`: `true`
- `voice_actor_ready`: `true`
- `voice_actor_build_status`: `draft_ready`
- `voice_actor_artifact_path`:
  - `D:\Work\AI Stuff\TranslateIT-ISSUED\DevelopingPack\UserData\SavedData\profiles\default\voices\marcel\model.onnx`
- `speaker_pack_path`:
  - `D:\Work\AI Stuff\TranslateIT-ISSUED\DevelopingPack\UserData\SavedData\profiles\default\voices\marcel\speaker_pack.json`
- `fallback_voice_profile_id`:
  - `piper:en-us-lessac-medium`
- `fallback_render_profile`:
  - `premium`
- `voice_actor_design_target`:
  - `general_neutral_en_v1`
- `voice_actor_dataset_filter_policy`:
  - `strict_balanced`

### 4) Voice Pack / Reference Clip Snapshot
The `speaker_pack.json` says:
- it is the reference manifest for custom voice routing,
- use the listed clean clips as speaker references or enrollment samples.

Clip-level facts from the manifest:
- reference clip count: `8`
- sample durations are mostly around 5 to 7 seconds,
- sample rate: `22050 Hz`,
- voice is English-focused,
- the manifest is meant for XTTS custom voice routing.

### 5) Quality Signals From the Voice Data
The manifest and older logs suggest:
- the current `marcel` build is usable in session,
- but it is not publish-grade,
- the system recommends more accepted prompts and more guided audio,
- several older clips are flagged with too much silence.

This means the data quality is good enough for a draft / lite build, but not yet ideal for a final polished voice product.

## Strong Interpretation

The desired direction is:
- not voice-cover imitation,
- not on-the-fly cloning during each utterance,
- but a real trained custom voice actor built from the user's own recordings.

In other words:
- train offline,
- run light at runtime,
- keep the runtime path fast and stable.

## Product Goal

We want a voice that is:
- clearly the user's own voice,
- natural in tone and intonation,
- comfortable for both formal and informal speech,
- able to handle some mixed Indonesian and English usage,
- fast enough that the app still feels near-default in latency.

## Latency Goal

The custom voice should not become a big latency tax.

Expected strategy:
- training happens offline,
- runtime loads a finished model,
- the worker stays warm/persistent,
- no heavy reconstruction per utterance,
- cache and preload wherever possible.

Likely acceptable tradeoff:
- a little more startup/warmup cost,
- minimal increase in per-utterance latency,
- no blocking of UI / report writing / replay work.

## What Must Stay True

- The app must remain stable.
- The default voice path must still exist as fallback.
- The official VoiceLab method lock must remain the only build path.
- No parallel custom backend route should be introduced.
- No runtime training should happen during live translation.

## Likely Research Questions

These are the questions that ChatGPT Research should help answer:

1. What is the best training workflow for a custom voice actor from the user's own recordings?
2. How many clips / hours are typically needed for a natural-sounding but efficient custom voice?
3. What data quality rules matter most for natural intonation without sounding stiff?
4. How should mixed Indonesian and English speech be represented in the dataset?
5. How can a custom voice actor be made fast enough for live translation use?
6. What can be cached or preloaded safely to keep latency close to the current default?
7. What is the best way to keep a fallback voice if the custom model is unavailable?

## Practical Constraints

The solution should avoid:
- voice-cover-only approaches,
- dynamic cloning during live utterances,
- heavy on-the-fly model building,
- expensive runtime conditioning steps that would slow the app down.

The solution should prefer:
- offline training,
- guided recording,
- clean dataset curation,
- one official method-lock-based build path,
- runtime model reuse.

## Current Data Assets to Preserve

Based on the pack, preserve:
- `UserData/SavedData/profiles/default/voices`
- custom voice actor assets,
- voice registry/profile metadata,
- speaker pack metadata,
- any clean enrollment clips,
- related docs and manifests.

## Suggested Next Deliverable

The next big planning step should define:
- dataset requirements,
- training workflow,
- runtime integration,
- latency budget,
- fallback behavior,
- quality evaluation checklist.

## Runtime Provider Selection Rule

When the custom ONNX voice actor is used at runtime, the provider should be chosen by measurement rather than assumption:

1. Try `CUDAExecutionProvider` first if the runtime exposes it.
2. Warm it once with a short safe render or synthetic inference.
3. Compare it against `CPUExecutionProvider`.
4. Choose the provider with the best real latency and stability for the current voice profile and model version.
5. Cache that decision per voice profile / model version so it is not repeated per utterance.
6. If CUDA is unavailable, slower, unstable, or fails warmup, use CPU.
7. If both ONNX paths fail, fall back to the existing default voice path.

Current local observation in Experimental:
- `onnxruntime.get_available_providers()` only exposes `AzureExecutionProvider` and `CPUExecutionProvider` on this machine, so CUDA is not currently available here.
- That means the safe local runtime outcome here is CPU for the custom ONNX path, with default-voice fallback still preserved if the custom path fails.

## Bottom Line

The project direction is:

**Train a real custom voice actor from the user's own voice samples, using the official VoiceLab method path, and keep the runtime fast enough that it still feels close to the current default latency.**

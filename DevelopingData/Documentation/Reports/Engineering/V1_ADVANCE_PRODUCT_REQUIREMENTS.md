# TranslateIT V1-Advance Product Requirements

Branch: `V1-Advance`
Source branch: `SourceLocal`
Status: active development source of truth

## Purpose

TranslateIT V1-Advance is the single active product direction for TranslateIT V1.

The application is a Windows desktop real-time conversation translator that runs on local models, prioritizes NVIDIA CUDA acceleration, and falls back to CPU when GPU acceleration is unavailable.

The product must remain local-first, non-cloud/API for core translation runtime, and professional enough for business meeting use while staying simple for personal users.

## Hard project rules

1. There must be only one active TranslateIT V1 engine.
2. Do not create V2, V3, V4, legacy, alternative, or parallel engines.
3. Do not reactivate DesignIT or FigmaDesignExport as active runtime dependencies.
4. Remove or quarantine unused data that is not required for active development.
5. Runtime behavior must not depend on documentation-only or preview-only folders.
6. UI must stay simple and must not expose unnecessary technical options to normal users.
7. Local validation is not required during the current GitHub-only phase, but CI-safe validation must guard every development pass.

## Target platform

- Windows only for the initial product.
- NVIDIA CUDA-first runtime.
- CPU fallback is mandatory.
- Internal distribution first.
- Final target installer name: `TranslateIT.setup.exe`.
- No auto-update requirement for the internal build.
- No signed installer requirement for the internal build.

## Primary use case

The primary use case is online meeting translation.

The expected flow is:

```text
User speaks Indonesian
-> TranslateIT detects the speech pause
-> ASR transcribes the speech
-> Local translation converts it to English
-> Local English TTS generates translated voice
-> Translated voice is sent to a built-in virtual microphone
-> The meeting application receives the translated English voice
-> TranslateIT shows transcript cards inside the app
```

The product must also support text translation and document translation as secondary needs.

## Language scope

Initial language scope:

```text
Indonesian -> English
English -> Indonesian
```

Initial TTS scope:

```text
Indonesian speech -> English translated TTS output
English speech -> Indonesian text output only
```

English to Indonesian TTS is intentionally deferred until the core engine is stable.

## Translation quality requirements

1. Translation must be contextual, not word-by-word.
2. Formal source speech must produce formal translation.
3. Casual source speech must produce natural casual translation.
4. Mixed Indonesian-English input must be handled gracefully.
5. Indonesian slang and conversational expressions must be supported.
6. Technical terms must be protected when translating them would confuse meaning.
7. Meaning preservation is more important than literal phrasing.
8. Naturalness and grammar are both required.

Examples of conversational Indonesian that must be handled:

```text
gue / gua
lu / lo
nggak / gak / ga
banget
dong
nih
sih
kayaknya
btw
```

Protected technical terms must include, but are not limited to:

```text
server
runtime
deployment
GPU
CUDA
latency
model
branch
worker
pipeline
fallback
```

## Tone modes

The user-facing tone modes are:

```text
Auto
Formal
Casual
```

Default tone mode:

```text
Auto
```

Auto mode should infer the tone from the source language. Formal and Casual modes should intentionally adapt the output tone while preserving meaning.

## Runtime modes

Only two user-facing runtime modes are allowed:

```text
Quality
Fast
```

Default mode:

```text
Quality
```

Quality mode prioritizes accuracy and naturalness while keeping latency acceptable. Fast mode prioritizes lower latency while remaining usable and contextual.

Do not expose model names, beam sizes, provider internals, or other technical settings to normal users.

## Speech segmentation

Final segmentation rules:

```text
Silence threshold: 700ms
Maximum speech segment: 12 seconds
```

The application should wait for the user to stop speaking. It must not cut words mid-speech. If speech continues too long, the maximum segment limit is 12 seconds.

Latency target is measured from:

```text
User finishes speaking -> first translated audio output begins
```

Desired target:

```text
1 second or less, when realistically achievable and measurable
```

Latency details may be available in a hidden card detail view, not in the main UI.

## Input behavior

Default input mode:

```text
Always-listening
```

Secondary input mode:

```text
Push-to-talk
```

Default push-to-talk hotkey:

```text
Hold Space
```

Only one input mode may be active at a time.

## Meeting audio behavior

The application must support:

1. Built-in virtual microphone output for meeting apps.
2. Translated English TTS routed to the virtual microphone.
3. Local headphone monitoring at 50% volume.
4. Mute original microphone feature.
5. Replay translated voice from transcript cards.

The virtual microphone is mandatory for the professional online meeting use case.

## Model requirements

ASR primary model:

```text
Whisper Large V3 Turbo
```

ASR fallback model:

```text
Whisper Medium
```

Translation model must be selected by benchmark. Selection criteria:

1. Indonesian-English quality.
2. English-Indonesian quality.
3. Casual conversation quality.
4. Contextual accuracy.
5. Low latency.
6. CUDA acceleration support.
7. CPU fallback support.
8. Offline/local operation.

The user must not choose technical model variants. The app chooses the best available model and only exposes Quality/Fast behavior.

## Model packaging

Final internal packaging goal:

```text
TranslateIT.setup.exe includes the required models and runtime components.
```

There should not be a separate ModelPack for the internal target. The installer may be large if required.

## GPU and fallback requirements

1. NVIDIA CUDA is the primary acceleration target.
2. AMD and Intel GPU optimization are deferred.
3. CPU fallback is mandatory.
4. Normal users see only simple runtime status.

Allowed normal-user statuses:

```text
Running on GPU
CPU fallback active
Setup needed
```

Technical details belong only in Developer Diagnostics.

## Text translation requirements

The Text page must support:

1. Manual input.
2. Manual Translate button.
3. Language swap.
4. Output editing if useful.
5. Copy output.
6. Save to history.
7. Tone: Auto / Formal / Casual.
8. Mode: Quality / Fast.

Auto-translate while typing is not required for V1-Advance.

## Document translation requirements

Document translation is secondary but supported.

Initial common formats:

```text
.txt
.md
.docx
.pdf text-based
.srt
```

PDF support may be text extraction only. OCR is deferred.

Document translation must use chunking when required and should output a translated file or translated text result depending on format support.

## History and storage

Text/history behavior:

1. History is on by default.
2. History is stored until the user deletes it.
3. User can disable history.
4. User can search history.
5. User can clear all history.

Audio behavior:

1. Audio recording history is off by default.
2. TTS replay cache may be temporary.
3. User must be able to delete stored audio data if audio storage is enabled later.

## Privacy

1. Core translation runtime is local-first.
2. Meeting audio, transcript, and translation data must not be sent to cloud translation APIs.
3. Logs may store useful diagnostics, but normal UI must avoid exposing technical log data.
4. User must be able to clear stored data.
5. Audio storage is disabled by default.

## Audio Studio scope

Audio Studio is part of TranslateIT V1 but is secondary to the main realtime translation engine.

Purpose:

```text
Create a custom English voice actor from user voice samples.
```

Planned phases inside the same V1 engine:

1. Collect, import, record, and manage voice samples.
2. Process samples and create custom English voice actor.
3. Use the custom voice actor in realtime TTS.

Do not implement Audio Studio as a separate engine.

## UI structure

Normal UI:

```text
Voice
Text
History
Settings
```

Advanced UI:

```text
Audio Studio
Developer Diagnostics
```

The UI should be simple, clean, modern, and familiar. The target familiarity is closer to a chat-style productivity app than a technical control panel.

## Voice page requirements

The Voice page should include:

1. Language direction.
2. Quality/Fast mode.
3. Always-listening / Push-to-talk selector.
4. Start / Stop control.
5. Transcript cards.
6. Replay translated voice.
7. Hidden latency details.

## Transcript card requirements

Each transcript card should be able to show:

1. Original transcript.
2. Translated text.
3. Replay control.
4. Direction.
5. Mode.
6. Tone.
7. Hidden latency details.

Latency details may include:

```text
speech detection delay
ASR time
translation time
TTS first-audio time
total time
runtime device: GPU or CPU
```

## Settings requirements

Settings should include:

1. Language defaults.
2. Audio input/output selection.
3. Virtual microphone settings.
4. Model/runtime setup status.
5. Privacy/history controls.
6. Appearance.
7. Advanced toggle.

## Error handling requirements

Errors must be grouped first. Do not force the user to fix many small issues one by one.

Normal user pattern:

```text
Setup needs attention.
Fix automatically
Open Diagnostics
```

Examples of simple user-facing errors:

```text
GPU unavailable. Running on CPU.
Model not found. Setup required.
Microphone unavailable. Check input device.
Virtual microphone unavailable. Setup required.
Translation engine not ready.
Voice output unavailable. Text translation is still available.
```

If automatic repair fails, provide Open Diagnostics. Technical logs should not be shown in the normal UI.

## Developer Diagnostics

Developer Diagnostics must be available but hidden from normal users.

It may include:

1. GPU/CUDA status.
2. Model path and model readiness.
3. Helper worker status.
4. Provider status.
5. Latency details.
6. Last error.
7. Open logs folder.
8. Run Health Check.

## Non-local development policy

Current development must happen through GitHub and CI first.

CI-safe work may include:

1. Documentation requirements.
2. Architecture contracts.
3. TypeScript checks.
4. Rust cargo check.
5. Frontend build checks.
6. Static contract validation.
7. Runtime API to Rust command registry checks.
8. Worker command contract checks when they do not require launching local models.
9. UI binding checks.
10. Structure cleanup checks.

CI must not require:

1. Local CUDA hardware.
2. Local microphone.
3. Local virtual audio device.
4. Local model files.
5. Local TTS provider runtime.
6. Full installer packaging.

Local tests are deferred until CI-safe development is ready.

## V1-Advance definition of done

V1-Advance is considered ready for local testing when:

1. App structure is single-engine and no unused active dependencies remain.
2. CI-safe validation passes.
3. Text translation path is implemented against local runtime contracts.
4. Voice pipeline contracts are implemented or clearly guarded.
5. GPU-first and CPU fallback behavior are represented in contracts and UI status.
6. Always-listening and push-to-talk behavior are represented in UI/runtime wiring.
7. Silence threshold is 700ms and max segment is 12 seconds.
8. Transcript cards support original, translation, replay, and hidden latency details.
9. History behavior is implemented or guarded by clear contracts.
10. Developer Diagnostics remains hidden from normal UI.
11. DesignIT and FigmaDesignExport are not active runtime dependencies.
12. The repo is ready for the first local validation pass.

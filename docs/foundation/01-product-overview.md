# TranslateIT — Product Overview

**Status:** Active Policy  
**Updated:** 2026-08-23

## Purpose

TranslateIT is a Windows desktop application whose primary purpose is **simple,
reliable Indonesian <-> English translation for online meetings**.

The product must prefer a translation that completes successfully over a larger
feature set, extra modes, stylistic controls, or speculative context behavior.
Internal ASR, translation, TTS, helper-process, acceleration, and audio-routing
details stay behind a small product workflow.

The interaction reference is the simplicity of modern meeting speech-translation
features: choose the language pair, start translation, speak normally, allow a small
completeness delay when needed, and stop when finished. TranslateIT does not need to
copy another product's implementation or supported languages.

Two built-in English voices (one male, one female) ship ready-to-use so Meeting
works on day one without any training step. The product-facing name for the custom
path stays **My Voice**: an optional high-fidelity upgrade created once from the
user's own authorized recordings, replacing the built-in selection when approved.
Neither path turns My Voice into a general audio studio, provider playground, or
instant-cloning showcase.

## Core Product

### Meeting — Required Outbound

```text
Indonesian speech
-> final Indonesian transcript
-> English translation
-> trained English Voice Actor TTS
-> TranslateIT Meeting Microphone
-> meeting application
```

This is the **required core path**. If this path is healthy, optional features must not
prevent it from working.

The target outbound TTS behavior uses one approved Meeting voice — a built-in pack by default, or the approved trained My Voice after creation. There is no
normal user-facing provider/model selector and no silent fallback to a different voice
when the selected/required Voice Actor cannot synthesize safely.

### Meeting — Optional Incoming Assistance

```text
English meeting speech
-> final English transcript
-> Indonesian translated text
-> local user
```

Incoming is useful but optional. Incoming capture, suppression, ASR, or translation
failure must never block otherwise healthy outbound translation.

### Text

```text
Indonesian text <-> English text
```

Text remains a small standalone utility using the same canonical translation behavior
as Meeting where practical. Text does not depend on My Voice or Meeting audio
readiness.

### My Voice

My Voice has one normal purpose and one normal workflow:

```text
authorized user voice
-> guided English recording
-> review / accept / retry takes
-> quality-controlled dataset
-> speaker-specific fine-tuning
-> held-out evaluation + user preview
-> approved Voice Actor
```

The adopted custom-TTS engine direction is **GPT-SoVITS V2ProPlus**. Training is an
occasional build operation; daily Meeting use performs inference only. A finished Voice
Actor is reusable across normal application launches and Meetings without retraining.

My Voice quality is prioritized over instant cloning. Training duration, recording
minutes, epoch count, and speaker-similarity thresholds are implementation/evidence
details rather than arbitrary product constants. The build should select a useful
checkpoint from real evidence rather than assuming the last or longest training run is
best.

## Initial Product Boundary

```text
Platform        -> Windows
Languages       -> Indonesian + English only
Meeting control -> Start Translation / Stop Translation
Outbound        -> ID speech -> EN Voice Actor (built-in or trained)
Incoming        -> EN speech -> ID text, optional
Text            -> ID <-> EN
My Voice        -> guided recording -> trained reusable Voice Actor
Runtime         -> local-first after required assets are installed
```

My Voice is required to reach the next product-validation boundary, but it must not
turn Text into a voice-dependent workflow or create a parallel Meeting/runtime owner.

## Deliberately Removed From Initial Core

The following are not part of the initial product target because they increase
behavioral, UI, runtime, or proof complexity without being required for successful
translation and the approved My Voice workflow:

- Pause / Resume;
- Push to Talk;
- Stop Voice;
- Speak Now / Cancel conversational delivery coordination;
- partial/evolving subtitles or partial translated voice;
- user-facing `Realtime` / `Quality` translation modes;
- user-facing `Auto / Formal / Casual` tone modes;
- conversation-context prompting or previous-turn model context;
- glossary/terminology memory as a separate subsystem;
- automatic History / Saved as a general initial release dependency;
- Audio Studio / broadcast-production workflows;
- multiple custom-voice engines/providers or user-facing engine selection;
- zero-shot / quick-clone alternate My Voice modes;
- import-audio branching in the first My Voice implementation;
- additional language pairs;
- incoming Indonesian TTS;
- document translation;
- silent cloud fallback.

Existing source or historical plans for removed/deferred features are not proof that
those features remain current product scope.

## Translation Engine Principle

The translation product should expose **one behavior**, not multiple model or quality
choices.

```text
current utterance
-> one canonical bidirectional ID <-> EN translation path
-> complete translation or explicit failure
```

The current utterance is translated independently. Previous Meeting turns, History,
Saved data, or Text activity are not automatic model context.

Translation priorities remain small:

```text
1. preserve intended meaning
2. preserve names / numbers / technical facts
3. produce understandable natural target-language grammar
4. avoid silently returning incomplete output
```

A small delay after the user finishes speaking is acceptable when required to obtain a
complete stable utterance and complete translation. Instant partial output is not a
product requirement.

## Voice Engine Principle

My Voice and Meeting expose **one custom-voice behavior**:

```text
My Voice build
-> one trained GPT-SoVITS V2ProPlus Voice Actor

Meeting English text
-> canonical local TTS inference
-> that approved Voice Actor
-> generated speech or explicit failure
```

Do not retain Piper, SAPI, OpenVoice, Qwen voice cloning, MeloTTS, RVC postprocessing,
or another provider as a silent alternate custom-TTS path after the My Voice migration
is complete. Historical/current fallback source may remain temporarily only while the
migration is incomplete and must not be mistaken for the final product contract.

The initial accepted Voice Actor format should follow the engine's native trained
weights plus one canonical reference recording/text. ONNX, TorchScript, quantization,
or other export formats are optimization candidates only after native inference
establishes the quality baseline and a replacement proves no material fidelity loss.

## Speech Boundary

Normal Meeting use is continuous Session Listening after explicit Start.

Only a finalized speech utterance may enter normal translation/TTS/transcript output.
Rolling audio and partial ASR may exist internally for implementation purposes but are
not normal product output.

The application may continue capturing the next utterance while the previous one is
being translated or spoken, but translated TTS output remains serialized so voices do
not overlap.

## Incoming Safety

Incoming Meeting Sound remains a separate optional lane from the physical microphone.

TranslateIT's own English TTS must not be presented as incoming speech. However,
**incoming protection must not block required outbound translation**. If safe incoming
capture/suppression cannot be maintained, the incoming lane becomes unavailable or is
temporarily ignored while outbound continues.

No participant identity is invented from mixed device-level audio.

## Runtime Simplicity

One desktop application, one canonical Meeting session owner, one daily local-worker
inference path, one translation behavior, and one custom-TTS engine remain the target.

My Voice training is a bounded build operation, not a second daily inference engine.
Training and an active Meeting must not compete for the same AI/GPU runtime. The first
implementation keeps them mutually exclusive rather than adding background training,
resource arbitration, automatic pause/resume, or a second worker.

Resource priority remains intentionally simple:

```text
Meeting outbound
> Meeting incoming
> Text
> diagnostics / setup work
```

My Voice training runs only outside an active Meeting and therefore does not become a
new live scheduler priority.

Queues are bounded. Old/stale work must be discarded rather than played or displayed
late as if it were current.

CUDA may accelerate the runtime when validated, but the normal UI does not expose
model, provider, CUDA, VAD, queue, or worker controls. CPU operation remains truthful:
if it is too slow for practical Meeting use, report that instead of pretending
equivalent performance.

## Stop And Close

`Stop Translation` is the only normal Meeting termination action.

```text
Stop
-> revoke current Meeting output authority
-> stop microphone / Meeting Sound capture
-> cancel/join pending Meeting work
-> clear transient conversation/audio state
-> session ended
```

Normal minimize does not stop a healthy Meeting. Closing the application while a
Meeting is active still requires the existing safe Stop-before-close behavior.

## Product Navigation

Normal top-level navigation target is:

```text
Meeting
Text
My Voice
Settings
```

Meeting remains the default workspace.

There is no initial top-level History/Saved workspace. Live Meeting transcript is
transient session state used for current comprehension only. My Voice's approved Voice
Actor is a distinct explicit user-owned saved artifact, not automatic conversation
History.

Settings remains reduced to:

```text
Meeting
Advanced
```

Meeting settings own microphone, Meeting Sound, and managed Meeting Microphone setup.
Advanced contains developer diagnostics and setup evidence; it is not a normal runtime
control panel.

## Text Workflow

Text stays conventional:

```text
Type / paste
-> choose ID <-> EN direction
-> Translate
-> review result
-> Copy
```

There is no tone selector, mode selector, Meeting-context reuse, or automatic Save in
the initial core. Very large input is never silently truncated.

## Privacy / Storage

Normal translation does not require persistent conversation storage.

```text
UserData/CacheData -> temporary runtime/audio artifacts + My Voice build workspace
UserData/LogData   -> minimal/redacted diagnostics
UserData/SavedProject/VoiceLab -> legacy on-disk location for the explicitly approved My Voice actor
```

The `VoiceLab` directory name above is a retained storage-compatibility identifier, not
the product name. New product/UI terminology must use **My Voice**.

Raw microphone audio, Meeting Sound audio, generated Meeting TTS, and live transcript
bodies are temporary by default.

My Voice guided recordings and training intermediates remain temporary build data until
the user explicitly approves the resulting Voice Actor. Rejected/abandoned builds do
not become persistent saved voices. Rebuilding a Voice Actor must not destroy the
previous approved actor before the new build is successfully evaluated and approved.

Persistent general History/Saved remains post-core and must not be required for
translation to work.

## UI Direction

The UI target remains modern, familiar, and low-density.

Meeting Ready should answer only:

```text
Are the required devices and a Meeting voice (built-in or My Voice) ready?
What language pair is active?
Start Translation
```

Meeting Live should emphasize:

```text
Translation Live
chronological finalized transcript
simple current activity
Stop Translation
```

My Voice should emphasize one guided creation workflow rather than exposing training
internals. Normal users should not choose engine versions, checkpoints, epochs,
providers, sampling internals, CUDA modes, or model paths.

Do not surface internal translation modes, tone controls, context controls, queue
controls, model names, provider names, or engineering detail in normal use.

## Proof Standard

A feature is not considered ready because source exists. Product success requires
matching evidence for the claim.

Before target-Windows validation, My Voice source must at minimum have a coherent
single-engine build/inference contract, persistent Voice Actor ownership, and Meeting
readiness wiring without a parallel TTS owner. Actual speaker similarity, training
quality, GPU performance, and Meeting latency remain runtime claims and therefore need
real target-capable evidence.

Target Windows acceptance still includes:

- microphone capture;
- final ASR;
- ID -> EN translation;
- EN -> ID translation when incoming is enabled;
- Voice Actor English TTS (built-in default or approved My Voice);
- Meeting Microphone delivery;
- optional incoming Meeting Sound behavior;
- safe Stop/Close;
- acceptable latency and stability on the target machine;
- My Voice training/rebuild quality and daily inference practicality.

Features outside the approved translator + My Voice boundary must not delay proving
this product works.

## Related

- `AGENTS.md`
- `CONTEXT.md`
- `docs/foundation/02-product-requirements.md`
- `docs/knowledge/decision-log.md`
- `docs/knowledge/next-action.md`
- `docs/knowledge/source-ownership.md`


## Direction Locks (D-033/D-034, 2026-08-23)

Single translation pipeline (best quality at lowest achievable latency; no Realtime/Quality vocabulary). Outbound-only rolling context (last three own-voice pairs); incoming stays context-free. Documents feature removed; Text is paste-only. Indonesian <-> English only. Full English UI. Personal use: no signing/auto-update concerns.

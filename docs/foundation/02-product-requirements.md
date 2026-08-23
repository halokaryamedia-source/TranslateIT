# TranslateIT — Product Requirements

**Status:** Active Policy  
**Updated:** 2026-08-23  
**Scope:** Simplified Windows translation core; built-in default voices + optional My Voice upgrade

This document is the durable product-requirement owner for TranslateIT on branch
`Local`.

The current product decision is explicit:

> **A small translator that works reliably is more important than preserving a broad
> feature set. Meeting starts with two built-in English voices (male + female) so the
> product is usable on day one; a trained high-fidelity representation of the user's
> own authorized voice (My Voice) remains an optional upgrade that replaces the
> built-in selection once created and approved.**

TranslateIT does not need multiple voice engines, instant-clone modes, provider
selection, a broadcast-production studio, or cloud voice fallback. Source presence is
not runtime proof. Evidence requirements remain governed by root `AGENTS.md`.

## 0. Direction Locks Supersede (D-033/D-034, 2026-08-23)

The locks below are **current product law**. Where any statement in sections 1+ conflicts with them, the lock wins and the older statement is historical:

1. One canonical translation pipeline; Realtime/Quality mode vocabulary is retired.
2. Outbound rolling context = last three own-voice pairs of the live session; incoming is permanently context-free.
3. Document/file translation is removed; Text is paste-only.
4. Indonesian <-> English only; no multilingual roadmap.
5. Full English UI copy.
6. Personal use: owned machines only; signing/auto-update out of scope.
7. Meeting voice = built-in male/female packs by default (no training); My Voice is the optional trained upgrade that replaces selection after explicit approval. Older "trained voice required before Meeting" requirements are superseded by this lock.
## 1. Product Priority

### PR-001 — Primary use case

**MUST:** TranslateIT's primary workflow be simple Indonesian <-> English translation
for online meetings.

### PR-002 — Secondary Text workflow

**MUST:** Indonesian <-> English Text remain independently usable without Meeting audio
or My Voice readiness.

### PR-003 — Translation success before feature breadth

**MUST:** Core translation reliability, completeness, understandable output, safe
Meeting delivery, and the approved trained Voice Actor path take priority over extra
controls, modes, general persistence, context, or stylistic features.

**MUST NOT:** An optional/deferred feature make an otherwise healthy required outbound
translation fail.

### PR-004 — Initial feature boundary

The approved product boundary before target-Windows validation is intentionally narrow:

```text
Meeting
Text
My Voice
Settings
```

**NOT INITIAL CORE:**

- Document Translation;
- general History / Saved UI;
- Audio Studio / broadcast-production workflows;
- multiple custom-voice engines/providers;
- quick-clone / zero-shot alternate My Voice modes;
- imported-audio branching in the first My Voice workflow;
- additional language pairs;
- user-facing tone modes;
- user-facing Realtime / Quality modes;
- conversation-context prompting;
- Push to Talk;
- Pause / Resume;
- Stop Voice;
- Speak Now / Cancel conversational coordination;
- partial/evolving translated subtitles;
- incoming Indonesian TTS.

Existing source for these capabilities does not keep them in current initial scope.

## 2. Platform And Runtime

### PR-010 — Initial platform

**MUST:** Windows is the initial supported and validated platform.

### PR-011 — Local-first core

**MUST:** After required runtime/model assets are installed, ASR, translation, trained
Voice Actor TTS, and Text translation can operate without a required cloud
speech/translation/voice API.

### PR-012 — No silent cloud fallback

**MUST NOT:** Local failure silently route user speech, text, recordings, training data,
or generated voice to cloud services.

### PR-013 — Single product/runtime architecture

**MUST:** One Rust/Tauri desktop application and its existing internal helper/runtime
path remain authoritative for normal inference.

**MUST:** GPT-SoVITS V2ProPlus is the single approved custom-TTS engine direction for
My Voice and Meeting until a future explicit product decision replaces it.

**MUST NOT:** A second daily TTS engine, translator engine, product shell, compatibility
runtime, provider selector, or fallback voice path be created merely to avoid resolving
an integration problem.

**MAY:** My Voice invoke bounded long-running training work distinct from daily
inference, provided it is not a second normal Meeting inference authority and does not
run concurrently with an active Meeting.

## 3. Languages And Directions

### PR-020 — Initial language pair

**MUST:** The initial product support only:

```text
Indonesian <-> English
```

### PR-021 — Text directions

**MUST:** Text support Indonesian -> English and English -> Indonesian.

### PR-022 — Required outbound Meeting flow

**MUST:** Required core Meeting translation support:

```text
Indonesian speech
-> final Indonesian transcript
-> English translation
-> trained English Voice Actor TTS
-> TranslateIT Meeting Microphone
```

### PR-023 — Optional incoming assistance

**SHOULD:** Incoming assistance support:

```text
English meeting speech
-> final English transcript
-> Indonesian translated text
```

**MUST:** Incoming remain optional/degradable and never block otherwise healthy
outbound translation.

### PR-024 — Initial exclusions

**NOT INITIAL CORE:**

- English speech -> Indonesian TTS;
- languages beyond Indonesian/English;
- participant-specific identity or process-specific meeting claims.

## 4. First Use And Readiness

### PR-025 — Minimal guided setup

**MUST:** First use cover only concepts needed by the Meeting core:

```text
Your Microphone
Meeting Sound
TranslateIT Meeting Microphone
My Voice readiness
Local Translation Ready
```

**MUST NOT:** Normal users manually operate Python, worker, model, CUDA, VAD, queue,
checkpoint, epoch, or audio-driver internals.

### PR-026 — Physical microphone verification

**MUST:** A selected microphone be functionally checked before replacing a previously
working explicit preference.

**MUST:** `Follow Windows Default` preserve default-device intent at the supported
boundary.

**MUST NOT:** A pinned missing microphone silently switch to another microphone.

### PR-027 — Meeting Sound verification

**MUST:** Meeting Sound represent the Windows output source used by optional incoming
translation.

**MUST NOT:** Incoming device failure block required outbound readiness.

### PR-028 — Functional local readiness

**MUST:** Required outbound readiness include bounded functional validation of the
actual local ASR -> translation -> trained Voice Actor TTS path rather than file
presence only.

**MUST NOT:** Missing/failed Voice Actor synthesis silently substitute Piper, SAPI,
OpenVoice, Qwen, MeloTTS, RVC postprocessing, cloud TTS, or another voice.

### PR-029 — Returning use

**MUST:** Returning users go directly to Meeting and receive a quick product-level
preflight rather than full setup repetition when an approved Voice Actor and Meeting
setup already exist.

## 5. Meeting Listening And Speech Boundary

### PR-030 — One normal listening mode

**MUST:** Initial Meeting use one explicitly user-started continuous Session Listening
mode.

**NOT INITIAL CORE:** Push to Talk.

### PR-031 — Simple lifecycle

Initial normal lifecycle is:

```text
Ready
-> Starting
-> Live
-> Stopping
-> Ended
```

**NOT INITIAL CORE:** Pause / Resume.

### PR-032 — Final speech is product truth

**MUST:** Normal translation/TTS use finalized stable utterances.

**MAY:** Rolling/partial ASR exist internally for implementation or diagnostics.

**MUST NOT:** Partial/uncommitted text become normal translated voice, committed
transcript, or persistent content.

### PR-033 — Natural bounded speech segmentation

**MUST:** Speech segmentation handle normal pauses and sentence/turn boundaries without
one fixed inherited silence constant becoming product policy.

**SHOULD:** A small post-speech delay be accepted when it materially improves stable,
complete translation.

### PR-034 — Internal segmentation tuning

Silence/VAD/pre-roll/chunk limits are implementation tuning and are hidden from normal
users.

### PR-035 — Stale work rejection

**MUST:** Session/generation/utterance identity prevent late old work from creating new
Meeting output.

### PR-036 — Capture/output coordination

**SHOULD:** Physical microphone capture continue while a previous finalized utterance
is being translated or spoken when the runtime can do so safely.

**MUST:** English TTS outputs be serialized and not overlap each other.

### PR-037 — At-most-once delivery

**MUST:** Meeting playback be at-most-once by default.

**MUST NOT:** Uncertain/partially played output be blindly replayed from the beginning.

## 6. Translation Engine

### PR-040 — One canonical translation behavior

**MUST:** Initial Meeting and Text expose one translation behavior, not user-facing
translation engine modes.

```text
current source utterance/text
-> canonical local ID <-> EN translation path
-> complete translated text or explicit failure
```

**MUST:** The canonical path support both Indonesian -> English and English ->
Indonesian.

**MUST NOT:** Required product behavior depend on a one-direction model while the UI or
runtime claims two-direction support.

### PR-041 — Meaning and factual fidelity

Translation priority is:

```text
1. intended meaning
2. names / numbers / dates / units / URLs / versions / technical facts
3. understandable natural target-language grammar
4. literal wording only when useful
```

### PR-042 — Mixed conversational language

**SHOULD:** Normal Indonesian/English code-switching and common technical terms remain
understandable.

**MUST NOT:** A speculative extra glossary/context subsystem be required before core
translation can operate.

### PR-043 — Technical terminology

**SHOULD:** Established technical terms remain unchanged when translating them would
reduce clarity.

### PR-044 — Tone controls removed from initial core

**NOT INITIAL CORE:** `Auto / Formal / Casual` as user-facing translation controls.

The engine should produce normal understandable translation without a style-selection
subsystem.

### PR-045 — No automatic conversation context initially

**MUST:** Initial translation use the current finalized utterance/text as its model
input.

**MUST NOT:** Previous Meeting turns, persistent History, Saved data, or standalone Text
activity automatically become model context.

**DEFERRED:** bounded conversation-context prompting until the base translator is proven
and a model/provider that safely supports it is selected.

### PR-046 — Complete output or explicit failure

**MUST NOT:** Source text be silently truncated.

**MUST NOT:** A generation known to be incomplete be promoted as a completed
translation.

**MUST:** If the active translation implementation cannot safely accept or complete the
input, return an explicit bounded failure instead.

### PR-047 — Replaceable translation implementation

**MAY:** The exact translation model/provider change when a replacement better satisfies
bidirectional quality, latency, memory, and packaging requirements.

**MUST NOT:** Normal users choose translation model/provider names.

## 7. My Voice And Custom TTS

### PR-110 — One My Voice workflow

**MUST:** The first My Voice implementation expose one normal custom-voice creation
workflow:

```text
confirm ownership
-> guided English recording
-> replay / accept / retry
-> prepare dataset
-> fine-tune Voice Actor
-> evaluate held-out speech
-> user preview / approve
-> save My Voice
```

**MUST NOT:** Add quick-clone, zero-shot, imported-audio, provider-selection,
professional/broadcast tiers, or multiple creation modes to the first workflow.

### PR-111 — Authorized voice only

**MUST:** My Voice require explicit confirmation that the user owns the recorded voice
or has authorization to create and use the Voice Actor.

### PR-112 — Guided English source truth

**MUST:** The first My Voice dataset be collected from application-provided English
reading lines so each accepted take has an exact known transcript.

**MUST NOT:** Add a second ASR/transcription dependency merely to label guided
recordings whose text is already known.

### PR-113 — Quality-controlled takes

**MUST:** User can replay each take and mark it accepted or retry it before the take can
enter the training dataset.

**MUST:** Build-time checks reject unusable audio such as invalid/empty files, excessive
silence, or clipping severe enough to make the take unsuitable.

**MUST NOT:** Treat recording duration alone as proof of dataset quality.

### PR-114 — Quality-first training

**MUST:** My Voice fine-tune GPT-SoVITS V2ProPlus for the approved speaker rather than
performing only zero-shot/reference cloning at normal Meeting inference time.

**MUST:** Training is an explicit occasional build operation. A completed approved Voice
Actor can be reused indefinitely for normal daily operation until the user explicitly
rebuilds/replaces it or an incompatible engine migration requires a new build.

**MUST NOT:** Retrain on application start, Meeting start, or individual utterances.

### PR-115 — No arbitrary training constants as product truth

**MUST NOT:** Recording minutes, training wall-clock minutes, epoch count, or a
speaker-similarity score be hardcoded as proof that the Voice Actor is good.

**MAY:** Implementation use bounded defaults and checkpoint cadence, but the chosen
actor must be evaluated from actual generated output and build evidence.

### PR-116 — Held-out evaluation and best actor selection

**MUST:** My Voice evaluate candidate trained checkpoints using English sentences not
used as training takes.

**SHOULD:** Build-time ranking use speaker-similarity evidence from the same approved
engine family when practical.

**MUST:** Final acceptance include user listening/approval; an automatic metric alone
must not publish the Voice Actor as approved.

### PR-117 — Native quality baseline before export optimization

**MUST:** The first accepted Voice Actor use the engine's native trained weight format
and one canonical 3-10 second reference recording/text required by the V2ProPlus
inference path.

**MUST NOT:** Make ONNX, TorchScript, quantization, or another export format the initial
product requirement merely for theoretical speed/portability.

**MAY:** Adopt an optimized format later only after measured evidence shows materially
useful runtime improvement without unacceptable speaker-fidelity or speech-quality
regression.

### PR-118 — Persistent actor and atomic rebuild promotion

**MUST:** Temporary recordings, datasets, checkpoints, and evaluation artifacts belong
to `UserData/CacheData/VoiceLab` while a build is in progress.

**MUST:** The explicitly approved Voice Actor belongs to
`UserData/SavedProject/VoiceLab`.

The `VoiceLab` directory names in these two paths are retained storage-compatibility
identifiers. They do not define the product-facing feature name.

**MUST:** Rebuilding My Voice leave the previous approved actor intact until a new actor
has completed training/evaluation and the user approves its promotion.

### PR-119 — Meeting uses only approved trained inference

**MUST:** Meeting use the approved trained Voice Actor through the canonical local AI
runtime owner.

**MUST:** Meeting Start load/warm the trained actor, prepare/cache its canonical
reference, and obtain bounded functional custom-TTS readiness before `Live` can commit.

**MUST NOT:** A My Voice training job run concurrently with an active Meeting or become
background live-scheduler work. Initial behavior is mutual exclusion, not automatic
resource arbitration or pause/resume complexity.

## 8. Runtime Priority And Reliability

### PR-050 — No user-facing Realtime / Quality split

**NOT INITIAL CORE:** `Realtime` and `Quality` as user-facing modes.

Internal implementation profiles may differ only when the product can select them
automatically without changing the simple user contract.

### PR-051 — Latency philosophy

**MUST:** Meeting prioritize useful live conversation.

**SHOULD:** A few seconds of bounded delay be acceptable when required for complete
speech/translation rather than producing unstable partial output.

### PR-052 — Official outbound latency metric

Measure user-relevant outbound latency from detected finalized utterance end to first
translated audio playback.

A final release threshold is derived from target-PC evidence, not invented in policy.

### PR-053 — Atomic Start

**MUST:** `Start Translation` commit `Live` only when the required outbound path,
including the trained Voice Actor TTS stage, is actually ready.

**MUST:** Duplicate Start not create another Meeting session.

**MUST:** Optional incoming failure produce a scoped unavailable/degraded incoming lane,
not an outbound Start failure.

### PR-054 — Resource priority

Under normal inference contention:

```text
Meeting outbound
> Meeting incoming
> Text
> diagnostics / setup work
```

My Voice training does not enter this live priority queue; it is mutually exclusive
with Meeting.

**MUST:** Queues remain bounded and stale work be discarded rather than presented late
as current realtime output.

### PR-055 — Bounded recovery

**MUST:** Required outbound recovery be bounded and owned by the canonical Meeting
session owner.

**MUST:** Explicit newer user action override stale automatic recovery.

**MUST NOT:** Local failure silently change to cloud operation or another voice engine.

### PR-056 — Stop

**MUST:** `Stop Translation` revoke current Meeting output authority before normal
resource cleanup.

**MUST:** Stop both audio lanes, cancel/join Meeting work, clear temporary
conversation/audio state, and only then report the session ended.

## 9. Acceleration And CPU Operation

### PR-060 — Preferred acceleration

**SHOULD:** Use validated CUDA acceleration when available and beneficial.

### PR-061 — GPU not mandatory for the entire product

**MUST NOT:** NVIDIA GPU be an absolute requirement for Text translation or application
startup.

**MAY:** My Voice training and practical realtime Voice Actor Meeting inference require
stronger hardware than standalone Text, when target evidence proves that constraint.

### PR-062 — CPU operation

**MUST:** Text remain usable on supported CPU-only systems when the local translation
runtime is otherwise available.

### PR-063 — Meeting performance truthfulness

**MUST:** If CPU or available GPU performance is not practical for trained Voice Actor
Meeting translation, report that truthfully rather than claiming equivalent realtime
performance.

## 10. Meeting Audio And Optional Incoming

### PR-070 — Outbound content

**MUST:** Primary Meeting output contain translated English speech synthesized by the
approved trained Voice Actor.

**MUST NOT:** Raw Indonesian microphone audio or a different fallback TTS voice be mixed
into Meeting output.

### PR-071 — Physical microphone

**MUST:** Physical microphone remain the outbound ASR capture source.

### PR-072 — TranslateIT Meeting Microphone

**MUST:** Product expose a TranslateIT-managed Meeting Microphone route or functionally
equivalent supported Windows endpoint selectable by meeting applications.

### PR-073 — Missing route

**MUST:** Missing/unavailable Meeting Microphone block required outbound Start or current
outbound delivery with simple `Setup Needed` recovery.

**MUST NOT:** Route recovery dump an old queue of translated speech.

### PR-074 — Incoming separate and optional

**MUST:** Incoming use Meeting Sound rather than the physical microphone.

**MUST:** Incoming may be unavailable or disabled without blocking healthy outbound.

### PR-075 — Own-TTS suppression is subordinate to outbound

**MUST:** TranslateIT's own English trained Voice Actor TTS not become an `INCOMING`
translation.

**MUST:** If safe incoming suppression/capture cannot be maintained, disable/degrade the
incoming lane rather than blocking otherwise safe required outbound TTS.

### PR-076 — Incoming source truthfulness

**MUST NOT:** Invent participant identity when only mixed/device-level audio exists.

### PR-077 — Incoming freshness

**MUST:** Incoming prefer current comprehension over an unbounded old subtitle backlog.

**DEFERRED:** automatic mid-session Follow-Windows-Default output-device rebind until the
initial selected/default endpoint path is proven stable.

## 11. Text Translation

### PR-090 — Explicit Text action

**MUST:** Text translate only after an explicit `Translate` action.

### PR-091 — Simple Text workflow

```text
Type / paste
-> choose ID <-> EN direction
-> Translate
-> review result
-> Copy
```

**NOT INITIAL CORE:** Tone, translation mode, Meeting-context reuse, automatic Save.

### PR-092 — Text result safety

**MUST:** Late/older result must not overwrite newer user intent.

**MUST:** If source changes after translation, existing result be visibly outdated or
clearly associated with the previous source.

### PR-093 — Text size truthfulness

**MUST NOT:** Large Text input be silently truncated.

**MUST:** Report a clear interactive limit when necessary.

## 12. Privacy And Storage

### PR-100 — General persistence not required for translation

**MUST NOT:** History/Saved conversation persistence be required for Meeting or Text
translation to work.

**NOT INITIAL CORE:** automatic History and general Saved UI/workflow.

My Voice's explicitly approved Voice Actor is a narrow user-owned persistent asset and
does not create general History/Saved semantics.

### PR-101 — Temporary audio/transcript

**DEFAULT:** Raw microphone audio, Meeting Sound audio, generated Meeting TTS, and live
Meeting transcript bodies are temporary session/runtime data.

**DEFAULT:** My Voice recording/build artifacts remain temporary until a resulting Voice
Actor is explicitly approved.

### PR-102 — Diagnostics privacy

**MUST:** Normal diagnostics use minimal/redacted operational information.

**MUST NOT:** Full conversation bodies or raw audio be logged by default.

### PR-103 — Storage roots

Preserve the responsibility split:

```text
UserData/CacheData/              -> temporary runtime/session + My Voice build data
UserData/LogData/                -> minimal/redacted diagnostics
UserData/SavedProject/VoiceLab/  -> explicitly approved persistent My Voice actor (legacy directory name)
```

## 13. Normal UI And Settings

### PR-160 — Initial navigation

Normal top-level navigation is:

```text
Meeting
Text
My Voice
Settings
```

**NOT INITIAL CORE:** top-level History or Saved.

### PR-161 — Meeting primary workspace

**MUST:** Meeting be the default workspace.

### PR-162 — Meeting Ready simplicity

Meeting Ready should primarily show:

```text
Required readiness
ID -> EN My Voice / optional EN -> ID Text
Your Microphone
My Voice
Meeting Sound
TranslateIT Meeting Microphone
Start Translation
```

Do not show tone/model/context/runtime-mode/checkpoint controls.

### PR-163 — Meeting Live simplicity

Meeting Live should primarily show:

```text
Translation Live
final chronological transcript
simple activity state
Stop Translation
```

**NOT INITIAL CORE:** Pause/Resume, Stop Voice, Speak Now/Cancel, partial subtitle
controls, complex delivery coordination.

### PR-164 — Settings hierarchy

Normal Settings remains:

```text
Meeting
Advanced
```

Meeting owns device/setup preferences. Voice creation belongs to My Voice, not another
Settings subsystem. Advanced owns Diagnostics. Diagnostics may show technical details
but is not the normal manual runtime control plane.

### PR-165 — Normal user vocabulary

Normal users see product states such as:

```text
Ready
Live
Setup Needed
Unavailable
Checking
Training
Needs Review
```

Do not require understanding Python, model IDs, CUDA providers, VAD thresholds,
scheduler queues, GPT/SoVITS submodels, checkpoints, or raw logs.

### PR-166 — Familiar translation interaction model

**MUST:** Normal TranslateIT interaction follow familiar everyday translator
conventions: clear source/target direction, a direct input/output relationship, one
dominant `Translate` or `Start Translation` action, and result actions such as `Copy`
close to the result.

**MUST:** Healthy and `Ready` states remain visually calm. Warning, unavailable, and
recovery states receive stronger emphasis only when the user needs to act.

**MUST NOT:** Normal Meeting, Text, My Voice, or Setup UI require users to
understand runtime, worker, model, pipeline-stage, provider, CUDA, scheduler, or
lifecycle-internal vocabulary. Technical detail belongs in `Advanced -> Diagnostics`.

**SHOULD:** Familiar product patterns be adapted to TranslateIT's local Meeting and
guided My Voice workflows rather than copied literally from another brand.

## 14. Application Lifecycle

### PR-176 — Long-session bounds

**MUST:** Memory growth, queues, temporary artifacts, threads, and handles remain
bounded.

### PR-177 — Minimize

**MUST:** Normal minimize/hide not end a healthy Meeting session.

### PR-178 — Safe close

**MUST:** Closing the application with an active Meeting use the canonical safe Stop
path before window destruction.

### PR-179 — Sleep/hibernate

**MUST:** Windows sleep/hibernate invalidate active Meeting output authority.

**MUST NOT:** Voice output automatically resume after wake without new explicit user
continuation.

## 15. Packaging And Distribution

### PR-140 — Initial distribution

**MUST:** Initial distribution target controlled Windows users first.

### PR-141 — One setup experience

**MUST:** Normal users receive one installer/setup experience.

### PR-142 — No manual developer runtime setup

**MUST NOT:** Installed builds require manual Python, `pip`, environment-variable,
repository checkout, manual core-model placement, or manual GPT-SoVITS WebUI use for
normal Meeting operation.

### PR-143 — Core packaged assets

**MUST:** Release inputs provide the required helper/runtime, ASR, **bidirectional
Indonesian/English translation**, trained Voice Actor inference assets, My Voice build
assets required by the approved creation workflow, and Meeting-audio route support.

**MUST NOT:** Bundle unrelated GPT-SoVITS WebUI/server/ASR/provider tooling merely because
it exists in upstream requirements.

## 16. Evidence And Initial Release Gate

### PR-180 — Source is not live proof

**MUST:** Static source/config presence never be reported as runtime success when the
claim requires target-Windows/model/audio evidence.

### PR-181 — Source closure before target validation

Before target-Windows validation begins, current source must include the approved
My Voice workflow and one canonical trained Voice Actor TTS integration without a
parallel daily engine.

Source/build proof may establish ownership, dependency compatibility, persistence,
state transitions, request/response wiring, and Meeting readiness ordering. It does
**not** establish speaker fidelity, training success, GPU practicality, generated audio
quality, or realtime latency.

Target-capable acceptance still requires evidence for:

```text
1. microphone capture
2. stable final ASR
3. Indonesian -> English translation
4. English -> Indonesian translation
5. My Voice training completes for a real authorized speaker dataset
6. held-out generated speech is acceptably similar and approved by the user
7. approved Voice Actor can be reused after restart without retraining
8. trained Voice Actor TTS is practical for live Meeting latency on target hardware
9. Meeting Microphone delivery
10. optional incoming Meeting Sound behavior
11. safe Stop / Close
12. acceptable end-to-end latency/stability on target hardware
13. standalone Text ID <-> EN
```

No arbitrary fidelity or latency threshold is invented before relevant evidence exists.

## 17. Explicitly Deferred / Removed Initial Features

The following remain intentionally outside current requirements even if historical
source/plans exist:

```text
Pause / Resume
Push to Talk
Stop Voice
Speak Now / Cancel coordination
partial subtitles
Auto / Formal / Casual tone controls
Realtime / Quality user modes
conversation-context prompting
general History / Saved
Audio Studio / broadcast voice-production features
alternate custom-voice engines/providers
quick-clone / zero-shot My Voice modes
import-audio My Voice branch
Document Translation
additional languages
incoming TTS
mid-session automatic Meeting Sound default-device rebind
```

Reconsider them only after the approved translator + My Voice product has target proof
and a new explicit product decision shows the added feature is worth its complexity.

## Related

- `AGENTS.md`
- `CONTEXT.md`
- `docs/foundation/01-product-overview.md`
- `docs/knowledge/decision-log.md`
- `docs/knowledge/next-action.md`
- `docs/knowledge/source-ownership.md`

## Direction Locks (D-033/D-034, 2026-08-23)

- MUST: one canonical translation pipeline (best quality, lowest achievable latency); no Realtime/Quality mode vocabulary.
- MUST: outbound rolling context limited to the last three own-voice pairs of the live session; incoming stays context-free.
- MUST NOT: offer document/file translation; Text is paste-only.
- MUST: Indonesian <-> English only; no multilingual roadmap.
- MUST: full English UI copy.
- MUST: treat distribution as personal use (owned machines); signing/auto-update out of scope.
- MUST: built-in male + female voices selectable without My Voice training; My Voice replaces selection only after explicit approval.

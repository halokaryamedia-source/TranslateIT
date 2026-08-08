# TranslateIT — Product Requirements

**Status:** Active Policy  
**Updated:** 2026-08-09  
**Scope:** Initial Windows product + explicitly approved post-core boundary

This document is the durable product-requirement owner for TranslateIT on branch
`New`. It defines what the product must do without freezing replaceable model,
provider, parser, driver, prompt, or implementation details unless the requirement
actually depends on them.

Source presence is not runtime proof. Evidence requirements remain governed by
root `AGENTS.md`.

## 1. Product Priority

### PR-001 — Primary use case

**MUST:** TranslateIT's primary product workflow is real-time voice translation for
online meetings.

### PR-002 — Secondary text workflow

**MUST:** Indonesian <-> English text translation remains independently usable
without starting a voice session.

### PR-003 — Secondary document workflow

**MUST:** First-class document translation exists as a secondary workflow for the
approved initial file formats.

### PR-004 — Audio Studio priority

**SHOULD / POST-CORE:** Audio Studio remains part of TranslateIT but must not block
initial core meeting/text/document readiness.

## 2. Platform And Local Runtime

### PR-010 — Initial platform

**MUST:** Windows is the initial supported and validated platform.

### PR-011 — Local-first core

**MUST:** After required runtime/model assets are installed, core ASR, translation,
and TTS behavior can operate without a required cloud speech/translation API.

### PR-012 — Optional future cloud assistance

**MAY:** Future explicitly approved cloud-assisted features may exist.

**MUST NOT:** Cloud assistance silently become a required fallback for core
translation behavior.

### PR-013 — Single product shell

**MUST:** One Rust/Tauri desktop application owns the user-facing product.

**MAY:** Python remain an internal helper runtime.

**MUST NOT:** A second product shell or parallel V2/V3/V4 engine be created without
an explicit architecture decision.

## 3. Languages And Translation Directions

### PR-020 — Initial languages

**MUST:** Initial supported languages are Indonesian and English.

### PR-021 — Text directions

**MUST:** Text translation supports Indonesian -> English and English -> Indonesian.

### PR-022 — Outbound meeting voice

**MUST:** Primary outbound meeting flow supports:

```text
Indonesian speech
-> Indonesian transcript
-> English translation
-> English TTS
-> meeting output
```

### PR-023 — Inbound meeting assistance

**MUST:** Primary inbound assistance supports:

```text
English speech
-> English transcript
-> Indonesian translated text
```

### PR-024 — Initial exclusions

**NOT REQUIRED INITIALLY:**

- English speech -> Indonesian TTS;
- language pairs beyond Indonesian/English.

## 4. Voice Input And Segmentation

### PR-030 — Session Listening

**MUST:** Normal meeting voice uses an explicitly user-started Session Listening
mode. TranslateIT must not begin persistent listening merely because the app is
open.

### PR-031 — Session lifecycle

**MUST:** Once Session Listening starts, TranslateIT continuously listens while the
session is active and stops when the user explicitly stops it.

### PR-032 — Push to Talk

**MUST:** Push to Talk remains an alternative capture mode.

**DEFAULT:** `Ctrl+Space`.

### PR-033 — Natural speech boundaries

**MUST:** Segmentation detects meaningful pauses, avoids unnecessary mid-word or
mid-utterance cuts, begins processing promptly after a valid boundary, and handles
longer speech without losing content.

### PR-034 — Numeric segmentation parameters

**IMPLEMENTATION DETAIL:** Silence duration, VAD threshold, minimum speech,
pre-roll, chunk size, and maximum segment duration are tuning parameters.

**SUPERSEDED:** Fixed `700 ms` silence and `12 s` maximum segment as permanent
product constants.

## 5. Translation Quality And Tone

### PR-040 — Meaning preservation

**MUST:** Translation optimizes for intended communication meaning rather than
literal word order.

Priority:

```text
1. intended meaning
2. factual/entity fidelity
3. natural target-language grammar
4. appropriate tone
5. literal wording when useful
```

### PR-041 — Entity and technical fidelity

**MUST:** Names, numbers, dates, units, URLs, code identifiers, versions, acronyms,
and technical facts remain accurate.

### PR-042 — Mixed language and conversational input

**MUST:** Mixed Indonesian/English input and normal Indonesian conversational/slang
expressions are handled naturally rather than mechanically translated token by
token.

### PR-043 — Technical terminology

**MUST:** Established technical terms may remain untranslated when translation
would reduce clarity or distort accepted meaning.

### PR-044 — Tone modes

**MUST:** User-facing tone modes are:

```text
Auto
Formal
Casual
```

**DEFAULT:** `Auto`.

### PR-045 — Tone semantics

- **Auto:** preserve/infer source tone naturally.
- **Formal:** professional, clear, and polite without changing facts.
- **Casual:** conversational without inventing slang or changing intent.

### PR-046 — Inbound tone behavior

**SHOULD:** Inbound meeting assistance preserve the other participant's source tone
through Auto behavior by default rather than stylistically rewriting them.

### PR-047 — Translation context

**MAY:** Bounded recent session context influence translation when useful for
pronouns, omitted subjects, terminology, continuity, or tone.

**MUST:** Context remain local/session-scoped by default and must not override the
current utterance or invent new facts.

## 6. Runtime Modes And Performance

### PR-050 — User-facing modes

**MUST:** Canonical product modes are:

```text
Realtime
Quality
```

**SUPERSEDED TERM:** `Fast` for the Realtime mode.

### PR-051 — Workflow defaults

- Meeting voice -> **Realtime**.
- Standalone text -> **Quality**.
- Document translation -> **Quality**.

### PR-052 — Automatic implementation routing

**MAY:** Runtime automatically select a suitable local implementation profile when
a preferred profile cannot serve a direction/workflow.

**MUST NOT:** Normal users be required to select model/provider names.

### PR-053 — Official latency metric

**MUST:** User-relevant voice latency is measured from detected end of utterance to
first translated audio playback.

### PR-054 — Numeric latency threshold

**MUST:** Final release threshold be derived from target-PC benchmark evidence.

**SUPERSEDED:** inherited `<= 1 second` as an unverified hard release promise.

## 7. Acceleration And Fallback

### PR-060 — Preferred acceleration

**SHOULD:** Use validated NVIDIA CUDA acceleration when available, especially for
Realtime meeting voice.

### PR-061 — GPU requirement

**MUST NOT:** An NVIDIA GPU be an absolute requirement for the product to run.

### PR-062 — CPU fallback

**MUST:** CPU fallback exist for local operation.

**MUST:** Standalone text remain usable on supported CPU-only systems when the local
runtime is otherwise available.

### PR-063 — Realtime truthfulness

**MUST:** If CPU performance cannot satisfy benchmark-derived Realtime expectations,
TranslateIT reports `Degraded` / not-Realtime-ready rather than claiming equivalent
performance.

### PR-064 — No silent cloud fallback

**MUST NOT:** Local performance failure silently route user speech/text to cloud.

### PR-065 — Replaceable providers

**MAY:** ASR, translation, TTS models/providers be replaced when the replacement
preserves approved language, quality, latency, local-first, packaging, and privacy
requirements.

## 8. Meeting Audio Routing

### PR-070 — Meeting output content

**MUST:** Primary outbound meeting output contains translated English TTS by
default.

**MUST NOT:** Raw Indonesian microphone audio be mixed into meeting output by
default.

### PR-071 — Physical microphone

**MUST:** Physical microphone remain available to TranslateIT as the ASR capture
source.

### PR-072 — TranslateIT meeting microphone

**MUST:** Product expose a TranslateIT-managed meeting microphone/audio route or
functionally equivalent Windows endpoint that meeting applications can select as a
microphone.

### PR-073 — Replaceable route provider

**MAY:** Underlying Windows virtual-audio provider/driver be replaced.

**NOT REQUIRED:** a custom TranslateIT kernel/audio driver when another supported
provider satisfies the product behavior.

### PR-074 — Missing route

**MUST:** Missing/unavailable meeting route produce `Setup Needed`.

**MUST NOT:** TranslateIT silently fall back to raw physical microphone, speaker
output, or cloud routing.

### PR-075 — Local monitoring

**MAY:** User monitor translated voice locally.

**DEFAULT:** Off.

**MUST:** Monitoring volume be user-adjustable when enabled.

## 9. History, Saved, Privacy And Retention

### PR-080 — Local History default

**MUST:** Keep Local History be on by default and user-disableable.

### PR-081 — History content

**MAY:** History store useful local product data such as timestamp, workflow,
original/transcribed text, translated text, direction, tone, and runtime mode.

**MUST NOT:** Raw microphone audio be part of normal History.

### PR-082 — History controls

**MUST:** User can search History, delete individual entries/sessions, clear all
History, and disable future History writes.

### PR-083 — Saved semantics

**MUST:** Saved work require an explicit user action and remain separate from
automatic History.

### PR-084 — Clear History isolation

**MUST NOT:** Clearing History delete explicitly Saved sessions.

### PR-085 — Persistent History and model context

**MUST NOT:** Persistent History automatically feed translation model context.

**MAY:** Explicit user action restore selected prior context in a future supported
workflow.

### PR-086 — Audio retention

**DEFAULT:** Raw/source audio and generated TTS audio are temporary/disposable.

**MAY:** Replay audio become persistent only through explicit Save behavior.

### PR-087 — Diagnostics privacy

**MUST:** Normal diagnostic logging use minimal operational/redacted information.

**MUST NOT:** Full conversation bodies or raw microphone content be logged by
default.

**MAY:** Explicit diagnostic capture include conversation content when the scope is
made clear.

## 10. Storage Ownership

### PR-090 — Existing storage roots

**MUST:** Preserve current responsibility split:

```text
UserData/CacheData/    -> temporary/disposable data
UserData/LogData/      -> diagnostics/evidence
UserData/SavedProject/ -> persistent user-visible/user-approved data
```

### PR-091 — No speculative storage root

**MUST NOT:** Create another persistent storage root without a distinct ownership
need.

## 11. Document Translation

### PR-100 — First-class initial formats

**MUST:** Initial first-class document formats are:

```text
.txt
.md
.docx
text-based .pdf
.srt
.vtt
```

### PR-101 — TXT and Markdown

**MUST:** Provide translated preview and same-format translated export.

### PR-102 — DOCX

**MUST:** Provide translated preview and translated DOCX export.

**SHOULD:** Preserve practical structure such as paragraphs, headings, lists,
tables, basic text formatting, and document order.

**NOT GUARANTEED INITIALLY:** pixel-perfect layout, macros, tracked changes,
comments, floating objects, and advanced Word-specific constructs.

### PR-103 — PDF

**MUST:** Initial PDF support operate on a usable text layer.

**MUST:** Provide translated preview and text/DOCX export.

**NOT REQUIRED INITIALLY:** exact-layout translated PDF output.

### PR-104 — OCR

**DEFERRED:** Scanned/image-only PDF OCR.

**MUST:** Clearly report when a PDF requires OCR rather than returning empty or
misleading output.

### PR-105 — Subtitles

**MUST:** SRT/VTT translation preserve timestamp and sequence structure.

### PR-106 — Large-document chunking

**MUST:** Use semantic boundaries such as paragraphs, sections, and subtitle cues
with bounded adjacent context.

**SHOULD NOT:** Arbitrarily split normal sentences solely because of a character
limit.

### PR-107 — Structured text attachments

**MAY:** JSON/CSV/YAML/XML remain quick text attachments.

**NOT REQUIRED INITIALLY:** structure-preserving translated-file export for those
formats.

### PR-108 — Document persistence

**MUST:** Extraction/chunks/intermediate output remain local and temporary unless
explicitly exported/saved.

### PR-109 — Document History

**DEFAULT:** Store document job metadata rather than the complete document body.

## 12. Audio Studio / Custom Voice

### PR-120 — Scope priority

**POST-CORE:** Audio Studio is part of TranslateIT but does not block initial core
release readiness.

### PR-121 — Purpose

**MUST:** Its minimum purpose is creating/managing a local custom English voice
profile for outbound translated TTS.

### PR-122 — Inputs

**SHOULD:** Support both imported voice samples and guided recording.

### PR-123 — Minimum workflow

```text
Create Profile
-> Collect / Import Samples
-> Quality Check
-> Accept / Retry / Remove
-> Build Profile
-> Preview
-> Activate
```

### PR-124 — Voice authorization

**MUST:** User acknowledge that the voice is their own or that they are explicitly
authorized to use it.

### PR-125 — Readiness

**MUST:** Profile readiness be quality/provider-driven rather than frozen sample
minute tiers.

**SUPERSEDED:** 1/30/180-minute starter/production/broadcast tiers as product
requirements.

### PR-126 — Default voice independence

**MUST:** Default local English TTS remain available independently of Audio Studio.

### PR-127 — Custom-profile failure

**MUST:** When selected custom voice is unavailable, visibly fall back to Default
Voice rather than silently using cloud.

### PR-128 — Audio Studio storage/deletion

**MUST:** Working data remain local, persistent profile/project data be explicitly
owned under Saved data, and samples/profile be user-deletable.

### PR-129 — Advanced exclusions

**NOT INITIAL SCOPE:**

- broadcast profile tiers;
- emotion/style production studio;
- multilingual cloning;
- dialogue mode;
- long-form professional voice production.

## 13. Installer, Packaging And Distribution

### PR-140 — Initial distribution

**MUST:** Initial distribution target Windows internal/controlled users first.

### PR-141 — One setup experience

**MUST:** Normal users receive one user-facing installer/setup experience.

### PR-142 — No manual runtime setup

**MUST NOT:** Normal installed builds require manual Python installation, `pip`,
environment-variable setup, developer scripts, or manual core-model placement.

### PR-143 — Packaged helper

**MUST:** Production package provide a TranslateIT-owned helper runtime and its
required dependencies.

**MAY:** System Python remain a development fallback only.

### PR-144 — Core assets

**MUST:** Release package/build inputs provide required core ASR assets, ID/EN
translation assets, and default local English TTS assets.

**MAY:** Large model binaries remain outside Git.

### PR-145 — Meeting-audio setup

**MUST:** Installer/setup own a supported path to prepare/configure the meeting
audio route without freezing a third-party provider brand as product identity.

### PR-146 — Clean user state

**MUST NOT:** Package existing developer `UserData` contents or `DevelopingData` as
runtime user content.

### PR-147 — Updates and signing

**DEFERRED:** Auto-update for initial internal distribution.

**NOT AN INTERNAL-RELEASE BLOCKER:** code signing.

**SHOULD:** Re-evaluate signing before broad/public distribution.

### PR-148 — Installer naming

**MAY:** Installer artifact filename follow build/release convention.

**SUPERSEDED:** `TranslateIT.setup.exe` as mandatory product identity.

### PR-149 — Installer readiness proof

**MUST:** Installer readiness be demonstrated on a clean supported Windows
environment, including relevant checks for:

- install and launch;
- clean application/user-data initialization;
- packaged helper startup without system Python requirement;
- core model discovery;
- standalone text translation;
- default local TTS;
- microphone readiness;
- meeting-route configuration/detection;
- CPU fallback behavior;
- CUDA acceleration on a supported GPU target where applicable;
- uninstall/reinstall independence from repository checkout.

**MUST NOT:** NSIS configuration or package creation alone be called runtime-ready.

## 14. Normal UI And Developer Diagnostics

### PR-160 — Product navigation

**SHOULD:** Normal navigation converge on:

```text
Meeting
Text
Documents
History
Saved
Settings
```

### PR-161 — Primary workspace

**MUST:** Meeting be treated as the primary product workspace when the recovered
product UI is implemented.

### PR-162 — Normal user information

**MUST:** Normal users see product-relevant information including:

- meeting/text/document actions;
- translated content/transcript;
- language direction;
- tone mode;
- Realtime/Quality mode;
- microphone/speaker/meeting-microphone choices;
- History/privacy controls;
- simple readiness and recovery actions.

### PR-163 — Normal readiness vocabulary

**MUST:** Prefer product-level readiness states:

```text
Ready
Degraded
Setup Needed
Unavailable
Checking
```

### PR-164 — Normal recovery actions

**SHOULD:** Use product-level actions such as:

```text
Retry
Fix Setup
Open Diagnostics
```

### PR-165 — Automatic internal setup

**SHOULD:** Starting a meeting/voice workflow automatically perform reasonable
internal helper/model/microphone/route preparation rather than requiring the user
to operate each subsystem manually.

### PR-166 — Hidden engineering internals

**MUST NOT:** Normal UX require direct operation or understanding of:

- Python/runtime path;
- helper lifecycle;
- worker process;
- model filesystem paths;
- preload/smoke commands;
- pipeline handoffs;
- CUDA compute internals;
- provider internals;
- raw diagnostic logs.

### PR-167 — Developer Diagnostics

**MUST:** Developer Diagnostics remain available under an Advanced/Developer entry.

**MAY:** It expose helper lifecycle, model inventory, exact provider/model details,
CUDA/CPU information, pipeline stages, latency breakdown, virtual-route details,
logs, runtime evidence, and engineering test actions.

### PR-168 — Error presentation

**MUST:** Normal errors be grouped and actionable at product level.

**SHOULD:** Raw technical blocker/error detail remain accessible through Developer
Diagnostics.

### PR-169 — Audio Studio placement

**SHOULD:** Audio Studio remain an advanced/post-core surface rather than primary
navigation initially.

## 15. Evidence And Release Claims

### PR-180 — Source versus proof

**MUST:** Static source/configuration presence never be reported as live runtime
success when the claim requires target-environment evidence.

### PR-181 — Live proof areas

Target-environment proof is required before claiming success for material live
behavior including:

- microphone capture;
- ASR/model loading and quality;
- contextual/tone translation quality;
- TTS quality;
- virtual meeting-microphone delivery;
- latency target attainment;
- CUDA performance;
- persistence/save/reopen behavior;
- document parser/export behavior;
- Audio Studio capture/profile generation;
- packaged installer/runtime behavior.

## 16. Deferred / Replaceable Implementation Choices

The following are not frozen by this product requirements document unless a future
explicit decision changes that:

- exact ASR model;
- exact translation model;
- exact TTS model/provider;
- exact custom-voice provider/training method;
- exact CUDA library/compute type;
- exact VAD numeric thresholds;
- exact latency numeric target before benchmark;
- exact prompt/glossary mechanics;
- exact translation context-window size;
- exact virtual-audio provider;
- exact DOCX/PDF parser/export library;
- exact installer filename;
- auto-update implementation;
- public-distribution signing workflow.

## 17. Current Implementation Status Boundary

Current `New` source is an inherited implementation baseline, not proof that these
requirements are complete. Known reconciliation areas include:

- `SimpleLauncherController` currently presents text-first stabilization UX rather
  than the recovered Meeting-first product hierarchy;
- current UI exposes helper/worker/diagnostic controls more directly than the
  approved normal-user boundary;
- current translation settings still contain `Fast` naming in some UI source;
- contextual/tone translation behavior is not proven end to end;
- History/Saved semantics are not fully aligned;
- first-class DOCX/PDF document translation is not implemented;
- Audio Studio is metadata-oriented/provider-blocked;
- current NSIS configuration does not prove a self-contained installer;
- target-PC voice/audio/CUDA/latency behavior remains subject to local proof.

These are reconciliation/development inputs, not permission to redesign the
architecture without source ownership analysis.

## Related

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable context.
- `docs/foundation/01-product-overview.md` — high-level product hierarchy.
- `docs/knowledge/next-action.md` — active continuation point.

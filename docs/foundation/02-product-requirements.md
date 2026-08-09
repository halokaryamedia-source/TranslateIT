# TranslateIT — Product Requirements

**Status:** Active Policy  
**Updated:** 2026-08-09  
**Scope:** Initial Windows product + explicitly approved post-core boundary

This document is the durable product-requirement owner for TranslateIT on branch
`New`. It defines what the product must do without freezing replaceable model,
provider, driver, prompt, or implementation details unless the requirement depends
on them.

Source presence is not runtime proof. Evidence requirements remain governed by
root `AGENTS.md`.

## 1. Product Priority

### PR-001 — Primary use case

**MUST:** TranslateIT's primary product workflow is real-time voice translation for
online meetings.

### PR-002 — Secondary text workflow

**MUST:** Indonesian <-> English text translation remains independently usable
without starting or configuring a Meeting voice session.

### PR-003 — Document workflow removed

**MUST NOT:** First-class document translation be part of the current product scope.

**MUST NOT:** `Documents` remain a normal workspace merely because inherited
policy/source contains attachment or document concepts.

**NOT CURRENT SCOPE:** PDF/DOCX/TXT/Markdown document parsing, document jobs,
structure-preserving export, document preview, document-specific History/Saved, OCR,
and related document infrastructure.

### PR-004 — Audio Studio priority

**SHOULD / POST-CORE:** Audio Studio remains part of TranslateIT but must not block
initial core Meeting/Text readiness.

## 2. Platform And Local Runtime

### PR-010 — Initial platform

**MUST:** Windows is the initial supported and validated platform.

### PR-011 — Local-first core

**MUST:** After required runtime/model assets are installed, core ASR, translation,
and TTS behavior can operate without a required cloud speech/translation API.

### PR-012 — Optional future cloud assistance

**MAY:** Future explicitly approved cloud-assisted features exist.

**MUST NOT:** Cloud assistance silently become a required fallback for core
translation behavior.

### PR-013 — Single product shell

**MUST:** One Rust/Tauri desktop application owns the user-facing product.

**MAY:** Python remain an internal helper runtime.

**MUST NOT:** A second product shell or parallel V2/V3/V4 engine be created without
an explicit architecture decision.

## 3. Languages And Directions

### PR-020 — Initial languages

**MUST:** Initial supported languages are Indonesian and English.

### PR-021 — Text directions

**MUST:** Text translation support Indonesian -> English and English -> Indonesian.

### PR-022 — Outbound Meeting voice

**MUST:** Primary outbound Meeting flow support:

```text
Indonesian speech
-> Indonesian transcript
-> English translation
-> English TTS
-> TranslateIT Meeting Microphone
```

### PR-023 — Inbound Meeting assistance

**MUST:** Primary inbound assistance support:

```text
English meeting speech
-> English transcript
-> Indonesian translated text
```

### PR-024 — Initial exclusions

**NOT REQUIRED INITIALLY:**

- English speech -> Indonesian TTS;
- language pairs beyond Indonesian/English.

## 4. First Use, Setup And Daily Readiness

### PR-025 — Guided first setup

**MUST:** First use guide the user through product concepts rather than engineering
runtime concepts.

**MUST:** Setup cover the selected physical microphone, Meeting Sound,
TranslateIT Meeting Microphone, and local translation readiness.

**MUST NOT:** Normal users manually install/start Python, workers, models, or audio
plumbing.

### PR-026 — Physical microphone verification

**MUST:** A microphone selection be functionally opened/verified before a new
explicit selection replaces a previously working preference.

**MUST:** `Follow Windows Default` follow the Windows default device policy.

**MUST NOT:** An explicitly pinned missing microphone silently switch to another
microphone.

### PR-027 — Meeting Sound verification

**MUST:** Meeting Sound represent the Windows output source used for incoming
translation.

**MUST:** `Follow Windows Default` and explicit pinned-device semantics mirror the
same intent rules as the physical microphone.

### PR-028 — Local translation setup verification

**MUST:** Setup readiness mean more than asset/file presence. The relevant local
runtime/provider/model path must be able to initialize and perform bounded
functional validation at the level appropriate for setup.

### PR-029 — Returning launch and interrupted setup

**MUST:** Returning users go directly to Meeting and receive a quick product-level
preflight rather than repeating full first-use setup.

**MUST:** Interrupted first-use setup resume from verified progress rather than
pretending setup is complete or forcing unnecessary restart from the beginning.

## 5. Voice Input, Segmentation And Outbound Output

### PR-030 — Session Listening

**MUST:** Normal Meeting voice use an explicitly user-started Session Listening
mode. TranslateIT must not persistently listen merely because the app is open.

### PR-031 — Session lifecycle

**MUST:** Once started, Session Listening continuously captures while the session is
active and stops when the session is stopped/paused according to the approved
lifecycle.

### PR-032 — Push to Talk

**MUST:** Push to Talk remain an alternative mode.

**DEFAULT:** `Ctrl+Space`.

### PR-033 — Natural speech boundaries

**MUST:** Segmentation handle meaningful pauses, hesitation, natural sentence/turn
boundaries, and long speech without relying on one inherited fixed silence/maximum
segment constant.

### PR-034 — Numeric segmentation parameters

**IMPLEMENTATION DETAIL:** Silence duration, VAD threshold, minimum speech,
pre-roll, chunk size, and maximum segment duration are tuning parameters.

**SUPERSEDED:** Fixed `700 ms` silence and `12 s` maximum segment as product constants.

### PR-035 — Partial versus committed transcript

**MAY:** Partial ASR be shown as an evolving preview.

**MUST NOT:** Partial/uncommitted transcript become outbound translated voice or
normal History content.

### PR-036 — Stable utterance identity and generation

**MUST:** Each outbound utterance be associated with stable session/generation/
utterance identity so stale asynchronous work cannot enter newer session state.

### PR-037 — Concurrent capture and output

**MUST:** Physical microphone capture remain available while previous translation,
TTS generation, or translated output is active.

**MUST:** TranslateIT's own TTS outputs be serialized rather than overlapping each
other.

### PR-038 — Delivery semantics

**MUST:** Application-side live meeting playback be at-most-once by default.

**MUST NOT:** Uncertain/partially played output be blindly replayed from the start.

**MUST:** User-visible delivery status describe what TranslateIT can prove, such as
`Output complete`, `Not delivered`, or interrupted output, rather than claiming the
remote participant heard the message.

### PR-039 — Pause, current-output stop, and backlog

**MUST:** A Meeting Pause stop/clear new and pending outbound translated voice while
allowing incoming assistance to continue when available.

**MAY:** A contextual `Stop Voice` action immediately interrupt currently speaking
translated output without ending the whole session.

**MUST:** Output backlog be bounded and surfaced before stale delayed speech becomes
misleading or useless.

## 6. Translation Quality, Tone And Context

### PR-040 — Meaning preservation

**MUST:** Translation optimize for intended communication meaning rather than
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

**MUST:** Mixed Indonesian/English and normal conversational/slang input be handled
naturally rather than mechanically token-by-token.

### PR-043 — Technical terminology

**MUST:** Established technical terms may remain untranslated when translation
would reduce clarity or distort accepted meaning.

### PR-044 — Tone modes

**MUST:** User-facing tone modes be `Auto`, `Formal`, and `Casual`.

**DEFAULT:** `Auto`.

### PR-045 — Tone semantics

- **Auto:** preserve/infer source tone naturally.
- **Formal:** professional, clear, polite, without changing facts.
- **Casual:** conversational without inventing slang or changing intent.

### PR-046 — Inbound tone

**SHOULD:** Incoming Meeting assistance preserve source tone through Auto behavior
rather than stylistically rewriting the participant.

### PR-047 — Bounded session context

**MAY:** Bounded recent committed session context influence translation for
pronouns, omitted subjects, terminology, continuity, or tone.

**MUST:** Context remain local/session-scoped by default and never override the
current utterance or invent new facts.

### PR-048 — Conversation context ordering

**MUST:** Shared Meeting context use committed conversational turn order based on
speech/event sequence rather than asynchronous callback completion order.

**MUST:** Partial, canceled, rejected, or failed turns not become normal strong
conversation context.

### PR-049 — History is not model context

**MUST NOT:** Persistent History or Saved work automatically feed Meeting/Text model
context.

## 7. Runtime Modes, Start, Coordination And Reliability

### PR-050 — User-facing modes

**MUST:** Canonical modes be `Realtime` and `Quality`.

**SUPERSEDED:** `Fast` as a product term for Realtime.

### PR-051 — Workflow defaults

- Meeting -> **Realtime**.
- Text -> **Quality**.

### PR-052 — Automatic implementation routing

**MAY:** Runtime choose a suitable local implementation profile while preserving
approved behavior.

**MUST NOT:** Normal users be required to select model/provider names.

### PR-053 — Official outbound latency metric

**MUST:** User-relevant voice latency be measured from detected utterance end to
first translated audio playback.

### PR-054 — Numeric latency threshold

**MUST:** Final release threshold be derived from target-PC benchmark evidence.

### PR-055 — Atomic Start

**MUST:** `Start Translation` perform final required outbound validation/opening and
commit `Live` only when the required outbound path is actually ready.

**MUST:** Duplicate Start actions not create duplicate sessions.

**MUST:** Optional incoming failure may yield `Live / Degraded`; required outbound
failure yields a blocked start with rollback rather than half-live state.

### PR-056 — Conversation-aware delivery

**SHOULD:** If meaningful incoming speech is active when outbound TTS becomes ready,
briefly hold delivery for a natural gap.

**MUST:** Waiting be bounded. When no useful gap appears, surface an explicit choice
such as `Speak Now` or `Cancel` rather than waiting indefinitely or automatically
deciding to interrupt.

**SHOULD:** Once delivery is committed and TTS is speaking, normally finish that
output unless user action or a critical failure requires interruption.

### PR-057 — Freshness and resource priority

**MUST:** Realtime Meeting work be prioritized above non-live work.

**MUST:** Protect core outbound before incoming assistance under severe resource
pressure.

**MUST:** Realtime queues not grow without bound; stale work must not be silently
presented as current realtime output.

### PR-058 — Recovery

**MUST:** Classify failures as recoverable, degradable, or blocking/unsafe at the
product level.

**MUST:** Recovery be bounded and owned by one session/recovery authority.

**MUST:** Explicit newer user intent override stale automatic recovery.

**MUST:** Stale-generation callbacks be discarded.

**MUST NOT:** Local failure silently route to cloud.

### PR-059 — Stop and finalization

**MUST:** `Stop Translation` revoke old-session output authority before normal
finalization work.

**MUST:** Current/pending outbound output and incoming/outbound capture stop according
to the Stop lifecycle; late old-session callbacks cannot create new meeting output.

**MUST:** `Ended` represent completed safe runtime shutdown/finalization, not merely
a clicked frontend button.

## 8. Acceleration And Fallback

### PR-060 — Preferred acceleration

**SHOULD:** Use validated NVIDIA CUDA acceleration when available, especially for
Realtime Meeting voice.

### PR-061 — GPU requirement

**MUST NOT:** NVIDIA GPU be an absolute product requirement.

### PR-062 — CPU fallback

**MUST:** CPU fallback exist for local operation.

**MUST:** Standalone Text remain usable on supported CPU-only systems when the local
runtime is otherwise available.

### PR-063 — Realtime truthfulness

**MUST:** If CPU performance cannot meet benchmark-derived Realtime expectations,
report `Degraded` / not-Realtime-ready rather than equivalent performance.

### PR-064 — No silent cloud fallback

**MUST NOT:** Local performance failure silently route user speech/text to cloud.

### PR-065 — Replaceable providers

**MAY:** ASR/translation/TTS providers be replaced when replacements preserve the
approved product requirements.

## 9. Meeting Audio And Incoming Assistance

### PR-070 — Meeting output content

**MUST:** Primary outbound meeting output contain translated English TTS.

**MUST NOT:** Raw Indonesian microphone audio be mixed into meeting output by
default or used as a silent fallback.

### PR-071 — Physical microphone

**MUST:** Physical microphone remain available to TranslateIT as the outbound ASR
capture source.

### PR-072 — TranslateIT Meeting Microphone

**MUST:** Product expose a TranslateIT-managed meeting microphone/audio route or
functionally equivalent Windows endpoint selectable by meeting applications.

### PR-073 — Replaceable route provider

**MAY:** Underlying Windows virtual-audio provider/driver be replaced.

**NOT REQUIRED:** a custom TranslateIT kernel driver when another supported provider
satisfies product behavior.

### PR-074 — Missing route

**MUST:** Missing/unavailable Meeting Microphone produce `Setup Needed` and pause/
block outbound as appropriate.

**MUST NOT:** Route recovery dump old queued speech after reconnection.

### PR-075 — Local monitoring

**MAY:** User monitor translated voice locally.

**DEFAULT:** Off.

### PR-076 — Incoming is a separate optional lane

**MUST:** Incoming English -> Indonesian text use a separate Meeting Sound capture/
processing lane from the user's physical microphone.

**MUST:** Incoming may be disabled/unavailable without blocking otherwise healthy
core outbound.

### PR-077 — Incoming partial subtitle and self-output suppression

**MAY:** Incoming show evolving partial subtitles for responsiveness.

**MUST:** Partial incoming content remain transient until committed.

**MUST:** TranslateIT's own English TTS not appear as a remote/incoming translation.

### PR-078 — Incoming source truthfulness

**MUST NOT:** Invent participant identity when only mixed/device-level audio is
available.

**MUST NOT:** Claim Zoom/Meet/Teams process-specific capture or participant delivery
without evidence for that boundary.

### PR-079 — Incoming freshness/device behavior

**MUST:** Incoming prioritize current comprehension over an unbounded old subtitle
backlog.

**MUST:** Follow-default device changes may rebind safely; explicitly pinned missing
devices require user choice rather than silent substitution.

## 10. History, Saved, Privacy And Retention

### PR-080 — Local History default

**MUST:** Local History be on by default and user-disableable.

### PR-081 — History content

**MAY:** History store useful product data such as timestamps, workflow, final
transcript/source, translation, direction, tone, and truthful delivery status.

**MUST NOT:** Raw microphone/incoming audio be normal History content.

### PR-082 — History controls

**MUST:** User can search History, delete individual entries/sessions, clear all
History, and disable future/current retention according to the approved policy.

### PR-083 — Saved semantics

**MUST:** Saved work require explicit user action and remain durable/independent
from automatic History.

### PR-084 — Deletion isolation

**MUST NOT:** Clearing/deleting History delete Saved.

**MUST NOT:** Removing Saved delete otherwise existing History.

### PR-085 — History and model context

**MUST NOT:** Persistent History/Saved automatically feed translation model context.

### PR-086 — Audio retention

**DEFAULT:** Raw/source/incoming audio and generated TTS audio are temporary.

### PR-087 — Diagnostics privacy

**MUST:** Normal diagnostic logging use minimal operational/redacted information.

**MUST NOT:** Full conversation bodies or raw microphone content be logged by
default.

### PR-088 — History-off semantics

**MUST:** Turning History off stop automatic retention for new/current activity
without silently deleting already completed History.

**MUST:** A live Meeting may retain transient state required for live processing,
then discard its conversation body at end when History is off unless the user
explicitly saves it.

### PR-089 — History/Saved user model

**MUST:** Normal History contain only Meeting and Text activity.

**SHOULD:** Saved be accessed through `History -> Saved` rather than as a separate
top-level workspace.

**MUST:** Saved success be shown only after durable commit.

## 11. Storage And Standalone Text

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

### PR-092 — Explicit Text translation

**MUST:** Standalone Text translate only on an explicit user action rather than on
every keystroke.

**DEFAULT:** Quality mode and Auto tone.

### PR-093 — Text request authority

**MUST:** Text requests have identity/authority so older/late results cannot
overwrite newer user intent.

**MAY:** User cancel a long Text request; canceled results cannot reappear later.

### PR-094 — Text result editing/outdated state

**MUST:** If source changes after a completed translation, the existing result be
marked outdated rather than presented as current.

**MAY:** Target translation be user-editable before Copy/Save.

### PR-095 — Text size truthfulness

**MUST NOT:** Very large input be silently truncated.

**MUST:** If input exceeds the supported interactive Text boundary, report that
clearly and ask the user to shorten/split it; do not redirect to a removed Documents
workflow.

### PR-096 — Text independence/context isolation

**MUST:** Text work without Meeting microphone/sound/route readiness when core
translation runtime is available.

**MUST NOT:** Meeting context automatically leak into standalone Text, or vice versa.

### PR-097 — Text History/Saved

**MUST:** Successful intentional Text translations follow the same History on/off
policy and explicit Saved semantics as the rest of the product.

**MUST:** Copy default to the target text without adding branding/technical metadata.

## 12. Document Translation Boundary

### PR-100 — Removed capability

**REMOVED FROM CURRENT PRODUCT SCOPE:** First-class document translation.

Inherited document requirements PR-101–109 are retired and must not be treated as
current requirements. Historical Git state remains provenance if the capability is
reconsidered through a future explicit product decision.

## 13. Audio Studio / Custom Voice

### PR-120 — Scope priority

**POST-CORE:** Audio Studio is part of TranslateIT but does not block initial core
release readiness.

### PR-121 — Purpose

**MUST:** Minimum purpose is creating/managing a local custom English voice profile
for outbound translated TTS.

### PR-122 — Inputs

**SHOULD:** Support imported voice samples and guided recording.

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

**MUST:** User acknowledge the voice is their own or explicitly authorized.

### PR-125 — Readiness

**MUST:** Profile readiness be quality/provider-driven rather than fixed sample
minute tiers.

### PR-126 — Default voice independence

**MUST:** Default local English TTS remain available independently of Audio Studio.

### PR-127 — Custom-profile failure

**MUST:** Unavailable selected custom voice visibly fall back to Default Voice, never
silent cloud.

### PR-128 — Audio Studio storage/deletion

**MUST:** Working data remain local; persistent profile/project data be explicitly
owned under Saved data; samples/profile be user-deletable.

### PR-129 — Advanced exclusions

**NOT INITIAL SCOPE:** broadcast tiers, emotion/style production studio,
multilingual cloning, dialogue mode, and long-form professional voice production.

## 14. Installer, Packaging And Distribution

### PR-140 — Initial distribution

**MUST:** Initial distribution target Windows internal/controlled users first.

### PR-141 — One setup experience

**MUST:** Normal users receive one user-facing installer/setup experience.

### PR-142 — No manual runtime setup

**MUST NOT:** Installed builds require manual Python, `pip`, environment-variable
setup, developer scripts, or manual core-model placement.

### PR-143 — Packaged helper

**MUST:** Production package provide a TranslateIT-owned helper runtime and required
dependencies.

### PR-144 — Core assets

**MUST:** Release package/build inputs provide required core ASR, ID/EN translation,
and default local English TTS assets.

### PR-145 — Meeting-audio setup

**MUST:** Installer/setup own a supported path to prepare/configure the Meeting
Microphone route without freezing a third-party provider brand as product identity.

### PR-146 — Clean user state

**MUST NOT:** Package developer `UserData` contents or `DevelopingData` as runtime
user content.

### PR-147 — Updates/signing

**DEFERRED:** Auto-update for initial internal distribution.

**NOT INTERNAL-RELEASE BLOCKER:** code signing; reconsider before broad/public
distribution.

### PR-149 — Installer readiness proof

**MUST:** Installer readiness require clean supported-Windows evidence for install,
launch, clean user state, packaged helper, core model discovery, Text translation,
TTS, microphone, Meeting route, CPU fallback, applicable CUDA, and reinstall
independence from repository checkout.

## 15. Normal UI, Navigation And Settings

### PR-160 — Product navigation

**SHOULD:** Normal top-level navigation converge on:

```text
Meeting
Text
History
Settings
```

**MUST NOT:** `Documents` or `Saved` be normal top-level destinations in the current
product. Saved remains available under History.

### PR-161 — Primary workspace

**MUST:** Meeting be the primary/default product workspace.

### PR-162 — Normal user information

**MUST:** Normal users see only product-relevant actions/results, language/tone/mode
choices, Meeting devices, History/privacy controls, and simple readiness/recovery.

### PR-163 — Readiness vocabulary

**MUST:** Prefer product-level readiness states:

```text
Ready
Degraded
Setup Needed
Unavailable
Checking
```

### PR-164 — Recovery actions

**SHOULD:** Use product-level actions such as `Retry`, `Fix Setup`, `Choose
Microphone`, or `Open Diagnostics`.

### PR-165 — Automatic internal setup

**SHOULD:** Starting Meeting automatically perform reasonable internal runtime/model/
device/route preparation rather than requiring subsystem controls.

### PR-166 — Hidden engineering internals

**MUST NOT:** Normal UX require direct operation/understanding of Python path,
helper/worker lifecycle, model paths, CUDA/provider internals, VAD thresholds,
queue sizes, retry counts, pipeline handoffs, or raw logs.

### PR-167 — Developer Diagnostics

**MUST:** Developer Diagnostics remain available under Advanced.

**MAY:** It expose technical runtime/model/audio/performance/evidence details needed
for troubleshooting.

**SHOULD NOT:** Diagnostics become the normal manual runtime control plane.

### PR-168 — Error presentation

**MUST:** Normal errors be grouped/actionable at product level; raw technical detail
belongs in Diagnostics.

### PR-169 — Audio Studio placement

**SHOULD:** Audio Studio remain advanced/post-core rather than primary navigation.

### PR-170 — Settings hierarchy

**SHOULD:** Normal Settings converge on:

```text
Meeting
History & Privacy
Advanced
```

**SHOULD NOT:** `General` or `Translation` exist as separate normal Settings sections
without a distinct approved user responsibility.

### PR-171 — Device settings semantics

**MUST:** Meeting Settings own physical microphone and Meeting Sound preferences,
including Follow Windows Default and explicit pinned-device behavior.

**MUST:** A newly chosen device be verified before replacing a previously working
preference.

### PR-172 — Managed Meeting Microphone settings

**MUST:** TranslateIT Meeting Microphone appear as a managed product route with
readiness/setup actions, not as a general audio-routing dropdown.

### PR-173 — Settings persistence

**MUST:** Persist user preferences such as speaking mode/device/history policy.

**MUST NOT:** Persist transient `ready=true` facts as permanent truth; runtime
readiness is revalidated.

### PR-174 — Settings during Live Meeting

**MUST:** Opening Settings not stop a live session.

**MAY:** Explicit device changes perform safe affected-lane rebinds.

**SHOULD:** Speaking-mode changes apply next session rather than changing mid-
utterance semantics.

**MUST:** Full setup tests not disrupt a live Meeting.

### PR-175 — History presentation

**SHOULD:** `History` expose `Recent / Saved` with Meeting/Text filters and local
search rather than separate top-level Saved navigation.

## 16. Long-Session And Application Lifecycle

### PR-176 — Long-session bounds

**MUST:** Long sessions keep memory growth, queues, context, temporary artifacts,
threads/handles, and persistence work bounded.

### PR-177 — Minimize versus control loss

**MUST:** Normal minimize/hide not end a healthy Meeting session.

**MUST:** Unexpected loss of the user control plane not leave uncontrolled invisible
Meeting output running indefinitely.

### PR-178 — Sleep/hibernate

**MUST:** Windows sleep/hibernate interrupt the live session and invalidate old live
output authority.

**MUST NOT:** Voice output automatically resume after wake without a new explicit
user continuation/start decision.

### PR-179 — Update/runtime pinning during Live

**SHOULD:** Active Meeting use stable current runtime/model/config generation;
updates/model replacements must not unexpectedly disrupt an active session.

## 17. Evidence And Release Claims

### PR-180 — Source versus proof

**MUST:** Static source/config presence never be reported as live runtime success
when the claim requires target-environment evidence.

### PR-181 — Live proof areas

Target-environment proof is required before claiming success for microphone
capture, ASR/translation/TTS quality, self-output suppression, Meeting Microphone
delivery, turn coordination, latency, CUDA performance, History/Saved persistence,
Audio Studio generation, and packaged installer/runtime behavior.

## 18. Deferred / Replaceable Implementation Choices

Not frozen without a future explicit decision:

- exact ASR/translation/TTS models/providers;
- exact CUDA library/compute type;
- exact VAD numeric thresholds;
- exact benchmark-derived latency target;
- exact prompt/glossary/context-window mechanics;
- exact Windows virtual-audio provider;
- exact installer filename/update/signing implementation.

## 19. Current Implementation Status Boundary

Current `New` source is an inherited implementation baseline, not proof that these
requirements are complete. The current shell/source still contains behavior that
predates this policy, including Documents/Saved top-level surfaces and incomplete
Meeting/Text/History/Settings semantics. These are later reconciliation inputs, not
permission to implement before the current product-flow planning sequence is
finished.

## Related

- `AGENTS.md`
- `CONTEXT.md`
- `docs/foundation/01-product-overview.md`
- `docs/knowledge/next-action.md`
- `docs/knowledge/source-ownership.md`

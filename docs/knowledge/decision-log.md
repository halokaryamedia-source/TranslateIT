# Decision Log

This file records durable decisions whose **reasoning** must survive. It is not a
changelog, task log, or duplicate product-requirements file.

## D-001 — Branch Authority

**Decision**  
`New` is the current TranslateIT development authority. `V1-Advance` is inherited
implementation/recovery evidence.

**Reason**  
Current product policy and source ownership have been reconciled on `New`; older
branches remain useful provenance but must not silently override current owners.

## D-002 — Repository Is Project Memory

**Decision**  
Current task state, durable policy, stable context, semantic ownership, and durable
reasoning are persisted in their canonical repository owners rather than relying on
chat history.

**Reason**  
TranslateIT is a recovered long-running project. Continuation must be possible from
the repository without reconstructing old conversations.

## D-003 — Canonical Runtime Architecture

**Decision**  
The current architecture remains:

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Do not create another launcher/engine/product shell merely to avoid understanding
or repairing the inherited owners.

**Reason**  
Source reconciliation found useful existing owners and duplicate/stale boundaries,
not evidence that a parallel product architecture is required.

## D-004 — Developing Front Door And Specialist Budget

**Decision**  
Non-trivial Developing work uses `development-brief` first and may use at most one
project specialist selected by semantic owner. Maintenance may use at most one
project specialist after diagnosis proves that boundary; Plan and Context Recovery
use no project specialist by default.

**Reason**  
This keeps task scope and ownership explicit while preventing technology-based
expert stacking and duplicate architecture.

## D-005 — Frozen Project Specialist Baseline

**Decision**  
The approved repository skill baseline is:

```text
development-brief
desktop-runtime-development
desktop-ui-design-development
local-ai-runtime-development
windows-audio-runtime-development
release-packaging-development
```

The baseline is frozen until real project work again proves a distinct semantic
capability is missing.

**Reason**  
The original runtime-oriented baseline remains valid, but current TranslateIT work
proved one genuine gap: `desktop-runtime-development` intentionally excludes
generic visual styling, typography, and motion while the product needs a reusable
semantic owner for reference-driven desktop visual hierarchy, interaction craft,
and rendered visual acceptance. That responsibility is now owned by one
`desktop-ui-design-development` specialist instead of stacking separate design,
motion, and anti-slop skills.

## D-006 — Proof Follows The Claim And Execution Channel

**Decision**  
Acceptance criteria stay the same across ChatGPT->GitHub and Codex/local work. Only
available proof changes. Static source is not promoted into live device/runtime/
visual/release proof.

**Reason**  
TranslateIT has multiple target-sensitive areas (models, CUDA, microphone, VAD,
virtual audio, TTS, installer) where source existence cannot establish operational
success.

## D-007 — Source-Side Development Precedes The Local Acceptance Phase

**Decision**  
Continue the bounded work that can be completed through ChatGPT -> GitHub before
entering the dedicated Codex/local Windows acceptance phase. Missing local proof is
recorded honestly but does not automatically block the next independent
source-side development slice.

**Reason**  
The project currently has substantial source/ownership alignment work that can be
completed without Windows execution. Running local acceptance after every source
slice would interrupt that work without increasing source correctness. This does
not lower acceptance criteria: runtime, rendered, device, model, audio, and
clean-machine claims remain `LOCAL PROOF REQUIRED` until the later local phase.

## D-008 — Current External Documentation Retrieval

**Decision**  
For version-sensitive third-party APIs/libraries, retrieve current documentation
before implementation. Context7 may be used as a conditional retrieval helper when
available, while official project documentation or primary source remains the
external authority for material contracts.

**Reason**  
This reduces stale/hallucinated API usage without turning a documentation service
into a project semantic owner or allowing community-indexed material to override
primary sources.

## D-009 — Root Data Boundary Ownership

**Decision**  
The root data boundaries are:

```text
EngineData
-> canonical product implementation and production runtime assets/contracts

UserData
-> runtime/user-owned data destination, not source/build/project-memory authority

DevelopingData
-> historical/recovery/reference development evidence, not current authority
```

Production build/package/runtime discovery must not depend on `DevelopingData`. Developer/source-validation reports belong under ignored `.tmp/` development paths rather than `UserData`.

**Reason**  
The inherited repository mixed active V1 branch automation, historical DevelopingData policy/report inputs, and developer validation output with current product/runtime data. Separating these responsibilities gives each behavior one canonical owner and prevents historical or developer evidence from becoming a production dependency.

## D-010 — Retire Figma And Standalone Design-Review Workflow

**Decision**  
Figma export/import, standalone `Preview`/`DesignPreview`, old locked screenshot manifests, and their mandatory design-review workflow are not current TranslateIT development infrastructure on `New`.

Current desktop visual truth is the production UI source that is actually imported/called by the application, interpreted through current product requirements and the `desktop-ui-design-development` specialist. Historical branches retain the retired design-review artifacts as provenance.

**Reason**  
The user confirmed that Figma Design is no longer used. Source evidence also showed the design-review chain was preview-only or tied to `V1-Pull` and Main Page v28 / settings v22-v37 references, while the current application entrypoint uses the Meeting-first production shell and current CSS modules directly. Keeping both would preserve competing visual authorities and obsolete report paths.

## D-011 — RustApp Tooling Reachability

**Decision**  
Persistent files under `EngineData/Frontend/RustApp/scripts/` are current only when they are reachable from `package.json`, `auto_test_registry.mjs`, or are direct helpers/fixtures required by tooling reachable from those owners. Local proof scripts also require an explicit current owner/entrypoint.

Orphan repair scripts, aggregate gates, model-setup experiments, branch-era diagnostics, and unused validators are removed from `New` rather than retained as speculative future tooling or copied into `DevelopingData`.

**Reason**  
The inherited scripts directory contained multiple overlapping validation systems, stale npm profile assumptions, V1/V1-Pull terminology, developer reports written into `UserData`, and one-off model/repair utilities with no current caller. Keeping unreachable tooling makes dead behavior appear authoritative and increases proof/maintenance surface. Git history already preserves that provenance.

## D-012 — Remove Document Translation From Product Scope

**Decision**  
First-class document translation is removed from the current TranslateIT product scope. `Documents` must not remain a normal product workspace merely because inherited policy or source contains document/attachment concepts. No PDF/DOCX/TXT/Markdown document workflow, parser/export subsystem, document job system, or document-specific History/Saved capability should be developed for the current product.

**Reason**  
The product's primary value is real-time meeting translation, with standalone text translation as the bounded secondary utility. A first-class document product would require disproportionate parser, structure-preservation, rendering, export, job-management, and storage work outside that core value. Removing it keeps engineering effort on meeting quality, latency, audio routing, recovery, and simple text translation instead of overdeveloping a separate document product.

## D-013 — Simplify Navigation, Saved Access, And Settings

**Decision**  
The normal product hierarchy converges on:

```text
Meeting
Text
History
Settings
```

`Saved` remains a distinct durable data ownership concept but is accessed inside `History` through `Recent / Saved`, not as a top-level navigation destination.

Normal Settings converges on:

```text
Meeting
History & Privacy
Advanced
```

`General` and `Translation` are not separate normal Settings sections unless a future approved requirement gives them a distinct user responsibility. Contextual translation choices remain in Meeting/Text; engineering/runtime controls remain in Diagnostics.

**Reason**  
The previously broader navigation duplicated related user intents and promoted secondary/internal concepts into primary hierarchy. A nontechnical user mainly needs to run meeting translation, translate text, retrieve prior/saved work, and adjust a setting. Keeping Saved ownership independent while grouping its access under History preserves deletion/privacy semantics without adding another primary workspace, and the reduced Settings hierarchy avoids empty or engineering-oriented control panels.

## D-014 — Meeting Session Is Application-Level And Navigation-Independent

**Decision**  
An active Meeting translation session is application-level state owned by the
canonical Meeting/session runtime, not by the lifecycle of the Meeting page.
Navigating to Text, History, or Settings must not stop/recreate that session.
Returning to Meeting reconnects the UI to the same authoritative session state.

The initial product permits one active Meeting session and should prevent parallel
independent TranslateIT desktop instances from competing for the same Meeting audio
and user-data resources. A compact global live indicator exposes active Meeting
state outside the Meeting page. Material outbound safety failures are surfaced
application-wide, while optional incoming-only degradation remains scoped. A
global `Stop Voice` may appear only contextually while translated TTS is actively
speaking; normal Pause/turn controls stay on Meeting.

**Reason**  
A real meeting continues while the user briefly translates text, searches History,
or adjusts a setting. Binding the live session to a page would make normal
navigation capable of dropping capture/output state and would complicate minimize,
recovery, and frontend re-render behavior. Application-level ownership keeps the
session stable while still allowing capability-specific UI views. Restricting the
initial desktop product to one app instance/active Meeting also avoids duplicate
TTS, conflicting microphone/Meeting Microphone ownership, and concurrent writes to
the same local user data. Keeping only safety-critical controls global prevents the
application shell from becoming a second Meeting control panel.

## D-015 — Simple Familiar UI And Minimal Screen Model

**Decision**  
The initial TranslateIT UI must prioritize being **simple to use and familiar** to a
nontechnical Windows desktop user. Familiar desktop patterns, clear wording,
obvious primary actions, low control density, and progressive disclosure take
priority over novel interaction patterns or exposing implementation flexibility.

The core screen model stays deliberately small:

```text
First Setup Wizard
├─ Welcome
├─ Microphone
├─ Meeting Sound
├─ Meeting Microphone
└─ Verify / Ready

Normal App
├─ Meeting
├─ Text
├─ History Collection
├─ History Detail
├─ Settings
└─ Diagnostics (nested under Advanced)
```

Meeting lifecycle conditions such as Ready, Starting, Live, Paused, Recovering,
Attention Needed, Stopping, and Ended are variants of one Meeting workspace rather
than separate pages. Text lifecycle conditions similarly remain in one Text
workspace. Saved is a History tab and reuses the same detail views. Global Meeting
live state, critical alerts, and confirmation dialogs are shell elements rather
than new pages.

There is no separate language-setup page while Indonesian/English is the only
supported pair, and no initial Home/Dashboard, Documents, top-level Saved, separate
General/Translation Settings, lifecycle Error/Ready pages, or top-level Developer
page.

**Reason**  
The user explicitly identified simplicity and familiarity as the key UI goal. The
approved product behavior is already complex internally; creating a page for every
state or surfacing every capability as a control would transfer that complexity to
the user. Reusing a small number of familiar workspaces keeps navigation
predictable, reduces unnecessary decisions, and lets the application express
runtime state without turning technical state transitions into a complicated
information architecture.

## D-016 — Modern Familiar Desktop Visual Direction

**Decision**  
TranslateIT should look like a **modern desktop application** while remaining
immediately familiar and easy to operate. Modernity must come from polish rather
than novelty: clean hierarchy, restrained surfaces, current typography/spacing,
clear controls, subtle depth/borders, consistent radius, accessible contrast, and
responsive feedback.

The visual system must avoid making the app feel experimental or like an AI
showcase. Do not use futuristic/neon treatment, decorative AI orbs, glass-heavy
surfaces, oversized dashboard cards, hidden icon-only primary actions, or motion
that slows normal work. Familiar desktop conventions remain the baseline.

**Reason**  
The user explicitly wants the app to feel modern, easy to use, and familiar at the
same time. A visually dated interface would weaken perceived quality, but an overly
novel AI-styled interface would increase learning cost. The correct direction is a
contemporary, polished desktop UI whose interaction model remains conventional and
predictable.

## D-017 — Restrained Visual System And Transcript-First Meeting UI

**Decision**  
The approved initial visual system uses a restrained Windows-oriented desktop
language: system-oriented sans-serif typography, compact-but-comfortable spacing,
moderate radii, subtle borders/surfaces, one primary accent color, and semantic
status colors only where they communicate state. Familiar controls remain visibly
recognizable as controls; icons supplement text rather than replace critical labels.

Meeting Ready uses straightforward information rows and one visually dominant
`Start Translation` action rather than a dashboard of cards. Meeting Live makes the
chronological transcript the main content, uses no novelty chat bubbles/avatars,
gives Indonesian user-relevant text the strongest visual weight, and keeps
Pause/Stop controls available without overwhelming the transcript. Text follows the
familiar source/target translator pattern. History uses a chronological list rather
than tiles. Settings uses conventional section navigation and label/description/
control rows.

Interaction polish is deliberately quiet: visible hover/focus/disabled states,
keyboard-accessible focus, no layout-jumping loading states, restrained short
transitions, and responsive desktop reflow rather than mobile-style redesign. Exact
minimum window dimensions and final color values remain implementation/rendered-
proof decisions rather than arbitrary product constants.

**Reason**  
The product has substantial runtime complexity already; the visual layer should
reduce that complexity rather than advertise it. A transcript-first Meeting view
matches the user's actual task, conventional translation/history/settings patterns
lower learning cost, and restrained polish provides a modern appearance without
turning TranslateIT into a decorative AI dashboard. Deferring exact pixel/color
constants until rendered evaluation avoids freezing numbers without visual proof.

## D-018 — Final Meeting Ready And Meeting Live Composition

**Decision**  
The approved Meeting workspace has two dominant visual compositions while remaining
one workspace/state model.

`Meeting Ready` prioritizes, in order:

```text
Meeting status / readiness
-> plain-language explanation of ID -> EN Voice and EN -> ID Text
-> Your Microphone
-> Incoming Translation / Meeting Sound
-> TranslateIT Meeting Microphone
-> compact Realtime / Tone summary
-> one dominant Start Translation action
-> subtle reminder to select TranslateIT Meeting Microphone in the meeting app
```

Microphone and Meeting Sound are familiar information/device rows with quiet
`Change` actions. The TranslateIT Meeting Microphone is a managed route with
`Ready`, `Setup Needed`, or scoped repair state rather than a generic selectable
output. Incoming-only failure does not disable `Start Translation`; unsafe required
outbound failure does. The screen does not become a readiness dashboard or expose
runtime internals.

`Meeting Live` shifts almost all visual priority to a chronological transcript.
The header shows `Translation Live`, language direction, and elapsed time. Transcript
turns use `YOU` / `INCOMING` labels without participant avatars or invented identity.
For both directions, Indonesian user-relevant text has primary visual weight and
English source/output is secondary. Outbound turns retain truthful delivery state.
Listening/Processing/Speaking/Waiting/Catching Up states occupy a stable activity
region; `Stop Voice` is contextual while speaking and `Speak Now` / `Cancel` appear
only when waiting for a conversational gap. Incoming-only degradation uses a light
inline callout; blocking outbound problems use a more prominent inline attention
callout while preserving transcript context. Pause/Resume and Stop Translation stay
visible in a sticky session-control region. Scrolling follows the latest turn only
while the user is at the bottom; manual upward reading freezes auto-follow and shows
a compact new-translation return control.

Ready -> Starting -> Live changes composition without changing to a separate product
page. Narrow windows stack Ready rows and keep the transcript readable; exact final
pixel widths remain a rendered-proof decision.

**Reason**  
Meeting Ready is a decision screen: the user needs confidence that the required
path is safe and one obvious action to begin. Meeting Live is a comprehension and
control screen: the transcript and immediate session safety matter more than setup
configuration. Keeping these compositions simple, text-led, and conventional makes
the application immediately understandable while preserving the approved runtime
semantics and avoiding a dashboard-style or decorative AI interface.

## D-019 — Final Text, History, And Settings Composition

**Decision**  
The remaining core workspaces use familiar desktop/productivity patterns rather than
new interaction metaphors.

`Text` follows the conventional translator model: explicit Indonesian/English
source and target selectors with one swap action, source and editable target panes,
Quality + Tone controls kept secondary, one primary `Translate` action, and quiet
`Copy` / `Save` actions. Wide windows show source/target side by side; narrow windows
stack them. A completed result remains visible when the source changes but is marked
as needing an update. Translation/runtime errors remain inline without clearing the
user's text. A live Meeting may add the global Meeting strip above Text, and Text may
wait for capacity without interrupting the Meeting.

`History` is a chronological retrieval workspace, not a dashboard. It uses
`Recent / Saved` tabs, one normal search field, and compact `All / Meeting / Text`
filters. Meeting rows show title/time/duration/status; Text rows use a useful source
snippet and direction. Meeting History detail reuses the same transcript visual
language as Meeting Live but is read-only and has no live controls. Text History
detail shows source/translation in a simple read-only artifact view. Saved reuses
the same collection/detail surfaces; only ownership actions change (for example,
`Save` versus `Remove from Saved`). Empty states remain text-led and History Off
must not imply existing History was deleted.

`Settings` uses a conventional desktop preference layout with nested sections
`Meeting / History & Privacy / Advanced`. Meeting Settings contains speaking mode,
physical microphone, Meeting Sound, and managed Meeting Microphone rows; scoped
changes report progress/error in the affected row rather than blocking the whole
page. History & Privacy contains the History On/Off toggle, local storage summary,
Saved explanation/access, and Clear History as a clearly separated destructive
action. Advanced contains only setup health and the entry to Diagnostics.
Diagnostics is a nested troubleshooting view: it may inspect technical runtime,
audio, translation, performance, and recent-error information, but it is not the
normal manual control plane for starting/killing workers or forcing implementation
internals.

Shared primitives should stay small and reusable: application/sidebar/header and
global Meeting strip, standard buttons/fields/select/toggle/tabs/search, status and
inline callout patterns, dialogs, transcript turns, History rows, Settings rows, and
simple empty states. Do not create screen-specific interaction systems when these
familiar primitives already satisfy the task.

**Reason**  
The user wants a modern app that remains immediately familiar. Text translation,
recent-history retrieval, and settings already have well-understood interaction
patterns across desktop products. Reusing those patterns lowers learning cost,
keeps behavior predictable, and lets the visual polish come from hierarchy,
spacing, responsiveness, and feedback rather than novelty. Reusing the Meeting
transcript for History detail and the History detail for Saved also reduces both
user-learning cost and unnecessary frontend duplication.

## D-020 — Canonical Committed Meeting Turn Ownership

**Decision**  
The canonical **transient committed Meeting turn** owner is the existing application
Meeting outbound/session boundary in `commands/meeting_session.rs`. Do not create a
frontend transcript accumulator, worker-owned conversation store, Diagnostics/log
source, `runtime_state.rs` conversation body store, or live writes into persistent
History to satisfy the transcript UI.

A turn becomes committed only after all of the following are true:

```text
finalized utterance identity exists
-> final Indonesian ASR transcript exists
-> Realtime English translation is verified complete
-> the same Meeting generation is still authoritative
```

The minimum transient identity/state contract is:

```text
session_id
sequence                 # monotonic within the Meeting session across Resume generations
generation
utterance_id              # generation-local finalized utterance identity
lane = you                # current outbound-only scope
source_text               # final Indonesian transcript
translated_text           # verified-complete English translation
delivery_state
created_unix_ms
updated_unix_ms
```

`(session_id, generation, utterance_id)` is the idempotency key. `sequence` is the
stable chronological order used by the Live transcript and maps directly to the
existing History turn sequence without requiring generation-local utterance IDs to
remain globally unique after Resume.

The initial product-level delivery states are deliberately small:

```text
preparing_voice
speaking
output_complete
output_failed
interrupted
```

A committed turn starts at `preparing_voice`. It may progress to `speaking` and then
`output_complete`, or terminate as `output_failed`. Pause/Stop generation loss marks
any non-terminal turn from the revoked generation `interrupted`. Terminal states are
monotonic: a late/stale callback cannot replace `interrupted`, `output_failed`, or
`output_complete`. `output_complete` means TranslateIT completed the guarded Meeting
Microphone output attempt it can prove; it does not claim a remote participant heard
the audio.

The store is memory-only, bounded, and scoped to the application Meeting `session_id`.
Pause retains already committed turns. Resume keeps the same transient session store
and appends fresh-generation turns. Full Stop/finalization clears the transient body
after any allowed History handoff. If the live bound discards older turns, the read
snapshot must expose that fact rather than pretending the returned list is the full
session transcript.

The product read path is a separate **read-only projection** from the same owner (for
example `get_meeting_committed_turns`) rather than embedding conversation bodies into
`get_meeting_session_status`. Lifecycle status remains lightweight and authoritative;
the frontend renders snapshots and does not persist/merge conversation state as a
second owner.

Persistent History remains owned by `engine/history_store.rs`. Its existing
`HistoryEntry` / `HistoryTurn` schema already matches the required source text,
translation, chronological sequence, lane, delivery state, and timestamp shape.
Meeting History is a later finalization handoff, not the live source. At full Meeting
finalization, current `RuntimeSettings.history_enabled` decides automatic Recent
retention: when enabled, an immutable transient snapshot may be converted into one
Meeting History entry; when disabled, conversation bodies are discarded rather than
persisted. Existing Recent/Saved items are unaffected, and Saved remains an explicit
independent action. Raw audio and generated TTS never become part of this turn store
or normal History.

**Reason**  
`meeting_session.rs` is already the first and only current boundary where finalized
utterance identity, generation authority, final ASR text, verified translation, TTS,
and guarded delivery outcome coexist. Extending that owner gives the Live transcript
a truthful source without adding another lifecycle or conversation authority.
Keeping the store transient preserves navigation-independent Meeting state while
respecting History-off privacy; keeping History as a later immutable handoff preserves
its existing persistence/deletion semantics. Separating the transcript read projection
from lifecycle status avoids repeatedly attaching potentially large conversation
bodies to normal readiness/status polling and keeps the minimum complete solution
bounded.

## D-021 — Global Meeting Cross-View Presentation And Safe Close Ownership

**Decision**  
Global active-Meeting presentation belongs to the existing desktop shell/controller,
not to a new Meeting state manager. The compact cross-view strip reads the canonical
application Meeting session through the existing `runtimeApi` /
`mapProductMeetingState()` path. It is a shell element visible outside the Meeting
workspace while an application Meeting session exists. Initially it presents only the
current product-level Meeting state, a short ID -> EN status, and `Open Meeting`.
Normal Pause/Resume/Stop controls remain on Meeting; contextual `Stop Voice` waits for
a canonical runtime action rather than being simulated in the shell.

Native application close is distinct from minimize/hide. A verified absence of an
application Meeting session permits normal close. If a Meeting session exists, the
close request is prevented and the shell presents `Keep Open` / `Stop & Close`. If
Meeting status cannot be verified, close fails closed so the user control plane
remains available; there is no `Close anyway` path while Meeting output authority may
still exist.

`Stop & Close` reuses the existing canonical Stop path:

```text
runtimeProductFacade.runProductMeetingAction("stop")
-> stop_meeting_translation
-> generation revoke + resource cleanup
-> Meeting History finalization policy
-> transient/session clear
-> returned canonical state confirms no Meeting session
-> native close permitted once
```

Sending a Stop request alone is not sufficient to close. A failed Stop or returned
state that still owns a Meeting session leaves the application open. If the lifecycle
is already `Stopping`, close handling waits for that existing Stop rather than
launching another cleanup path. A one-shot frontend close-permission flag may be used
only as native-window transport state; it is never Meeting lifecycle truth.

For orderly native application-exit paths that still execute Tauri lifecycle hooks,
the native app/window owner may provide one fail-safe that delegates to the same
backend Meeting Stop/finalization owner. It must not show a second prompt, reproduce
the Stop sequence, or become another Meeting state authority. The exact Tauri v2
close-request/application-exit API is an implementation detail that must be verified
from current official Tauri documentation before the Developing patch. Forced process
termination, OS crash, and power loss are not statically guaranteed by this decision.

**Reason**  
Current policy already requires an application-level Meeting that survives normal
navigation/minimize, exposes compact global state outside Meeting, and requires
explicit `Stop & Close` when the application is closed during a live Meeting. The
current shell/controller already owns navigation and normal Meeting action
orchestration, while `meeting_session.rs` already owns safe Stop plus History
finalization. Extending those existing boundaries preserves one lifecycle authority,
prevents the shell/window layer from becoming a second Meeting control plane, and
ensures application close uses the same safety/finalization semantics as an explicit
Stop from the Meeting workspace.

## D-022 — Canonical Incoming Meeting Lane, Shared Event Order, And Self-Output Suppression

**Decision**  
Incoming English -> Indonesian assistance is a separate optional **audio lane** inside
the same application Meeting session, not a second Meeting/session/conversation
runtime. The physical microphone remains owned by `audio/live_capture.rs`. Meeting
Sound output-loopback capture receives one distinct Windows-audio owner under the
existing audio subsystem, while `meeting_session.rs` remains the orchestration and
committed-conversation owner for both `YOU` and `INCOMING` turns.

The existing `audio/finalized_utterance.rs` boundary is reconciled from outbound-only
semantics into one finalized Meeting-speech owner with independent lane VAD state and
one session-wide event sequence. That sequence is allocated when a speech event is
finalized, **before** ASR/translation. The committed-turn store accepts the preassigned
sequence and deduplicates by `(session_id, sequence)`. This refines D-020's outbound-
only sequencing/idempotency rule: once two lanes can process asynchronously, assigning
chronology after translation completion could reorder conversation turns by model
latency instead of speech/event order.

The lane-neutral committed shape becomes conceptually:

```text
session_id
sequence                  # finalized speech/event order
generation: optional      # outbound provenance only
utterance_id
lane: you | incoming
source_text
translated_text
delivery_state: optional  # outbound only
created_unix_ms
updated_unix_ms
```

Outbound retains current generation authority and delivery states. Incoming carries no
voice-delivery claim and commits only after final English ASR plus verified Realtime
English -> Indonesian translation. No incoming TTS or participant identity is created.
History and Live transcript continue consuming the same committed-turn source.

Incoming is session-scoped rather than outbound-generation-scoped. A healthy incoming
capture/consumer may continue while outbound is Paused; Stop invalidates the session
for incoming promotion and stops both audio lanes before the final History snapshot.
The one helper scheduler remains, with waiting priority refined to:

```text
Meeting outbound
> Meeting incoming
> Text
> Diagnostics / preload
```

The scheduler remains non-preemptive for work already executing. Outbound requests keep
generation validation; incoming requests are admitted/promoted only while the same
application Meeting `session_id` remains lane-eligible and not Stopping/ended.

Self-output suppression uses one session-scoped transient atomic gate controlled by
`meeting_session.rs` around the existing guarded outbound TTS route. While the gate is
active, Meeting Sound capture discards samples and resets any in-progress incoming VAD
utterance. The gate clears when the current blocking route playback returns/cancels.
No incoming event is finalized from that interval. This is deliberate fail-closed
suppression: participant speech mixed into Meeting Sound while TranslateIT itself is
speaking may be omitted in the initial implementation rather than risking TranslateIT's
own English TTS being presented as remote speech. Do not add a text-similarity filter,
waveform fingerprint store, acoustic-echo framework, or second suppression service in
this slice.

Incoming failure remains optional/degradable. A missing pinned Meeting Sound endpoint
must not silently fall back; Follow Windows Default keeps default-device semantics.
Incoming pending speech is bounded and favors current comprehension rather than an old
subtitle backlog. Partial incoming subtitles remain optional and are not part of the
initial implementation slice.

**Reason**  
Current source already proves that Meeting Sound selection is an output-endpoint
preference only, while the existing live capture owner is a single physical-microphone
input stream. A separate capture owner is therefore a distinct Windows-audio
responsibility, not duplicate Meeting ownership. Shared event sequencing is required by
PR-048 once both lanes can finish ASR/translation at different speeds. Session-scoped
incoming authority is required by PR-039 because incoming may continue during outbound
Pause. The suppression gate is the minimum deterministic mechanism that satisfies the
must-not-self-transcribe requirement using the current blocking TTS-route boundary,
while preserving outbound priority and avoiding speculative echo-cancellation
infrastructure.
# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product behavior and all normal core-workspace visual compositions are approved; source implementation remains paused for the final First Setup and end-to-end UI consistency check

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/foundation/01-product-overview.md
-> docs/foundation/02-product-requirements.md
-> docs/knowledge/decision-log.md only when reasoning/provenance is needed
-> one relevant source owner only when implementation resumes
```

Do not reconstruct approved product decisions from old chat history when canonical
repository owners already contain them.

## Current Mode

**Plan**.

Source/runtime implementation is intentionally paused until the final First Setup
polish and cross-screen consistency pass are complete. Local/Windows acceptance
remains deferred until the later dedicated local phase.

## Locked Product Scope

```text
Primary       -> Meeting
Secondary     -> Text
Top-level UI  -> Meeting / Text / History / Settings
History       -> Recent / Saved
Settings      -> Meeting / History & Privacy / Advanced
Documents     -> removed from current product scope
Audio Studio  -> advanced/post-core
```

## Locked UI Principle

TranslateIT must be:

```text
Modern
Easy to use
Familiar
```

Use familiar modern Windows desktop patterns, clear text labels, conventional
controls/navigation, one obvious primary action per workspace, restrained surfaces,
progressive disclosure, and quiet responsive feedback. Modernity comes from polish,
not novelty. Avoid futuristic/neon AI showcase treatment, decorative AI orbs,
heavy glassmorphism, oversized dashboard cards, icon-only critical actions,
decorative waveforms, or unnecessary motion.

Durable reasoning: `decision-log.md` D-015 through D-019.

## Approved Core Screen Model

```text
Setup Wizard
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

Meeting/Text runtime conditions remain state variants of their workspace, not
separate pages. Saved remains a History tab. There is no Home/Dashboard, Documents,
top-level Saved, separate General/Translation Settings, top-level Developer, or one
page per runtime state.

## Approved Application Shell / Visual System

- persistent compact sidebar with icon + text labels;
- compact global Meeting Live / critical strip outside Meeting when needed;
- page header + clear action hierarchy + main workspace;
- system-oriented sans-serif typography;
- compact-but-comfortable spacing/density;
- moderate consistent radii, subtle borders/surface differences, restrained shadow;
- one primary accent plus semantic state colors;
- standard recognizable buttons, fields, dropdowns, toggles, search, lists, dialogs;
- short restrained motion that never blocks interaction;
- wide desktop layouts reflow sensibly when narrow; exact final pixel/color values
  wait for rendered proof.

## Approved Meeting Composition

`Meeting Ready` priority:

```text
status/readiness
-> plain-language ID -> EN Voice and EN -> ID Text behavior
-> Your Microphone
-> Incoming Translation / Meeting Sound
-> TranslateIT Meeting Microphone
-> compact Realtime / Tone
-> one dominant Start Translation action
-> subtle meeting-app microphone reminder
```

Incoming-only failure does not disable Start. Required unsafe outbound failure does.
Normal UI does not expose ASR/TTS/worker/CUDA/runtime diagnostics.

`Meeting Live` is transcript-first:

- chronological `YOU` / `INCOMING` turns, no fake participant identity/avatars;
- Indonesian user-relevant text primary; English source/output secondary;
- truthful outbound delivery state;
- stable Listening / Processing / Speaking / Waiting / Catching Up activity region;
- `Stop Voice` only while speaking;
- `Speak Now` / `Cancel` only while waiting for a gap;
- light incoming-only degradation callout;
- stronger unsafe outbound interruption callout while transcript remains visible;
- sticky Pause/Resume + Stop Translation controls;
- auto-follow only while the user stays at the bottom; manual reading freezes it;
- Ready -> Starting -> Live remains one Meeting workspace.

Durable reasoning: D-018.

## Approved Text Composition

- familiar translator mental model rather than AI-editor/dashboard UI;
- explicit Indonesian / English selectors with one swap action;
- source + editable target panes side by side when wide and stacked when narrow;
- `Quality` and `Tone` remain secondary controls;
- one primary `Translate` action; `Copy` and `Save` remain quieter actions;
- completed result stays visible if source changes but is marked as needing update;
- errors/unavailable state remain inline and never clear the user's source text;
- live Meeting may add the global Meeting strip; Text may wait for capacity but must
  not degrade the Meeting.

## Approved History / Saved Composition

- chronological list, not cards/gallery/dashboard;
- `Recent / Saved` tabs;
- normal local search field plus compact `All / Meeting / Text` filters;
- Meeting rows: title, time, duration, truthful completed/interrupted state;
- Text rows: useful source snippet + language direction;
- Meeting detail reuses the Meeting transcript visual language but is read-only;
- Text detail is a simple read-only source/translation artifact;
- Saved reuses the same collection/detail surfaces; ownership actions change rather
  than creating a separate Saved application;
- History Off messaging must not imply existing History was deleted;
- empty states remain simple text-led states.

## Approved Settings Composition

Conventional desktop preferences layout:

```text
Settings
├─ Meeting
├─ History & Privacy
└─ Advanced
    └─ Diagnostics
```

- Meeting: speaking mode, physical microphone, Meeting Sound, managed Meeting
  Microphone; affected-row progress/errors rather than full-page blocking;
- History & Privacy: History On/Off, local storage summary, Saved explanation/access,
  Clear History separated as destructive action;
- Advanced: setup health + Diagnostics entry only;
- Diagnostics is inspect/troubleshoot, not the normal manual runtime control plane.

Durable reasoning: D-019.

## Global / Cross-Feature Rules

- active Meeting is application-level state, never page-lifecycle state;
- navigation to Text/History/Settings never stops/recreates a healthy Meeting;
- one active Meeting session per runtime and no competing independent app instance;
- compact global live indicator outside Meeting;
- unsafe outbound failures surfaced globally; incoming-only degradation remains
  scoped/subtle;
- contextual global `Stop Voice` only while own TTS is speaking;
- Text/History/Settings preserve reasonable in-memory view state;
- Meeting processing has resource priority;
- PTT works across views only for an already-live Meeting;
- minimize keeps Meeting Live; close while Live requires `Stop & Close`;
- capability health is scoped rather than one giant app Ready/Error state.

## Current Source Reality

Earlier source cleanup remains valid, but current `New` source still predates the
approved product/UI direction in multiple areas:

```text
Documents still exists as inherited source surface
Saved is still top-level
Settings hierarchy is stale
Meeting lifecycle/readiness is incomplete
History/Saved semantics are incomplete
global Meeting indicator/single-instance behavior is incomplete
current layout/style is not yet reconciled to the approved modern minimal UI
```

`docs/knowledge/source-ownership.md` remains the semantic source map for later
implementation reconciliation.

## Proof State

**CURRENT-PROJECT VERIFIED** at repository-policy/design level:

- product flows 01–11 are persisted;
- minimal screen inventory and modern/familiar visual system are persisted;
- Meeting Ready/Live composition is persisted in D-018;
- Text, History/Saved, and Settings composition is persisted in D-019;
- source/runtime was not changed by these planning steps.

**LOCAL PROOF REQUIRED** remains deferred for rendered visual quality, responsive
window behavior, Windows runtime, audio/model behavior, persistence, notifications,
and packaging.

## Hold

- remain in Plan until First Setup + end-to-end UI consistency check is approved;
- do not start source implementation/local acceptance yet;
- do not revive Documents/top-level Saved/Home/Dashboard;
- do not replace familiar controls with decorative custom interaction;
- do not freeze exact pixel/color constants without rendered evidence;
- do not invent product behavior from composition examples.

## Next Step

Complete the **final First Setup polish and end-to-end UI consistency check**:

1. finalize the 5-step first-run wizard composition and failure/resume states;
2. verify wording and control hierarchy are consistent between Setup, Meeting,
   Settings, History, and Text;
3. verify every important error/recovery state has one familiar place/action and no
   duplicate control surface;
4. verify responsive/narrow-window behavior does not introduce a second interaction
   model;
5. identify any remaining high-impact design ambiguity.

If no material ambiguity remains after that pass, persist the final Plan state and
transition the next task to **bounded source implementation on branch `New` through
ChatGPT -> GitHub**, still without claiming local/rendered/Windows proof until the
later local acceptance phase.
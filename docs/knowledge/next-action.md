# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product behavior, minimal IA, visual system, and Meeting Ready/Live composition are approved; source implementation remains paused while remaining core screen composition is defined

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

Source/runtime implementation is intentionally paused until the core UI composition
is sufficiently defined. Local/Windows acceptance also remains deferred.

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

The product UI must be:

```text
Modern
Easy to use
Familiar
```

Use familiar modern Windows desktop patterns, clear text labels, conventional
controls/navigation, one obvious primary action per workspace, restrained surfaces,
progressive disclosure, and quiet responsive feedback. Avoid futuristic/neon AI
showcase treatment, decorative AI orbs, heavy glassmorphism, oversized dashboard
cards, icon-only critical actions, or unnecessary motion.

Durable reasoning: `decision-log.md` D-015 through D-018.

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

## Approved Meeting Ready Composition

Priority:

```text
status/readiness
-> plain-language language behavior
-> Your Microphone
-> Incoming Translation / Meeting Sound
-> TranslateIT Meeting Microphone
-> compact Realtime / Tone
-> Start Translation
-> meeting-app microphone reminder
```

Rules:

- one dominant `Start Translation` CTA;
- device/setup actions are visually secondary;
- physical mic and Meeting Sound are familiar information/device rows;
- TranslateIT Meeting Microphone is a managed route, not a generic dropdown;
- incoming-only failure does not disable Start;
- required unsafe outbound failure disables/blocks Start and surfaces `Fix Setup`;
- no ASR/TTS/worker/CUDA/runtime dashboard in normal UI.

## Approved Meeting Live Composition

- chronological transcript is the hero content;
- header shows `Translation Live`, language direction, elapsed time;
- `YOU` / `INCOMING` labels only; no fake participant identity or avatar dependency;
- Indonesian user-relevant text gets primary visual weight; English source/output is
  secondary;
- outbound turns retain truthful delivery state;
- stable activity area for Listening / Processing / Speaking / Waiting / Catching Up;
- `Stop Voice` only while speaking;
- `Speak Now` / `Cancel` only while waiting for a conversational gap;
- incoming-only degradation uses a light inline callout;
- unsafe outbound interruption uses stronger inline attention while transcript stays
  visible;
- Pause/Resume + Stop Translation remain in sticky session controls;
- auto-follow transcript only while user remains at the bottom; scrolling upward
  freezes follow and shows a compact new-translation return control;
- Ready -> Starting -> Live remains one Meeting workspace, not route/page churn.

Durable reasoning: `decision-log.md` D-018.

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

**CURRENT-PROJECT VERIFIED** at repository-policy level:

- product flows 01–11 are persisted;
- minimal screen inventory and modern/familiar visual direction are persisted;
- Meeting Ready and Meeting Live final composition is persisted in D-018;
- source/runtime was not changed by these planning steps.

**LOCAL PROOF REQUIRED** remains deferred for rendered visual quality, responsive
window behavior, Windows runtime, audio/model behavior, persistence, notifications,
and packaging.

## Hold

- remain in Plan while remaining core screen composition is defined;
- do not start source implementation/local acceptance yet;
- do not revive Documents/top-level Saved/Home/Dashboard;
- do not replace familiar controls with decorative custom interaction;
- do not freeze exact pixel/color constants without rendered evidence;
- do not invent product behavior from wireframe examples.

## Next Step

Define final visual composition for the remaining core workspaces in this order:

```text
Text
-> History Collection + History Detail / Saved
-> Settings (Meeting / History & Privacy / Advanced / Diagnostics entry)
-> First Setup polish/check
```

Use the same approved system: modern, familiar, low-learning-cost, text-led,
conventional desktop interaction. After these compositions are approved and
persisted, decide whether any product-design ambiguity remains before transitioning
from Plan to bounded source implementation.
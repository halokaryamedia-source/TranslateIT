# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product behavior, screen inventory, and wireframe direction are approved; source implementation remains paused while the visual UI system is defined

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

Do not reconstruct approved product decisions from old chat history when the
canonical repository owners already contain them.

## Current Mode

**Plan**.

Source/runtime implementation is intentionally paused until the product UI direction
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

The user requires TranslateIT to be:

```text
Modern
Easy to use
Familiar
```

Interpretation:

- familiar modern Windows desktop interaction patterns;
- conventional navigation, controls, labels, scrolling, lists, settings, and dialogs;
- one obvious primary task/action per workspace;
- contemporary polish from typography, spacing, alignment, restrained surfaces,
  subtle borders/depth, consistent radius, accessible contrast, and responsive
  feedback;
- progressive disclosure for technical/secondary information;
- no novelty that increases learning cost;
- no futuristic/neon AI showcase, decorative AI orb, heavy glassmorphism,
  oversized dashboard-card composition, hidden icon-only critical actions, or
  unnecessary motion.

Durable reasoning: `decision-log.md` D-015 and D-016.

## Approved Screen Inventory

First use:

```text
Setup Wizard
├─ Welcome
├─ Microphone
├─ Meeting Sound
├─ Meeting Microphone
└─ Verify / Ready
```

Normal conceptual surfaces:

```text
Meeting
Text
History Collection
History Detail
Settings
Diagnostics (nested Advanced detail)
```

Meeting/Text runtime conditions are state variants of their workspace, not separate
pages. Saved is a History tab, not top-level navigation. Home/Dashboard, Documents,
top-level Saved, separate General/Translation Settings, top-level Developer, and
one-page-per-runtime-state designs are excluded from the initial core UI.

## Approved Wireframe Direction

Normal shell:

```text
App Shell
├─ persistent compact sidebar with icon + text labels
├─ optional compact global Meeting Live / critical strip
├─ page header / action hierarchy
└─ main workspace
```

Workspace direction:

- **Meeting Ready:** straightforward status/device information rows; one dominant
  `Start Translation` CTA; secondary setup/device actions remain visually quieter.
- **Meeting Live:** readable chronological transcript, not novelty chat bubbles;
  Indonesian user-relevant text gets primary visual weight; session controls remain
  sticky; status/recovery stays inline with conversation context.
- **Text:** familiar translator layout; source/target side-by-side when wide, stacked
  when narrow; explicit Translate action; Copy/Save secondary.
- **History:** chronological searchable list; `Recent / Saved` tabs; reusable detail
  surface for Meeting/Text.
- **Settings:** conventional desktop settings pattern with section navigation and
  label/description/control rows instead of card-dashboard composition.
- **First Setup:** focused 5-step wizard outside the normal sidebar shell.
- **Global Meeting state:** compact strip outside Meeting; `Stop Voice` appears only
  contextually while own TTS is speaking; critical outbound interruption may become
  a persistent global alert.

## Current Source Reality

Earlier source cleanup remains valid, but current `New` UI source predates the newly
approved product/UI direction in several areas:

```text
Documents still exists as inherited source surface
Saved is still top-level
Settings hierarchy is stale
Meeting lifecycle/readiness is incomplete
History/Saved semantics are incomplete
global Meeting indicator/single-instance behavior is incomplete
current layout/style is not yet reconciled to the approved minimal modern UI
```

`docs/knowledge/source-ownership.md` remains the semantic source map for later
implementation reconciliation.

## Proof State

**CURRENT-PROJECT VERIFIED** at repository-policy level:

- flows 01–11 are persisted;
- minimal screen inventory is persisted;
- wireframe/component direction is persisted;
- modern + easy + familiar UI principle is persisted in product overview and
  decision log;
- source/runtime was not changed by these planning steps.

**LOCAL PROOF REQUIRED** remains deferred for rendered visual quality, responsive
window behavior, Windows runtime, audio/model behavior, persistence, notifications,
and packaging.

## Hold

- remain in Plan during visual-system definition;
- do not start source implementation/local acceptance yet;
- do not revive Documents/top-level Saved/Home/Dashboard;
- do not replace familiar controls with decorative custom interaction merely for
  uniqueness;
- do not treat wireframe examples as permission to add unapproved product behavior.

## Next Step

Define **Visual Direction & UI System** for the approved wireframe: establish the
visual character, typography hierarchy, spacing/density, sizing, surface/border/
radius treatment, color roles, buttons/inputs/tabs/list/status/error/success states,
transcript visual hierarchy, hover/focus/disabled behavior, motion restraint, and
minimum-window responsive rules. The target is a polished modern desktop app that
still feels immediately familiar and straightforward to a nontechnical user.

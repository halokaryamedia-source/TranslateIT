# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product behavior flows 01–11 plus screen inventory / information architecture are persisted; source implementation remains paused while wireframe-level layout is defined

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session, use only:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/foundation/01-product-overview.md
-> docs/foundation/02-product-requirements.md
-> docs/knowledge/decision-log.md only when reasoning/provenance is needed
-> one relevant current owner/source only when implementation resumes
```

Do not reconstruct approved product decisions from old chat history when the
canonical repository owners already contain them.

## Current Planning Mode

Current mode: **Plan**.

The user intentionally paused source/runtime implementation to finish product
behavior and UI architecture first. Do not silently resume the old frontend
bridge/shared reachability cleanup yet.

The dedicated local/Windows acceptance phase remains deferred until bounded source
work is later completed.

## Locked Product Scope

Primary product:

```text
Meeting
```

Secondary utility:

```text
Text
```

Normal top-level navigation:

```text
Meeting
Text
History
Settings
```

History:

```text
History
├─ Recent
└─ Saved
```

Settings:

```text
Meeting
History & Privacy
Advanced
```

`Saved` remains distinct durable ownership but is not top-level navigation.

**Document Translation is removed from current product scope.** Do not develop or
preserve a Documents product workflow/parser/export/job/history subsystem.

Audio Studio remains advanced/post-core and is not a core-release blocker.

## Primary UI Principle

The user explicitly identified the UI key as:

```text
Simple to use
+
Familiar
```

Interpretation:

- design for a nontechnical Windows desktop user;
- prefer familiar desktop patterns and straightforward labels/actions;
- keep one obvious primary task/action per workspace;
- keep control density low and progressively disclose secondary/technical detail;
- do not create pages merely to represent runtime states;
- do not expose implementation flexibility when the product can choose safely;
- avoid novelty that makes the app harder to learn without adding real value.

Durable reasoning is recorded in `decision-log.md` D-015.

## Persisted Product-Flow Coverage

The approved product behavior covers:

```text
01 First Launch & Guided Setup
02 Pre-Meeting & Start Translation
03 Live Outbound Translation
04 Live Incoming Translation
05 Turn-Taking & Realtime Coordination
06 Failure, Recovery & Long-Session Reliability
07 Stop Translation, Finalization, History & Saved
08 Standalone Text Translation
09 History & Saved Workspace
10 Settings
11 Global Navigation & Cross-Feature Behavior
```

Detailed behavior is owned by `CONTEXT.md` and `docs/foundation/` rather than this
active-task file.

## Locked Screen Inventory / Information Architecture

First use is a focused wizard outside the normal application shell:

```text
First Setup Wizard
├─ Welcome
├─ Microphone
├─ Meeting Sound
├─ Meeting Microphone
└─ Verify / Ready
```

There is no separate language-selection step while Indonesian/English is the only
supported pair.

Initial normal-app conceptual surfaces:

```text
Meeting
Text
History Collection
History Detail
Settings
Diagnostics (nested under Advanced)
```

Rules:

- Meeting is one workspace with state variants rather than separate Ready/Starting/
  Live/Paused/Recovering/Error/Ended pages;
- Text is one workspace with Empty/Editing/Translating/Result/Outdated/Error states;
- History owns `Recent / Saved` tabs plus one detail surface with Meeting/Text
  renderers;
- Saved reuses History detail and remains independent durable storage ownership;
- Settings is one workspace with Meeting / History & Privacy / Advanced sections;
- Diagnostics is a nested Advanced detail, not top-level navigation;
- global Meeting Live indicator, critical banner, contextual Stop Voice, Windows
  notification, and confirmation dialogs are shell/system elements rather than
  product pages;
- Home/Dashboard, Documents, top-level Saved, General Settings, Translation
  Settings, top-level Developer, and dedicated lifecycle error/status pages are
  absent from the initial core UI.

## Flow 11 — Locked Cross-Feature Rules

- an active Meeting session is application-level state, not Meeting-page state;
- navigating to Text, History, or Settings never stops/recreates a healthy active
  Meeting;
- returning to Meeting reconnects to the same authoritative `session_id`/current
  conversation state;
- one active Meeting session is allowed per TranslateIT runtime;
- initial desktop behavior should prevent parallel independent app instances from
  competing for Meeting audio/storage ownership;
- a compact global Meeting Live indicator remains visible outside Meeting;
- materially unsafe outbound failure is surfaced globally; incoming-only
  degradation remains scoped/subtle;
- a contextual global `Stop Voice` may appear only while translated TTS is actively
  speaking; normal Pause/turn controls stay on Meeting;
- Text/History/Settings preserve reasonable in-memory view state across navigation
  but never become Meeting lifecycle owners;
- Meeting processing has resource priority over Text/History work;
- PTT works across app views only for an already-live Meeting and never starts a
  Meeting by itself;
- minimize keeps Meeting Live;
- closing the application while Meeting is Live requires explicit `Stop & Close`;
- critical background/minimized Meeting interruption should attract attention
  without silently stealing focus;
- capability health remains scoped rather than collapsing the whole app into one
  Ready/Error state.

Durable reasoning for this boundary is recorded in `decision-log.md` D-014.

## Current Source Reality

Earlier source-side structural/reachability cleanup still stands. Current HTML
entrypoints remain:

```text
index.html
├─ src/main.ts -> SimpleLauncherController
└─ src/audioStudioEntry.ts -> reachable Audio Studio entry
```

Current source now predates approved product policy in several areas:

```text
Documents still exists as inherited product/source surface
Saved is still top-level in current shell
Settings still reflects older hierarchy
Meeting lifecycle/readiness does not implement the full approved flow
History/Saved semantics remain incomplete
incoming/self-output/turn coordination/recovery contracts remain incomplete
global navigation/live-indicator/single-instance behavior is not yet reconciled
screen structure/layout does not yet reflect the approved minimal IA
```

`docs/knowledge/source-ownership.md` remains the semantic source map for later
implementation reconciliation.

## Proof State

**CURRENT-PROJECT VERIFIED** at repository-policy level:

- product scope/navigation/settings decisions are persisted;
- Document Translation is removed from active product policy;
- Meeting/Text/History/Saved/Settings behavior through Flow 11 is persisted;
- application-level Meeting/navigation behavior is persisted;
- simple/familiar UI principle and minimal screen inventory are persisted in
  `CONTEXT.md`, product overview, and decision log;
- source implementation was not changed by these planning persistence steps.

**LOCAL PROOF REQUIRED** remains deferred for rendered UI, Windows runtime,
microphone/audio/model behavior, self-output suppression, latency, persistence,
single-instance behavior, background notifications, and packaging.

## Hold

- stay in Plan during wireframe/component definition;
- do not revive Document Translation;
- do not create top-level Saved navigation;
- do not create Home/Dashboard or one page per runtime state;
- do not bind Meeting lifecycle to page mount/unmount;
- do not create a second concurrent Meeting/app runtime path;
- do not start local Windows acceptance yet;
- do not resume source cleanup/implementation until the planning sequence explicitly
  advances to Developing;
- do not implement from chat memory when canonical project memory already owns the
  decision.

## Next Step

Define **wireframe-level layout and component hierarchy** for the approved minimal
screen model before final visual styling or source implementation. Establish the
normal application shell, sidebar/navigation, global Meeting state region, content
width/density, header/action hierarchy, Meeting Ready/Live layouts, Text two-pane
workflow, History collection/detail layout, Settings section layout, and minimum
window/responsive behavior. Keep the design simple, familiar, readable, and direct;
avoid decorative or interaction novelty that does not improve the primary task.

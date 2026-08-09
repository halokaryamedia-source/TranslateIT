# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product behavior flows 01–11 are persisted; source implementation remains paused while screen inventory / information architecture is defined

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

The user intentionally paused source/runtime implementation to finish the product
behavior and UI information architecture first. Do not silently resume the old
frontend bridge/shared reachability cleanup yet.

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

## Persisted Product-Flow Coverage

The approved product behavior now covers:

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
```

`docs/knowledge/source-ownership.md` remains the semantic source map for later
implementation reconciliation.

## Proof State

**CURRENT-PROJECT VERIFIED** at repository-policy level:

- product scope/navigation/settings decisions are persisted;
- Document Translation is removed from active product policy;
- Meeting/Text/History/Saved/Settings behavior through Flow 10 is persisted;
- Flow 11 application-level Meeting/navigation behavior is now persisted in
  `CONTEXT.md`, product overview, and decision log;
- source implementation was not changed by this planning persistence step.

**LOCAL PROOF REQUIRED** remains deferred for rendered UI, Windows runtime,
microphone/audio/model behavior, self-output suppression, latency, persistence,
single-instance behavior, background notifications, and packaging.

## Hold

- stay in Plan during information-architecture/design definition;
- do not revive Document Translation;
- do not create top-level Saved navigation;
- do not bind Meeting lifecycle to page mount/unmount;
- do not create a second concurrent Meeting/app runtime path;
- do not start local Windows acceptance yet;
- do not resume source cleanup/implementation until the planning sequence explicitly
  advances to Developing;
- do not implement from chat memory when canonical project memory already owns the
  decision.

## Next Step

Define **Screen Inventory & Information Architecture** before visual styling or
source implementation. Enumerate only the screens/states actually required by the
approved flows, identify which states are variants of the same screen rather than
new pages, define navigation and global-shell regions, remove redundant inherited
screens, and establish the minimum screen/state map that the later UI design and
source reconciliation must implement.

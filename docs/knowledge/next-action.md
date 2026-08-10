# Next Action

Updated: 2026-08-11  
Working branch: `New`  
Status: **Reliable bidirectional translation, Incoming-Failure-Is-Nonblocking Outbound Delivery, persistence-free Meeting Stop, the simple Start -> Live -> Stop lifecycle, and a History-free initial desktop surface are source-aligned at their bounded contracts. Active navigation is Meeting / Text / Settings, normal Settings is Meeting / Advanced, successful Text translation no longer writes History, and active `runtimeApi` no longer exposes History methods. No Rust/TypeScript/static-validator/rendered/Windows runtime proof has been obtained. The next material stale risk is that product readiness still reads inherited Realtime/Quality fields while the worker now reports direction-based ID->EN / EN->ID readiness, and active UI still presents Mode/Tone.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/02-product-requirements.md PR-040 / PR-044 / PR-047 / PR-050 / PR-053 / PR-090..093
-> .agents/skills/development-brief/SKILL.md
-> inspect worker readiness response + runtimeProductFacade + normal Meeting/Text caller/UI mode fields only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust/TypeScript/Python execution, static-validator execution, model files/load,
translation quality, CUDA/CPU latency, Windows audio, suppression effectiveness,
rendered UI, native lifecycle races, and installed operation remain
`LOCAL PROOF REQUIRED`.

# Closed Source Slice — Reliable Bidirectional Translation Core

The one persistent worker routes translation by language direction:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

Translation rejects silent truncation and known incomplete generation. Tone,
previous-turn context, History context, second worker, and cloud fallback remain absent
from model input.

# Closed Source Slice — Incoming Failure Is Nonblocking

Healthy incoming uses the deterministic self-output suppression guard. If that
protection cannot be established:

```text
clear incoming finalized producer
-> stop Meeting Sound best-effort
-> incoming = disabled/degraded
-> reject late incoming promotion
-> required outbound Meeting Microphone delivery continues
```

Optional incoming therefore cannot be the sole reason an otherwise safe outbound TTS
turn fails.

# Closed Source Slice — Meeting Stop Is Persistence-Free

Current Stop owns runtime/transient cleanup only:

```text
revoke output authority
-> cancel route
-> stop physical mic + Meeting Sound
-> cancel helper Meeting work
-> join both consumers
-> clear suppression / finalized sequence / transient turns
-> clear Meeting session
-> stopped
```

`meeting_session.rs` does not import/call History persistence. Safe Stop & Close still
delegates to this canonical Stop owner.

# Closed Source Slice — Pause / Resume Removed

Application Meeting runtime uses one normal lifecycle:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Pause/Resume commands, paused/resuming runtime states, fresh Resume generation,
Tauri registration, frontend bridge/facade actions, normal controls, and presentation
copy were removed. Incoming promotion is eligible only while the same application
Meeting session is Live.

# Closed Source Slice — History / Saved Removed From Initial Surface

## A. Active navigation is now initial-core only

Current active shell exposes:

```text
Meeting
Text
Settings
```

Normal Settings exposes:

```text
Meeting
Advanced
```

Removed from the active shell:

```text
History top-level navigation
History workspace
Recent / Saved tabs
History search/filter/detail controls
History & Privacy settings navigation
```

## B. Active controller no longer owns persistence UI

`SimpleLauncherController.ts` now has only `meeting | text` workspace state and
`meeting | advanced` Settings routing.

Removed from the active controller:

```text
History types/state
list/detail/search rendering
Save / Remove Saved / Clear History actions
History enabled preference flow
History event binding
automatic Text -> Recent History write
```

Successful Text translation now ends with the translated result/staleness check only.
No persistence warning or History call is part of Text success.

## C. Frontend History bridge is disconnected

`runtimeApi.ts` no longer imports History frontend types or exposes:

```text
createTextHistoryEntry
listHistoryEntries
getHistoryEntry
saveHistoryEntry
removeSavedHistoryEntry
clearRecentHistory
```

Backend History/Saved files and Tauri commands may remain for later reconsideration;
they are outside this slice and are not reachable through the active initial frontend.

## D. Static validation definition

`validate_startup_runtime_readiness.mjs` now defines checks that:

- active shell navigation is Meeting / Text / Settings;
- normal Settings contains Meeting / Advanced and no History tab/workspace;
- active controller has no History state/actions or Text persistence handoff;
- active `runtimeApi` exposes no History methods/command calls;
- successful Text translation is independent from persistence;
- existing Meeting translation, nonblocking incoming, Start/Stop lifecycle, transient
  transcript, and safe close contracts remain preserved.

The validator was **not executed** in this channel.

# Known Proof Limits

No claim is made that current TypeScript compiles, the shell renders without layout
regression, normal navigation behaves correctly in Tauri, Text translation executes,
or any Windows/model/audio path works on target hardware. Those remain local proof.

# Next Developing Slice — Direction-Based Product Readiness + Remove Mode/Tone Surface

## Root cause

The translation worker is now direction-based, but inherited product mapping still
expects the old mode split:

```text
worker source truth
translation_id_en
translation_en_id
translation_bidirectional

stale product mapping
translation_realtime
translation_quality
```

The active shell/controller also still shows `Mode: Realtime/Quality` and `Tone: Auto`
even though both are outside the initial product. This mismatch can incorrectly report
Text/Meeting translation unavailable even when the required direction model is ready.

## Goal

Make product readiness and normal Meeting/Text calls follow the same simple translation
contract as the worker:

```text
source language + target language
-> direction readiness
-> translate
```

No normal Mode/Tone concept should remain.

## In scope

1. replace Realtime/Quality product readiness parsing with explicit ID->EN / EN->ID
   readiness from the current worker status response;
2. required Meeting outbound readiness depends on ID->EN only; optional incoming reverse
   readiness remains separate/degradable;
3. Text readiness follows the currently selected ID<->EN direction without a user-facing
   mode selector;
4. remove Mode/Tone presentation and related active controller refs/copy from Meeting/Text;
5. remove stale normal Meeting/Text `mode` request fields when the worker contract does
   not require them;
6. update static validation and canonical docs.

## Out of scope

- changing translation models again;
- adding tone/context prompting;
- deleting every legacy Diagnostics/preload compatibility field in the same slice;
- backend History deletion;
- Audio Studio/custom voice cleanup;
- model packaging or local acceptance.

## Acceptance criteria

1. normal product readiness consumes direction-based worker readiness, not
   `translation_realtime` / `translation_quality`;
2. missing EN->ID reverse model cannot block healthy ID->EN Meeting outbound Start;
3. Text reports readiness for its current language direction and performs translation
   without Mode/Tone product selection;
4. active Meeting/Text UI contains no Mode/Tone presentation;
5. normal Meeting/Text translation calls carry language direction and content only,
   without an inherited mode selecting behavior;
6. no second translation readiness/model owner is introduced.

# Hold

- do not reintroduce Pause/Resume, History/Saved, Tone/Context, or user-facing
  Realtime/Quality modes;
- do not add another translation worker;
- do not use cloud fallback;
- do not change model family in this cleanup slice;
- do not begin local acceptance inside source cleanup.

## Next Step

Implement **Direction-Based Product Readiness + Remove Mode/Tone Surface** across the
worker-status mapping, active Meeting/Text callers, and active shell/controller.

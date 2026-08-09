# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product-flow planning through Settings is persisted; source implementation remains paused until the final cross-feature flow is agreed

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session, use only:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/foundation/01-product-overview.md
-> docs/foundation/02-product-requirements.md
-> one relevant current owner/source only when implementation resumes
```

Do not reconstruct product decisions from old chat history when these canonical
owners already contain the approved state.

## Current Planning Mode

Current mode: **Plan**.

The user intentionally paused source/runtime implementation to complete the product
user-flow model first. Do not silently resume the previously planned frontend
bridge/shared reachability cleanup yet.

The dedicated local/Windows acceptance phase is also still deferred until the
bounded ChatGPT -> GitHub source-development phase is later completed.

## Product Scope Now Locked

Primary product:

```text
Meeting
```

Secondary product utility:

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

History presentation:

```text
History
├─ Recent
└─ Saved
```

Normal Settings:

```text
Meeting
History & Privacy
Advanced
```

`Saved` remains distinct durable ownership but is not top-level navigation.

**Document Translation is removed from current product scope.** Do not develop or
preserve a Documents product workflow/parser/export/job/history subsystem.

Audio Studio remains advanced/post-core and is not a core-release blocker.

## Agreed User-Flow Coverage

The following product flows have been discussed and are now persisted in the
foundation requirements:

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
```

### First use / readiness

- first use guides microphone, Meeting Sound, TranslateIT Meeting Microphone, and
  local translation readiness without engineering/runtime controls;
- returning users open directly to Meeting and receive a quick preflight;
- core outbound determines Meeting readiness;
- incoming English -> Indonesian text is optional/degradable;
- `Start Translation` commits Live only after final required outbound validation;
- failed Start does not create a fake History session.

### Live outbound

- Session Listening primary; PTT `Ctrl+Space` secondary;
- natural/adaptive segmentation; inherited fixed `700 ms`/`12 s` values are not
  product constants;
- partial ASR is preview-only; final/stable utterance is outbound commit boundary;
- capture continues while prior TTS processes/speaks;
- own TTS output is serialized;
- session/generation/utterance identity prevents stale work from re-entering;
- application-side playback is at-most-once; uncertain playback is not blindly
  replayed;
- user-visible delivery wording is truthful (`Output complete`, `Not delivered`,
  interrupted), not `participant heard it`;
- backlog is bounded and surfaced;
- Pause stops outbound voice/pending outbound while incoming may continue;
- current translated voice can be contextually interrupted without ending session.

### Live incoming

- separate Meeting Sound lane from outbound microphone capture;
- English speech -> Indonesian text only initially;
- transient partial subtitles allowed;
- own TranslateIT TTS must not become incoming translation;
- do not invent participant identity or process-specific Zoom/Meet/Teams source;
- incoming may be disabled/unavailable without blocking outbound;
- incoming prioritizes current freshness and degrades before core outbound under
  resource pressure.

### Turn coordination

- ready outbound TTS may briefly wait while meaningful incoming speech is active;
- wait is bounded; use explicit `Speak Now` / `Cancel` rather than indefinite hold
  or automatic meeting-etiquette decisions;
- committed TTS normally finishes unless user or critical failure interrupts it;
- adjacent still-undelivered utterances may form one natural delivery turn while
  retaining individual utterance identity;
- conversation/context order follows speech/turn order, not callback completion.

### Reliability / long session

- failures classify as recoverable, degradable, or blocking/unsafe;
- one recovery/session owner; recovery is bounded;
- explicit newer user action overrides stale automatic recovery;
- Meeting Microphone loss pauses outbound and old queues are never dumped later;
- stale generation callbacks are discarded;
- no silent cloud fallback;
- minimize/hide does not end a healthy Meeting;
- loss of user control must not leave uncontrolled invisible output;
- sleep/hibernate interrupts live translation and does not auto-resume voice;
- long sessions keep memory, queues, context, handles, and temp artifacts bounded;
- Meeting runtime has priority; incoming degrades before core outbound.

### Stop / History / Saved

- `Stop Translation` is a direct safety action, no confirmation required;
- old-session output authority is revoked before normal finalization;
- current/pending voice and captures stop; late callbacks cannot revive output;
- History is incremental/local when enabled and contains only committed Meeting/Text
  artifacts;
- failed Start and zero-meaningful-turn sessions do not create useless History;
- History is automatic when enabled; Saved is explicit durable independent work;
- Clear/delete History never deletes Saved; deleting Saved never deletes History;
- History Off affects future/current retention but does not delete old History;
- History/Saved/search never automatically become model context;
- raw microphone/incoming/TTS audio are temporary by default;
- logs do not contain conversation bodies by default.

### Text

- explicit Translate action; not every keystroke;
- Indonesian <-> English only; Quality default; tone Auto/Formal/Casual;
- older request results cannot overwrite newer intent;
- source edits mark existing result outdated;
- target may be user-edited before Copy/Save;
- very large input is never silently truncated; ask user to shorten/split rather
  than redirecting to removed Documents;
- Text is independent of Meeting audio readiness and Meeting context.

### History / Saved workspace

- one History workspace with `Recent / Saved`;
- Meeting and Text only;
- newest-first Recent, local straightforward search, Meeting/Text filters;
- Meeting History is chronological/read-only and preserves truthful delivery
  status;
- Text History is read-only translation artifact;
- Saved commit is durable before UI says Saved;
- no automatic History expiry/retention scheduler in the initial product;
- no first-class export subsystem is required for History; simple copying is enough
  for the initial product.

### Settings

- normal Settings is `Meeting / History & Privacy / Advanced`;
- no separate General/Translation settings unless a future distinct responsibility
  appears;
- contextual language/tone/mode choices stay in Meeting/Text;
- microphone/Meeting Sound selections are verified before replacing working
  preferences;
- Follow Windows Default and explicit pinned-device intent are distinct;
- TranslateIT Meeting Microphone is a managed product route, not a generic route
  dropdown;
- opening Settings during Live does not stop the session;
- safe explicit device changes may rebind only the affected lane;
- speaking-mode changes apply next session;
- History Off during Live affects retention after the session while transient live
  context may continue as required;
- normal users do not operate Python/helpers/workers/providers/CUDA/VAD/queue/retry/
  model-path/raw-log controls;
- simple preferences auto-save; runtime readiness is revalidated, not persisted as
  permanent truth.

## Current Source Reality

The source-side structural/reachability cleanup completed before this planning phase
still stands. Current HTML entrypoints remain:

```text
index.html
├─ src/main.ts -> SimpleLauncherController
└─ src/audioStudioEntry.ts -> reachable Audio Studio entry
```

However, current source now predates the approved product policy in several areas:

```text
Documents still exists as inherited product/source surface
Saved is still top-level in current shell
Settings still reflects older hierarchy
Meeting lifecycle/readiness does not yet implement the full approved flow
History/Saved semantics remain incomplete
incoming/self-output/turn coordination/recovery contracts remain incomplete
```

`docs/knowledge/source-ownership.md` records these as stale/partial boundaries.

## Proof State

**CURRENT-PROJECT VERIFIED** at repository-policy level:

- product overview/requirements now contain the approved flows through Settings;
- Document Translation is removed from active product policy;
- navigation and Settings target hierarchy are persisted;
- source ownership map now treats old Documents/top-level Saved/settings behavior as
  stale rather than approved current behavior;
- source implementation was not changed by this persistence step.

**LOCAL PROOF REQUIRED** remains deferred for rendered UI, Windows runtime,
microphone/audio/model behavior, self-output suppression, latency, persistence,
and packaging.

## Hold

- stay in Plan until the next user-flow step is complete;
- do not revive Document Translation;
- do not create a top-level Saved workspace;
- do not start local Windows acceptance yet;
- do not resume frontend bridge/shared reachability cleanup until the product-flow
  planning sequence explicitly advances to implementation;
- do not implement from chat memory when foundation requirements already own the
  decision.

## Next Step

Complete **Flow 11 — Global Navigation & Cross-Feature Behavior**: define how a live
Meeting behaves while the user navigates to Text, History, or Settings and back;
how active/critical Meeting state remains visible outside the Meeting page; how
screen state survives navigation; how duplicate Meeting starts are prevented; and
how minimize/close/global recovery interactions behave. Stay in Plan and persist
any resulting durable decisions before entering screen inventory / information
architecture / visual UI design or source implementation.

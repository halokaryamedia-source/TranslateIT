# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: core shell, First Setup including source-side audio-device selection, Settings, Meeting Ready, Text, and Text-backed History/Saved are aligned through ChatGPT -> GitHub

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> relevant foundation/source-ownership owner
-> one affected current source owner + direct contracts only
```

Do not reconstruct approved product decisions from chat history when canonical
repository owners already contain them.

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Static source alignment may continue,
but build/runtime/device/audio/rendered/filesystem/package claims remain
`LOCAL PROOF REQUIRED` until the dedicated local phase.

## Locked Product / UI Baseline

```text
Primary       -> Meeting
Secondary     -> Text
Top-level UI  -> Meeting / Text / History / Settings
History       -> Recent / Saved
Settings      -> Meeting / History & Privacy / Advanced
Documents     -> removed
Audio Studio  -> advanced/post-core
```

UI remains **Modern + Easy to use + Familiar**. Normal users see product concepts,
not helper/model/audio-engineering internals.

## Completed Source-Side Product Slices

### Shell / navigation

- normal app uses `Meeting / Text / History / Settings` only;
- Documents and top-level Saved are removed;
- one normal `SimpleLauncherController -> shell` path remains.

### Settings hierarchy

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

### Meeting Ready

Approved Ready hierarchy is mounted and truthful. Incoming remains explicitly not
connected and `Start Translation` remains disabled until an atomic Meeting lifecycle
exists.

### Text

- familiar source/target panes;
- persisted contextual ID/EN Swap;
- explicit Translate + Ctrl+Enter;
- editable target;
- stale/error states preserve work;
- active attachment translation removed;
- successful Text writes Recent only when History is ON.

### History / Saved / Privacy

Canonical store:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Current UI supports Recent/Saved, Search, All/Meeting/Text filter, Text detail,
independent Save, Remove from Saved, History On/Off, and confirmation-gated Clear
History that never deletes Saved. Legacy chat/transcript stores are not product
History.

### First Setup

First launch is gated through one focused five-step shell:

```text
Welcome
-> Your microphone
-> Meeting sound
-> Meeting microphone
-> Verify / Ready
```

`Set up later` is explicit and persisted. Only setup-flow facts are stored:

```text
meeting_setup_state      -> new | deferred | completed
meeting_setup_checkpoint -> 1..5
```

No permanent Ready flag exists; capability state is revalidated.

### Your microphone / Meeting Sound selection

One shared product selection authority is now used by First Setup and
`Settings -> Meeting`:

```text
runtimeProductFacade
-> runtimeApi
-> native audio-device commands
-> existing RuntimeSettings.audio preference
```

**Microphone source contract:**

- user can choose Windows Default or one explicit native input;
- explicit candidate is checked before preference save;
- failed candidate check/save keeps the previous persisted preference;
- `get_input_status()` checks the configured input rather than always checking the
  Windows default;
- a pinned microphone that disappears blocks live capture instead of silently
  switching to another default microphone;
- Windows Default remains follow-default behavior because no explicit input id is
  pinned.

**Meeting Sound source contract:**

- user can choose Windows Default or one explicit native output;
- candidate/default output configuration is checked before preference save;
- failed candidate check/save keeps the previous preference;
- this verifies only the selected output endpoint/config contract; it does not claim
  incoming Meeting Sound capture/translation is implemented.

Settings does not promote native candidate/config success into full Meeting Ready;
microphone state is re-read through canonical product readiness.

First Setup presents the same selection semantics with familiar selectors and keeps
Meeting Sound optional/degradable because incoming translation is still unavailable.

## Current Source Reality

Important independent gaps remain:

```text
atomic application-level Start Translation / Stop Translation lifecycle is missing
Meeting Live transcript state is not implemented
global cross-view Meeting strip/state and single-instance behavior are incomplete
incoming Meeting Sound lane and self-output suppression are incomplete
turn coordination, bounded recovery, Pause/Resume/Stop finalization remain incomplete
Meeting History write/detail waits for canonical Meeting lifecycle
Text independent Quality default, tone inference, Copy/direct Save remain incomplete
Windows microphone-permission deep-link remains incomplete
legacy unreachable helpers may remain for later bounded cleanup
installer/runtime asset reconciliation remains later
```

Do not combine all remaining work into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** at static-source level:

- new native candidate probes are registered through the current Tauri registry;
- explicit microphone candidate checking and configured-input status share the
  existing native audio owner;
- explicit missing microphone no longer falls back to Windows default in the live
  capture owner;
- Meeting Sound candidate checking uses the native output endpoint/config boundary
  and explicitly does not claim incoming capture;
- `runtimeProductFacade.selectProductAudioDevice()` is the one frontend product
  candidate-check -> commit path;
- failed candidate or settings save returns the previous canonical settings instead
  of committing the candidate;
- First Setup and Meeting Settings use that same product path;
- no second device store/service/shell was created.

**LOCAL PROOF REQUIRED** for actual Rust/TypeScript build execution, native device
enumeration/opening, permission behavior, persistence across restart, real capture,
rendered selectors, Windows default-device changes, and installed-run behavior.

## Hold

- do not treat device enumeration/config discovery as live target-device proof;
- do not silently replace an explicit microphone with another device;
- do not claim Meeting Sound selection means incoming translation works;
- do not persist permanent Ready truth;
- do not enable `Start Translation` by mapping it to legacy capture-only behavior;
- do not invent Meeting History before canonical Meeting lifecycle exists;
- do not revive Documents, attachment translation, top-level Saved, or old Settings;
- do not start local Windows acceptance yet.

## Next Step

Start the next bounded source slice: **establish the canonical application-level
Meeting session lifecycle and atomic `Start Translation` / `Stop Translation`
boundary**. First inspect only the current runtime-session, capture/pipeline, route,
and direct frontend Start/Stop owners. Reuse current Rust/Tauri owners; do not create
a parallel Meeting engine. The first lifecycle slice should establish one active
session/generation authority, transactional required-outbound Start with rollback,
and safe Stop invalidation. Keep incoming translation, turn coordination, full
Meeting Live transcript rendering, and local Windows acceptance outside that first
lifecycle slice unless they are strictly required by the Start/Stop contract.

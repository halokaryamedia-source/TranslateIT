# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: core shell, First Setup/device selection, Settings, Meeting Ready, Text, History/Saved, and the canonical application Meeting session authority are source-aligned through ChatGPT -> GitHub

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
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

### Settings / First Setup / devices

- Settings is `Meeting / History & Privacy / Advanced -> Diagnostics`;
- first launch uses the approved five-step focused Setup shell;
- `Set up later` persists defer intent without marking Meeting Ready;
- microphone and Meeting Sound use one shared candidate-check -> commit path;
- pinned microphone loss does not silently fall back to another device;
- Meeting Sound endpoint checking does not claim incoming translation is implemented.

### Meeting Ready

Approved Ready hierarchy is mounted and truthful. Incoming remains explicitly not
connected. The visible `Start Translation` control is still intentionally disabled;
it is not mapped to legacy microphone-only capture.

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

### Canonical application Meeting session authority

The existing runtime-state owner now carries application session authority:

```text
session_id
generation
authority_active
phase
```

Canonical command owner:

```text
src-tauri/src/commands/meeting_session.rs
```

Registered Tauri commands:

```text
get_meeting_session_status
start_meeting_translation
stop_meeting_translation
```

Current source guarantees:

- one application Meeting session may own Meeting resources at a time;
- a new session receives a monotonically advancing generation;
- duplicate Start cannot create/overwrite another session;
- already-Live duplicate Start is idempotent;
- Start has a dedicated required-outbound preflight rather than reusing developer
  payload/cache readiness;
- Start resource-open/commit failure paths revoke authority before rollback;
- Stop revokes the current generation **before** helper/capture/pipeline/handoff
  cleanup;
- Stop with no session is idempotent;
- clearing runtime session state invalidates prior generation authority;
- legacy capture-only behavior remains distinct and is not promoted into product
  Translation Live.

The Start preflight is intentionally fail-closed on:

```text
meeting_session:continuous_outbound_runtime_not_connected
```

This is deliberate. The current developer handoff/cache pipeline is not a continuous
user-facing Meeting runtime, so source does not claim Translation Live merely because
microphone/model/helper/route prerequisites exist.

## Current Source Reality

Important independent gaps remain:

```text
generation-aware continuous outbound ASR -> Translate -> TTS -> Meeting Microphone execution is not attached to Meeting session authority
normal frontend Start/Stop + Meeting Live transcript state are not connected
global cross-view Meeting strip/state and single-instance behavior are incomplete
incoming Meeting Sound lane and self-output suppression are incomplete
turn coordination, bounded recovery, Pause/Resume semantics remain incomplete
Meeting History write/detail waits for committed Meeting turns
Text independent Quality default, tone inference, Copy/direct Save remain incomplete
Windows microphone-permission deep-link remains incomplete
legacy unreachable helpers may remain for later bounded cleanup
installer/runtime asset reconciliation remains later
```

Do not combine all remaining work into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** at static-source level for the Meeting authority slice:

- `runtime_state.rs` owns session/generation authority instead of a new parallel
  runtime store;
- application Meeting session begin refuses an existing runtime owner;
- generation is advanced for new sessions and invalidated by revoke/clear;
- `meeting_session.rs` performs explicit preflight before resource ownership;
- the preflight checks configured microphone, required models, local provider,
  managed Meeting route, and the continuous outbound-runtime gate;
- the continuous-runtime gate is fail-closed instead of accepting developer
  pipeline payload/cache status as user readiness;
- rollback paths revoke generation authority before stopping/clearing resources;
- Stop revokes authority before cleanup and is idempotent when already stopped;
- all three Meeting lifecycle commands are registered in the current Tauri command
  registry;
- the existing normal frontend remains untouched by the command boundary, so no
  fake Live state was introduced.

**LOCAL PROOF REQUIRED** for Rust build execution, actual Tauri command invocation,
concurrent Start/Stop behavior, native resource rollback, generation behavior under
real asynchronous work, device/audio behavior, and Windows installed-run behavior.

## Hold

- do not enable `Start Translation` while continuous outbound execution is absent;
- do not use developer seeded/payload pipeline readiness as Meeting Start proof;
- do not let pipeline stages ignore Meeting generation once attached;
- do not silently replace an explicit microphone with another device;
- do not claim Meeting Sound selection means incoming translation works;
- do not persist permanent Ready truth;
- do not invent Meeting History before committed Meeting lifecycle data exists;
- do not revive Documents, attachment translation, top-level Saved, or old Settings;
- do not start local Windows acceptance yet.

## Next Step

Start the next bounded source slice: **attach the outbound realtime execution path to
the canonical Meeting `session_id + generation` authority**. Inspect only current
capture boundary, ASR payload decode, translation handoff, TTS handoff, and guarded
Meeting Microphone route dispatch. Every asynchronous stage must carry/check the
application Meeting generation before promoting output. Establish a continuous
outbound loop/source contract sufficient for the Meeting Start preflight to stop
failing closed; only then wire the normal `Start Translation / Stop Translation` UI
and Meeting Live state. Keep incoming Meeting Sound, turn coordination, History
writing, and local Windows acceptance outside this slice unless strictly required by
outbound safety.

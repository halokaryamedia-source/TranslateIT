# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: core shell, Settings hierarchy, Meeting Ready, Text, History/Saved + privacy controls, and First Setup flow are source-aligned through ChatGPT -> GitHub

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/foundation/01-product-overview.md
-> docs/foundation/02-product-requirements.md
-> docs/knowledge/source-ownership.md
-> one relevant current source owner only
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
but rendered/device/runtime/audio/model/filesystem/package claims remain
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

UI target remains **Modern + Easy to use + Familiar**. Normal UI uses product
language rather than helper/model/audio-engineering terminology.

## Completed Source Slices

### 1. Top-level shell / navigation

- active normal sidebar is `Meeting / Text / History / Settings` only;
- Documents and top-level Saved are removed;
- one current normal controller/shell path remains.

### 2. Normal Settings hierarchy

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

Global General/Translation/Audio destinations are no longer active. Diagnostics
stays nested under Advanced.

### 3. Meeting Ready

The active Ready surface follows the approved hierarchy and remains truthful:

```text
readiness
-> Your microphone
-> Incoming translation / Meeting sound
-> TranslateIT Meeting Microphone
-> Realtime / Auto
-> Start Translation boundary
```

Incoming remains explicitly not connected and `Start Translation` remains disabled
until the approved atomic Meeting lifecycle exists.

### 4. Text workspace

- familiar source/target panes;
- contextual persisted ID/EN Swap;
- explicit Translate + Ctrl+Enter;
- editable target;
- stale/error states preserve visible work;
- active file-attachment translation removed;
- canonical translation runtime path preserved.

### 5. Canonical History / Saved persistence

Canonical product History is:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Owned by `engine/history_store.rs` + `commands/history.rs`. It provides Text Recent
creation, Recent/Saved listing + filtering, detail read, independent idempotent
Recent -> Saved copy, Remove from Saved, and Clear Recent without touching Saved.
Legacy chat/transcript stores are not canonical product History.

### 6. History frontend + Text Recent

- canonical History commands are connected through existing `runtimeApi`;
- successful intentional Text translation writes Recent only when
  `history_enabled` is ON;
- History workspace is `Recent / Saved` with local Search and
  `All / Meeting / Text` filters;
- Text detail uses persisted source/target metadata;
- Recent Save and Saved Remove use the same canonical store;
- Meeting entries are not invented before canonical Meeting lifecycle writes exist.

### 7. Settings -> History & Privacy

- `Keep History` persists through `RuntimeSettings.history_enabled`;
- turning History off does not delete existing Recent/Saved;
- failed setting save rolls back rather than presenting false state;
- `Clear History` requires explicit confirmation;
- Clear calls only `runtimeApi.clearRecentHistory()`;
- Saved is not touched;
- successful Clear invalidates Recent UI collection/detail cache only.

### 8. First Setup

The first-use gate is now owned by:

```text
src/main.ts
-> startDesktopWithFirstSetup
   ├─ setup state = new
   │  -> focused First Setup shell
   └─ deferred/completed
      -> existing SimpleLauncherController / normal shell
```

The setup flow is:

```text
1. Welcome
2. Your microphone
3. Meeting sound
4. Meeting microphone
5. Verify / Ready
```

Current source behavior:

- setup uses a focused shell with no normal application sidebar;
- explicit `Set up later` persists defer intent and enters the normal app;
- deferred setup does not block standalone Text merely because Meeting audio is
  incomplete;
- interrupted `new` setup resumes from a stored checkpoint but rechecks microphone
  and Meeting-route capability before trusting the checkpoint;
- only setup-flow facts are persisted:

```text
meeting_setup_state      -> new | deferred | completed
meeting_setup_checkpoint -> 1..5
```

- no permanent `Ready` truth is persisted;
- microphone, Meeting route, local translation, and final Meeting readiness are
  obtained from the existing product readiness facade;
- Your microphone requires current microphone readiness before Continue;
- Meeting sound shows the current preference and truthfully states incoming
  translation is not connected yet;
- Meeting microphone requires current managed-route readiness before Continue;
- Verify / Ready rechecks actual capabilities and only enables `Go to Meeting` when
  current required Meeting readiness is true;
- incoming translation remains optional/unavailable in the wizard rather than being
  represented as a fake PASS;
- entering the normal app after completion/defer still runs the existing normal
  readiness startup path, so setup completion cannot replace runtime revalidation.

The First Setup composition is source-aligned, but actual device choice/change is
still incomplete: the wizard can inspect/check the current microphone and Meeting
Sound preference but does not yet provide candidate -> verify -> commit device
selection.

## Current Source Reality

Important approved gaps remain independently:

```text
verified physical microphone / Meeting Sound selection and commit behavior is incomplete
Meeting History write/detail waits for canonical Meeting lifecycle
global Meeting strip / cross-view live state / single-instance behavior is incomplete
atomic Start Translation and Meeting Live lifecycle are not implemented
incoming lane, turn coordination, recovery, and Stop semantics remain incomplete
Text independent Quality-default ownership, tone inference, Copy/direct Save remain incomplete
legacy unreachable helpers may remain and require bounded reachability cleanup later
installer/runtime asset proof remains later
```

Do not combine all remaining gaps into one broad refactor.

## Proof State

**CURRENT-PROJECT VERIFIED** for the completed First Setup source slice:

- `main.ts` gates first-use startup through one focused setup bootstrap before the
  existing normal controller;
- setup `new/deferred/completed` and checkpoint facts are part of the canonical Rust
  runtime settings schema with backward-compatible serde defaults;
- the frontend RuntimeSettings/default contract mirrors those fields;
- the setup bootstrap uses `runtimeProductFacade` for capability truth and
  `runtimeApi.saveSettings()` for setup facts;
- no persistent `Ready` field or second readiness store was added;
- `Set up later` persists defer intent instead of pretending success;
- normal application ownership remains `SimpleLauncherController -> shell` after
  setup exits.

**LOCAL PROOF REQUIRED** for TypeScript/Rust build execution, actual settings save,
resume behavior across process restart, device/runtime checks, rendered wizard,
keyboard/focus behavior, and Windows installed-run behavior.

## Hold

- do not persist permanent Meeting Ready truth;
- do not turn setup completion into a substitute for launch-time readiness checks;
- do not block Text solely because Meeting setup is deferred;
- do not create a second normal application shell/controller;
- do not pretend incoming translation is available;
- do not enable `Start Translation` by mapping it to capture-only behavior;
- do not invent Meeting History before canonical Meeting lifecycle exists;
- do not revive Documents, top-level Saved, file attachment translation, or old
  Settings hierarchy;
- do not start local Windows acceptance yet;
- do not claim device/rendered/settings persistence success from static source.

## Next Step

Start the next bounded source slice: **implement verified physical microphone and
Meeting Sound selection against the existing RuntimeSettings/audio-device owners**.
Use one candidate -> open/check where current APIs genuinely support it -> commit
preference path, and keep the previous working preference when verification fails.
Expose the same truthful selection behavior in First Setup and `Settings -> Meeting`
without creating a second device store or implementing the incoming translation lane
or atomic Meeting Start/Live lifecycle in the same slice.

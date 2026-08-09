# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: core shell, First Setup/device selection, Settings, Meeting Ready, Text, History/Saved, canonical Meeting session authority, and generation-aware finalized outbound stages are source-aligned through ChatGPT -> GitHub

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

Normal UI remains **Modern + Easy to use + Familiar**. Product surfaces must not
expose helper/model/audio-engineering internals as the normal workflow.

## Completed Source-Side Product Slices

### Shell / Settings / First Setup / devices

- normal app navigation is `Meeting / Text / History / Settings`;
- Settings is `Meeting / History & Privacy / Advanced -> Diagnostics`;
- first launch uses the approved five-step focused Setup shell;
- `Set up later` persists defer intent without marking Meeting Ready;
- microphone and Meeting Sound share one candidate-check -> commit path;
- pinned microphone loss does not silently fall back to another device;
- Meeting Sound endpoint checking does not claim incoming translation works.

### Text / History / Saved / Privacy

- Text uses familiar source/target panes and explicit Translate;
- successful Text writes Recent only while History is ON;
- canonical History store is `UserData/SavedProject/History/{Recent,Saved}`;
- History UI provides Recent/Saved, local Search, Meeting/Text filter, Text detail,
  independent Save, Remove from Saved, History On/Off, and Clear Recent without
  deleting Saved;
- legacy chat/transcript stores are not canonical product History.

### Canonical application Meeting session authority

Existing runtime state owns:

```text
session_id
generation
authority_active
phase
```

Canonical lifecycle commands:

```text
get_meeting_session_status
start_meeting_translation
stop_meeting_translation
```

Current source guarantees one Meeting resource owner per runtime, monotonically
advancing generation authority, duplicate-Start protection, rollback with authority
revoke before cleanup, and Stop that revokes old generation authority before route,
capture, helper, pipeline, handoff, and session cleanup.

### Generation-aware finalized outbound stages

`commands/meeting_session.rs` now contains the product pipeline boundary for an audio
segment that has **already been finalized by the audio owner**:

```text
finalized Indonesian WAV
-> helper `transcribe`
-> generation check
-> helper `translate`
-> generation check
-> helper `synthesize`
-> generation check
-> guarded TranslateIT Meeting Microphone route
```

Important source rules:

- product execution uses the worker's real canonical tasks `transcribe`, `translate`,
  and `synthesize`; developer stub names are not promoted into product runtime;
- every blocking AI stage is followed by an application Meeting generation check
  before its result can advance;
- stale TTS output is deleted rather than routed;
- empty/unsafe ASR result produces no Meeting voice;
- translation/TTS failures produce no Meeting voice;
- route execution checks generation again before provider launch.

### Generation-cancellable Meeting route

`virtual_audio_route_runtime.rs` now provides a Meeting-specific route boundary that:

- requires current authoritative Meeting generation;
- carries generation in the provider payload;
- requires explicit real-execution guard rather than accepting provider dry-run as
  product delivery;
- runs the provider as a cancellable child process;
- polls generation/cancel state during provider execution;
- can terminate the provider after Stop revokes the generation;
- accepts completion only when the provider reports both actual route execution
  attempted and route ready.

This is source-contract alignment only. Actual audio delivery through the selected
Windows virtual route remains `LOCAL PROOF REQUIRED`.

## Current Root Blocker

The current live capture boundary is a **rolling audio window**. Its
`ready_for_target_asr_frame` state means that enough current audio exists for an ASR
frame. It does **not** establish that the user's utterance is final/stable.

Therefore source must not do this:

```text
rolling ASR-ready audio
-> translate
-> TTS
-> meeting output
```

That would permit partial speech to become audible output while the user is still
speaking, contradicting the approved product contract.

No current owner yet produces a one-shot finalized outbound utterance with natural
or adaptive end-of-speech semantics and exactly-once consumption.

For that reason product Start remains intentionally fail-closed on:

```text
meeting_session:finalized_utterance_source_not_connected
meeting_session:continuous_outbound_runtime_not_connected
```

`Start Translation` in the normal frontend must remain disabled until this root
blocker is resolved.

## Current Source Reality

Independent gaps still remain:

```text
finalized outbound utterance producer / exactly-once audio consumption is missing
continuous handoff from that producer into process_authoritative_finalized_outbound_wav is missing
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

**CURRENT-PROJECT VERIFIED** at static-source level for this outbound-stage slice:

- Meeting session/generation authority remains the existing `runtime_state` owner;
- finalized-segment product processing checks authority after each blocking AI stage;
- product worker tasks map to the canonical `transcribe / translate / synthesize`
  handlers rather than developer handoff stubs;
- stale generation cannot legitimately advance from ASR/translation/TTS into a new
  route execution;
- Meeting-specific route execution checks generation before launch and is
  cancellation-signalled while its provider process is running;
- Stop revokes generation before signalling route cancellation and cleaning capture
  or helper resources;
- the current rolling ASR-ready audio boundary is explicitly **not** marked as a
  finalized utterance source;
- product Start therefore remains fail-closed and no fake Translation Live state was
  introduced.

**LOCAL PROOF REQUIRED** for Rust build execution, actual helper responses, process
cancellation, concurrent Stop during ASR/translation/TTS/route execution, native
audio delivery, Windows device behavior, and installed-run behavior.

## Hold

- do not treat rolling `ready_for_target_asr_frame` as final speech;
- do not enable `Start Translation` until finalized utterances are produced safely;
- do not let future audio finalization emit the same utterance more than once;
- do not let any async stage bypass Meeting generation authority;
- do not accept route dry-run as product delivery;
- do not claim Windows Meeting Microphone delivery from static source;
- do not use developer seeded/cache pipeline readiness as product Start proof;
- do not invent Meeting History before committed Meeting turns exist;
- do not revive Documents, attachment translation, top-level Saved, or old Settings;
- do not start local Windows acceptance yet.

## Next Step

Start a new bounded source slice: **implement the canonical finalized outbound
utterance producer in the existing live-audio / VAD boundary**. Use
`development-brief` plus `windows-audio-runtime-development` for that new semantic
boundary. The producer must distinguish partial versus final speech, use natural /
adaptive end-of-speech behavior grounded in the existing runtime VAD profile rather
than fixed inherited chunking as product policy, attach `session_id + generation +
utterance_id`, consume each finalized utterance exactly once, and pass only finalized
audio to `process_authoritative_finalized_outbound_wav`. Keep incoming Meeting
Sound, turn coordination, Meeting History, frontend Live rendering, and local Windows
testing outside that slice unless strictly required for finalization safety.

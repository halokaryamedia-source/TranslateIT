# TranslateIT Workspace Context

Updated: 2026-08-10  
Working branch: `New`  
Recovery baseline: `V1-Advance` at `6fd3485d6b22b9e3f44abc640241532aea61c3c7`

This file stores compact durable project context only. Detailed requirements belong
in `docs/foundation/02-product-requirements.md`; active continuation belongs in
`docs/knowledge/next-action.md`.

## Product Direction

TranslateIT is primarily a **Windows desktop application for real-time voice
translation in online meetings**.

Primary outbound flow:

```text
Indonesian speech
-> Indonesian transcript
-> English translation
-> English TTS
-> TranslateIT Meeting Microphone
-> meeting application
```

Primary inbound assistance:

```text
English meeting speech
-> English transcript
-> Indonesian translated text
-> local user
```

Standalone Indonesian <-> English Text is the bounded secondary workflow.

**Document Translation is removed from current product scope.** Do not revive a
Documents workspace, parser/export/job system, OCR, or document-specific
History/Saved infrastructure from inherited source.

## Product Navigation And UI Principle

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

Normal Settings:

```text
Meeting
History & Privacy
Advanced
    └─ Diagnostics
```

`Saved` remains distinct durable ownership but is not top-level navigation.
`General`, global `Translation`, `Documents`, and top-level `Saved` are not normal
current destinations.

The key UI requirement is **Modern + Easy to use + Familiar** for a nontechnical
Windows desktop user. Prefer conventional desktop patterns, obvious wording/actions,
low control density, restrained surfaces, and progressive disclosure over novelty
or technical flexibility.

Do not create a page for every runtime state. Core conceptual surfaces remain:

```text
First Setup Wizard
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

Meeting lifecycle variants are states of one Meeting workspace. Text lifecycle
variants are states of one Text workspace. Global Meeting indicators/alerts and
confirmation dialogs are shell elements rather than separate products.

## Initial Product Boundary

- Initial supported platform: **Windows**.
- Core runtime: local-first/offline-capable after required assets are installed.
- Initial languages: **Indonesian and English**.
- Core outbound: Indonesian speech -> English voice.
- Core inbound assistance: English speech -> Indonesian text.
- Text: Indonesian <-> English.
- English speech -> Indonesian TTS is not initial scope.
- Additional languages are future scope.
- Cloud assistance may be added later only explicitly; core never silently depends
  on it.

## First Use And Daily Meeting Use

First use is guided setup for `Your microphone`, `Meeting sound`, `TranslateIT
Meeting Microphone`, and local translation readiness. Setup may be intentionally
deferred without pretending Meeting succeeded; Text remains independently usable
when its translation runtime is available.

Returning launch goes directly to Meeting and performs a product-level preflight.
The primary action is `Start Translation`.

Meeting `Ready` is based on required outbound safety. Incoming English -> Indonesian
text is optional/degradable: healthy outbound may start even when incoming is
unavailable.

Start is transactional: `Live` is committed only after required outbound resources
are safely validated/opened. Duplicate Start must not create duplicate sessions.

## Meeting Conversation Behavior

- Primary voice interaction: **Session Listening**.
- Secondary interaction: **Push to Talk**, default `Ctrl+Space`.
- Segmentation uses natural/adaptive speech boundaries, not inherited fixed timing
  constants as product policy.
- Partial outbound ASR is preview-only and never meeting output.
- Final/stable utterance is the outbound translation/TTS commit boundary.
- Capture may continue while earlier output is processing/speaking.
- Own TTS output is serialized.
- Session/generation/utterance identity prevents stale work from re-entering current
  state.
- Outbound delivery is at-most-once by default; uncertain playback is not blindly
  replayed.
- Backlog is bounded and surfaced before stale voice becomes misleading.
- Pause stops new/pending outbound work while incoming may continue.
- Resume creates fresh generation authority.

Incoming is a separate Meeting Sound lane:

```text
Meeting Sound
-> English ASR
-> Indonesian text
```

Incoming may show transient partial subtitles, must suppress TranslateIT's own TTS,
must not invent participant identity, and degrades before core outbound under
resource pressure.

Turn coordination may briefly wait for a natural gap. Waiting is bounded; user
intent such as `Speak Now` / `Cancel` controls the unresolved turn rather than an
indefinite automatic hold.

## Translation Behavior

- Translation is contextual and meaning-preserving, not word-for-word.
- Priority: intended meaning -> factual/entity fidelity -> natural target grammar ->
  appropriate tone -> literal wording when useful.
- Tone modes: `Auto`, `Formal`, `Casual`; `Auto` default.
- Names, numbers, dates, units, URLs, code identifiers, versions, acronyms, and
  technical facts remain accurate.
- Recent committed Meeting context is bounded, local, and session-scoped.
- Persistent History/Saved never automatically becomes model context.

## Runtime Modes And Reliability

- User-facing modes: `Realtime` and `Quality`.
- Meeting default: `Realtime`.
- Text product default: `Quality` (independent runtime ownership is not fully aligned
  in current source yet).
- CUDA is preferred when validated; NVIDIA is not mandatory.
- CPU fallback is required; insufficient Realtime performance reports Degraded.
- No silent cloud fallback.
- Meeting has resource priority; incoming degrades before core outbound.
- Recovery is bounded and owned by one session/recovery authority.
- Missing Meeting Microphone pauses/blocks outbound; old queues are never dumped on
  recovery.
- Minimize does not end a healthy Meeting.
- Sleep/hibernate interrupts live translation and does not auto-resume voice.
- Long sessions keep memory, queues, context, and temporary artifacts bounded.

Official outbound latency metric:

```text
detected utterance end
-> first translated audio begins playing
```

Numeric release threshold is benchmark-derived.

## Global Application Behavior

The active Meeting session is **application-level state**, not page-local state.
Navigation to Text, History, or Settings must not stop/recreate a healthy active
Meeting; returning to Meeting reconnects to the same authoritative session.

Cross-feature rules:

- one active Meeting session per runtime;
- initial desktop behavior should prevent parallel independent app instances from
  owning the same Meeting/audio/storage resources;
- active Meeting state remains visible outside Meeting through a compact global
  indicator;
- materially unsafe outbound failure is surfaced globally; incoming-only degradation
  remains scoped;
- contextual global `Stop Voice` may appear only while own TTS is speaking;
- normal Pause/turn controls remain on Meeting;
- Text/History/Settings preserve reasonable in-memory view state but never own the
  Meeting lifecycle;
- PTT works across views only while a Meeting is already Live and never starts one;
- minimize keeps Meeting Live; close while Live requires explicit Stop & Close;
- capability health is scoped rather than one global `appReady` truth.

## Stop And Finalization

`Stop Translation` is a direct safety action. Once accepted, old-session work loses
authority to create new Meeting Microphone output. Current/pending output and
captures stop, committed conversation follows History policy, temporary state is
cleaned, then the session becomes Ended.

Failed Start that never reached Live and a normally stopped session with zero
meaningful committed turns do not create useless History entries.

## Standalone Text

Text is explicit, not every-keystroke translation:

```text
Type / paste
-> ID <-> EN
-> Auto/Formal/Casual
-> Quality default
-> Translate
-> review/edit
-> Copy or Save
```

Older/late request results cannot overwrite newer intent. Editing source after a
result marks the result outdated. Large input is never silently truncated or
redirected to removed Documents behavior. Text remains independent of Meeting audio
readiness/context.

Current active source already uses familiar source/target panes, explicit Translate,
contextual persisted ID/EN Swap, editable target, and stale/error states. Active
file-attachment translation is removed.

## History, Saved, Privacy And Storage

- History is automatic when enabled, local-only, ON by default, and user-disableable.
- History contains Meeting and Text only.
- Saved is explicit durable user work with independent lifetime.
- Clear/delete History never deletes Saved; removing Saved never deletes History.
- Turning History off affects new/current retention but does not delete existing
  History/Saved.
- History search is local retrieval only, never model context.
- Raw microphone/incoming audio and generated TTS are temporary by default.
- Diagnostic logs contain minimal/redacted operational data and no conversation body
  by default.

Storage roots:

```text
UserData/CacheData/    -> disposable runtime/session data
UserData/LogData/      -> minimal/redacted diagnostics
UserData/SavedProject/ -> persistent user-visible/user-approved data
```

Canonical product History storage is now:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Canonical source owners:

```text
src-tauri/src/engine/history_store.rs
src-tauri/src/commands/history.rs
src/app/bridge/runtimeApi.ts
src/app/shared/historyTypes.ts
SimpleLauncherController + active History workspace
```

Successful Text translations currently write Recent only when `history_enabled` is
ON. The History workspace reads `Recent / Saved`, supports local search and
Meeting/Text filters, shows Text detail, creates an independent Saved copy, and can
remove that Saved copy without deleting Recent. Existing legacy `session_chat.rs`
and `session_store.rs` are not canonical product History.

`Settings -> History & Privacy` now uses the same owners: History On/Off persists via
the existing runtime settings path, turning History off does not delete old data,
and confirmation-gated Clear History invokes only the canonical Clear Recent action.
Saved is not targeted by that action.

Meeting History writes/details wait for the canonical Meeting lifecycle and are not
invented from legacy transcript data.

## Settings Boundary

Meeting Settings owns Session Listening/PTT preference, physical microphone,
Meeting Sound, TranslateIT Meeting Microphone setup/check, and scoped recovery.
New device selections must be verified before replacing working preferences.

History & Privacy owns History On/Off, local storage information, Saved information,
and Clear History. The current active controls are backed by
`RuntimeSettings.history_enabled` and canonical `clearRecentHistory()`; turning
History off does not delete existing data and Clear History does not delete Saved.

Advanced owns setup health and Developer Diagnostics. Normal users do not operate
Python/helper/worker lifecycle, provider/model names, CUDA mode, VAD thresholds,
queue sizes, model paths, or raw logs.

Persist preferences; revalidate readiness on launch instead of persisting permanent
`ready=true` truth.

## Audio Studio

Audio Studio remains **advanced/post-core** and is not an initial core-release
blocker. It may create an authorized local custom English outbound voice profile.
Default local English TTS remains independently available.

## Installer And Distribution

- Windows internal/controlled distribution first.
- One user-facing installer/setup experience.
- Installed builds must not require manual Python, `pip`, environment variables,
  developer scripts, or manual core-model placement.
- Clean supported-Windows proof is required for installer readiness.
- System Python may remain a development fallback only.
- Auto-update is deferred; code signing is reconsidered before broad/public release.

## Current Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Current source/data roots:

```text
Desktop application -> EngineData/Frontend/RustApp
Internal helper      -> EngineData/Backend/LocalWorker/WorkerRuntime
Runtime contracts    -> EngineData/Backend/RuntimeContracts
Runtime assets       -> EngineData/Backend/RuntimeAssets
Runtime/user data    -> UserData
Historical evidence  -> DevelopingData
```

`EngineData` is canonical product implementation. `UserData` is runtime/user data,
not source authority. `DevelopingData` is historical/reference evidence outside
normal production/runtime dependency and discovery contracts.

## Current Implementation Evidence Boundary

Source-side alignment already completed on `New` includes:

- top-level `Meeting / Text / History / Settings` shell;
- `Meeting / History & Privacy / Advanced` normal Settings hierarchy;
- approved truthful Meeting Ready composition;
- familiar Text source/target composition with active attachment workflow removed;
- canonical History/Saved persistence under the approved existing root;
- frontend History bridge, History `Recent / Saved` collection + Text detail, and
  automatic Text Recent writes when History is enabled;
- History & Privacy On/Off and confirmation-gated Clear History controls using the
  same canonical settings/History owners.

Still incomplete source/runtime work includes:

- Meeting History writes/details after canonical Meeting lifecycle exists;
- First Setup / intentional defer;
- global Meeting indicator/cross-view lifecycle/single-instance behavior;
- atomic Start Translation, Meeting Live, incoming lane, turn coordination,
  recovery, and Stop finalization;
- approved tone/context inference and independent Text Quality ownership;
- Text Copy/direct Save behavior;
- verified Meeting device-selection behavior;
- clean installer/runtime asset reconciliation.

Source presence does not prove live target-PC readiness. Do not claim microphone,
ASR/translation/TTS quality, Meeting Microphone delivery, self-output suppression,
latency, settings/filesystem persistence, rendered UI quality, CUDA behavior, Audio
Studio, or installer success without the required local evidence.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable project context.
- `docs/foundation/01-product-overview.md` — product overview/scope hierarchy.
- `docs/foundation/02-product-requirements.md` — detailed approved requirements.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single current continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.

# Next Action

Updated: 2026-08-08
Status: active task snapshot
Working branch: `New`

This note is the single active-task resume point for TranslateIT. New sessions read:

`AGENTS.md` -> `CONTEXT.md` -> this note

Stable facts belong in `CONTEXT.md`; durable approved product/system policy belongs
in `docs/foundation/`; historical material remains recovery evidence until
classified.

## Active Goal

Recover and reconcile TranslateIT into a small current product foundation before
broad development resumes.

## Current Phase

`CONTEXT_RECOVERY_HISTORY_PRIVACY_AND_RETENTION`

Product purpose, platform/locality, language/voice direction, voice
input/segmentation, latency/runtime-mode, acceleration/provider, meeting audio
routing, and translation-quality/tone policy are now recovered and approved. The
next slice must distinguish temporary translation context, persistent History,
explicit Saved sessions, audio retention, and diagnostic logs.

## Completed Product Boundary

```text
PRIMARY
Real-time voice translation for online meetings

SECONDARY
Indonesian <-> English text translation

INITIAL PLATFORM
Windows

CORE RUNTIME
Local-first / offline-capable after assets are installed

OUTBOUND VOICE
Indonesian speech -> English voice

INBOUND ASSISTANCE
English speech -> Indonesian text

PRIMARY VOICE INPUT
Session Listening

SECONDARY VOICE INPUT
Push to Talk / Ctrl+Space

SEGMENTATION
Natural-pause behavior; numeric VAD/silence/segment values are runtime tuning

OFFICIAL VOICE LATENCY
Detected utterance end -> first translated audio begins
Numeric release threshold is benchmark-derived

USER MODES
Realtime / Quality
Meeting voice default -> Realtime
Standalone text default -> Quality

ACCELERATION
CUDA preferred, not required
CPU fallback mandatory
No silent cloud fallback

MODELS / PROVIDERS
Replaceable implementation choices

MEETING OUTPUT
Translated English voice only by default
TranslateIT-managed meeting microphone/audio route
Raw Indonesian microphone excluded from meeting output
Local monitoring optional/off by default
Route missing -> Meeting Voice Setup Needed

TRANSLATION BEHAVIOR
Meaning/context first, not word-by-word
Auto / Formal / Casual; Auto default
Technical/entity fidelity preserved
Recent context bounded/local/session-scoped
```

`docs/foundation/01-product-overview.md` and `CONTEXT.md` are aligned with these
approved boundaries. No inherited application/runtime source has been changed by
context recovery.

## Current Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Current source starts from:

```text
EngineData/Frontend/RustApp
EngineData/Backend/LocalWorker/WorkerRuntime
EngineData/Backend/RuntimeContracts
```

Static/source presence is not live runtime proof.

## History / Privacy Evidence To Reconcile

Inherited V1-Advance requirements wanted History on by default, persistent until
user deletion, searchable, clearable, and disable-able. They also wanted audio
history off by default and user-controllable deletion.

Current source contains multiple storage concepts that must not be conflated:

- `UserData/CacheData` is explicitly disposable runtime/session material;
- `UserData/LogData` owns runtime logs, diagnostics, and validation evidence;
- `UserData/SavedProject` owns user-approved saved work;
- Rust `session_store` can write transcript-session JSON under
  `SavedProject/SavedTranscript`;
- transcript planning can optionally copy source/translated audio into a saved
  transcript session when `copy_audio` is enabled;
- `session_chat` writes chat-session JSON under `SavedProject/Chat`, including for
  newly created/unsaved chat kinds, so current source semantics are not yet cleanly
  aligned with the `SavedProject = user-approved saved work` folder policy;
- current active UI still treats History/Saved as not fully connected rather than
  proving a complete user-facing history workflow;
- the inspected chat/session APIs expose create/list/append/save behavior but do
  not establish a complete user-facing delete/clear/retention control;
- runtime logs have file-size rotation and basic path/email/secret redaction, but
  source presence alone does not establish a final privacy/retention policy.

Translation context approved in the previous slice is **session-scoped model
context**, not automatic permission to persist full conversation history.

## Holds

Until this recovery slice is approved, do not:

- change application/runtime source to implement persistence behavior yet;
- equate active translation context with persistent History;
- persist raw meeting audio by default;
- assume `History on by default` remains correct merely because the old PRD said
  so;
- treat every file under `SavedProject` as intentionally user-saved when current
  source can create chat files automatically;
- retain transcripts/logs indefinitely without an explicit product policy;
- feed persistent History back into translation context automatically;
- claim delete/clear/privacy controls exist from storage structs alone;
- create `02-product-requirements.md` yet.

## Next Step

Recover the **History, Saved-session, privacy, and data-retention product policy**.

Specifically:

1. decide whether normal translation History is persisted automatically, opt-in,
   or session-only by default;
2. distinguish History from explicit Saved sessions/projects;
3. decide what transcript/original/translated text metadata is retained and for
   how long;
4. keep raw microphone audio and generated TTS audio temporary by default unless
   the user explicitly saves audio/replay material;
5. define clear/delete controls and whether History can be disabled;
6. define whether persistent History may ever be reused as translation context
   without explicit user action;
7. define privacy boundaries for runtime logs/diagnostics so they avoid storing
   conversation content unless required for an explicitly enabled diagnostic
   workflow;
8. preserve `CacheData` / `LogData` / `SavedProject` ownership instead of creating
   another storage root without need.

Do **not** change runtime/source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when default persistence, Saved-versus-History semantics,
audio retention, deletion/clear behavior, context reuse, and diagnostic privacy can
be stated as approved product requirements with storage implementation details and
runtime proof kept separate.

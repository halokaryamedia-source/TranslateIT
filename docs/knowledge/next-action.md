# Next Action

Updated: 2026-08-09
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

`CONTEXT_RECOVERY_DOCUMENT_TRANSLATION_SCOPE`

Product purpose, platform/locality, language/voice direction, voice
input/segmentation, latency/runtime modes, acceleration/provider policy, meeting
audio routing, translation behavior/tone, and History/Saved/privacy policy are now
recovered and approved. The next slice must decide the initial document-translation
product boundary.

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

HISTORY / SAVED / PRIVACY
Local History on by default and user-disableable
Saved requires explicit user action
Raw/TTS audio temporary by default
History is never automatic model context
Diagnostics are minimal/redacted by default
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

## Document Translation Evidence To Reconcile

Inherited V1-Advance requirements treated document translation as a secondary
workflow and named initial common formats:

```text
.txt
.md
.docx
.pdf (text-based)
.srt
```

They also expected chunking for larger content and either a translated file or a
translated text result depending on format support, while OCR was deferred.

Current source must be inspected before this is promoted because the active simple
launcher currently behaves more like a text composer with text-like attachments
than a proven document translation/export workflow.

## Holds

Until this recovery slice is approved, do not:

- change application/runtime source to add document processing;
- assume inherited `.docx` or PDF support is implemented merely because the old
  PRD required it;
- add OCR, layout reconstruction, office conversion, or broad file-format support
  without an approved initial product need;
- treat attachment ingestion into the text composer as equivalent to document
  translation;
- create a parallel document engine or cloud document service;
- create `02-product-requirements.md` yet.

## Next Step

Recover the **document translation product scope**.

Specifically:

1. inspect current attachment/document contracts and active UI ingestion behavior;
2. identify formats actually supported by current source and whether content is
   extracted, translated, or merely inserted into the text composer;
3. decide the initial supported document formats;
4. decide whether PDF initial support is text-based extraction only and keep OCR
   out of scope unless explicitly needed;
5. define chunking/context behavior for larger documents without exposing model
   internals;
6. define the expected output per format: translated text, translated file, or
   both where practical;
7. preserve local-first/privacy requirements for document contents.

Do **not** change runtime/source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when initial document formats, extraction/OCR boundary,
chunking semantics, output behavior, and privacy expectations are explicitly
approved with current implementation capability kept separate from product scope.

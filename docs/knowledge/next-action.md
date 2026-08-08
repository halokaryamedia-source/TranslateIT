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
recovered and approved. The active slice is defining the initial
**document-translation product boundary**.

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

## Document Translation Evidence

Inherited V1-Advance requirements treated document translation as a secondary
workflow and named `.txt`, `.md`, `.docx`, text-based `.pdf`, and `.srt`, with OCR
deferred.

Current `New` source is materially narrower:

- `ATTACHMENT_RUNTIME_CONTRACT.json` declares text-only attachment support;
- that contract explicitly marks `.pdf` and `.docx` unsupported until a backend
  parser exists and forbids claiming success for them;
- the contract baseline lists `.txt`, `.md`, `.json`, and `.csv` with a 64 KB
  attachment limit;
- current frontend attachment rules additionally accept text-like `.tsv`, `.log`,
  `.xml`, `.yaml`, `.yml`, `.srt`, and `.vtt`;
- `SimpleLauncherController` reads accepted attachments through browser `file.text()`,
  compacts the text, and places it into the normal text composer;
- current attachment ingestion therefore does **not** preserve document structure,
  run a dedicated document chunking pipeline, or export translated files;
- the active frontend package has no dedicated document parser dependency, and the
  inspected realtime worker dependencies are translation/audio/model-oriented,
  not evidence of a current DOCX/PDF parser.

Important distinction for product recovery:

```text
Quick text attachment
!=
Document translation workflow
```

Structured text formats such as JSON/CSV/YAML/XML may remain useful as quick text
attachments without promising structure-preserving translated-file output.

## Holds

Until this recovery slice is approved, do not:

- change application/runtime source to add document processing;
- claim current `.docx` or PDF support;
- add OCR, layout reconstruction, office conversion, or broad file-format support
  without an approved initial product need;
- treat composer attachment ingestion as document translation;
- promise structure-preserving translation for JSON/CSV/YAML/XML merely because
  the frontend can read them as text;
- create a parallel document engine or cloud document service;
- create `02-product-requirements.md` yet.

## Next Decision

Approve the initial **document translation scope**:

1. which human-document formats are first-class (`.txt`, `.md`, `.docx`,
   text-based PDF, `.srt`/`.vtt`);
2. whether scanned/image PDF and OCR remain deferred;
3. which formats require same-format translated export versus translated-text
   output only;
4. how much structure must be preserved for DOCX/subtitles without promising exact
   visual layout reconstruction;
5. semantic chunking/context behavior for larger documents;
6. local temporary extraction and explicit save/export behavior;
7. whether document History stores job metadata rather than full document content
   by default.

Do **not** change runtime/source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when initial document formats, extraction/OCR boundary,
chunking semantics, output behavior, structure-preservation expectations, and
privacy/retention behavior are explicitly approved with current implementation
capability kept separate from product scope.

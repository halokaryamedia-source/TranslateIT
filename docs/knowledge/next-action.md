# Next Action

Updated: 2026-08-09
Status: active task snapshot
Working branch: `New`

This note is the single active-task resume point for TranslateIT. New sessions read:

`AGENTS.md` -> `CONTEXT.md` -> this note

Stable facts belong in `CONTEXT.md`; durable approved product/system policy belongs
in `docs/foundation/`; inherited material remains recovery evidence until
classified.

## Active Goal

Recover and reconcile TranslateIT into a small current product foundation before
broad development resumes.

## Current Phase

`CONTEXT_RECOVERY_INSTALLER_PACKAGING_DISTRIBUTION`

Product purpose, platform/locality, language/voice direction, voice
input/segmentation, latency/runtime modes, acceleration/provider policy, meeting
audio routing, translation behavior/tone, History/Saved/privacy, Document
Translation, and Audio Studio scope are now recovered and approved.

The active slice is defining the initial Windows installer/package/distribution
boundary and what must actually be bundled or proven for an installable TranslateIT
build.

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

VOICE INPUT
Session Listening primary
Push to Talk / Ctrl+Space secondary

SEGMENTATION
Natural-pause behavior
Numeric VAD/silence/segment values are runtime tuning

LATENCY
Detected utterance end -> first translated audio begins
Numeric release threshold is benchmark-derived

RUNTIME MODES
Meeting voice -> Realtime
Standalone text/document -> Quality

ACCELERATION
CUDA preferred, not required
CPU fallback mandatory
No silent cloud fallback

MEETING OUTPUT
Translated English voice only by default
TranslateIT-managed meeting microphone/audio route
Raw Indonesian microphone excluded from meeting output
Local monitoring optional/off by default

TRANSLATION
Meaning/context first, not word-by-word
Auto / Formal / Casual; Auto default
Bounded local/session context

HISTORY / PRIVACY
Local History on by default and user-disableable
Saved is explicit
Raw/TTS audio temporary by default
Diagnostics minimal/redacted by default

DOCUMENT TRANSLATION
TXT / MD / DOCX / text-based PDF / SRT / VTT
OCR deferred
Semantic chunking; Quality default

AUDIO STUDIO
Part of TranslateIT but advanced/post-core
Not an initial core-release blocker
Purpose: create a local custom English voice for outbound translated TTS
Import + Guided Recording
Quality/readiness-gated rather than fixed sample-minute tiers
Voice authorization required
Local storage + user deletion required
Default local English TTS remains available independently
Custom profile failure -> visible fallback to Default Voice
Broadcast/emotion/style/multilingual/dialogue/long-form studio surfaces are not
initial scope
```

The Audio Studio decision supersedes inherited fixed 1/30/180-minute profile tiers,
`marcel` as product identity, and advanced studio controls as current requirements.
Current Audio Studio source remains metadata-oriented/provider-blocked and does not
prove guided capture, profile creation, generated voice quality, or streaming.

No inherited application/runtime source has been changed by context recovery.

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

## Packaging Evidence To Reconcile

Current packaging evidence is incomplete:

- Tauri config enables Windows `nsis` bundling for product `TranslateIT`;
- current package preflight only checks source/config readiness and intentionally
  prevents exposing a full Tauri build through npm scripts during the GitHub-only
  source/CI phase;
- current `tauri.conf.json` does not declare bundled runtime resources/sidecars for
  `EngineData`, Python, model assets, or a virtual-audio provider;
- current path discovery expects an `EngineData` + `UserData` runtime root near the
  working directory/executable and explicitly warns when those markers are absent;
- helper startup resolves the Python worker under
  `EngineData/Backend/LocalWorker/WorkerRuntime` and currently searches for an
  environment override, worker `.venv`, system Python, or Windows `py` launcher;
- therefore an NSIS shell being configured is not proof that a fresh installed PC
  receives a self-contained working local runtime;
- inherited V1-Advance requirements wanted a single large installer containing
  required models/runtime components and named the target `TranslateIT.setup.exe`,
  with internal distribution first, no auto-update requirement, and no signing
  requirement for the internal build.

## Holds

Until this slice is approved, do not:

- change packaging/runtime source;
- claim the current NSIS config produces a complete working installer;
- require users to separately install Python/models/dependencies for the intended
  normal-user product unless explicitly approved;
- freeze the exact inherited installer filename as product identity without need;
- add auto-update, code-signing infrastructure, cloud model download, or complex
  installer orchestration merely because they may be useful later;
- package `DevelopingData` as runtime content;
- treat model/runtime presence in the repository as installed-app proof;
- create `02-product-requirements.md` yet.

## Next Decision

Recover the **installer, packaging, and distribution product policy**:

1. decide whether the initial normal-user/internal installer should be
   self-contained for the required core runtime after installation;
2. decide which runtime components must be bundled versus installed/configured as
   explicit prerequisites;
3. decide whether required core models ship in the installer/package or may be
   obtained through a separate explicit setup step;
4. define how the TranslateIT meeting microphone/virtual-audio provider is handled
   during setup without freezing a specific provider brand;
5. confirm internal distribution priority and whether auto-update/signing remain
   deferred for the initial internal target;
6. decide whether `TranslateIT.setup.exe` is a required filename or only an old
   packaging convention;
7. define installer readiness proof: clean Windows install, app launch, local data
   path creation, helper/model discovery, text translation, and relevant voice/audio
   readiness checks on supported target hardware.

Do **not** change runtime/source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when bundling responsibility, model/runtime setup,
virtual-audio setup, internal distribution, update/signing boundary, naming, and
clean-machine installer proof can be stated as approved product requirements with
current NSIS/source configuration kept separate from actual install readiness.

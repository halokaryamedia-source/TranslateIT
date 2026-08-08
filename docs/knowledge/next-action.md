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

Finish the last major product-recovery decision, then consolidate the recovered
product boundary into canonical requirements before broad development resumes.

## Current Phase

`CONTEXT_RECOVERY_UI_DIAGNOSTICS_BOUNDARY`

The installer/packaging/distribution policy was approved by the user on 2026-08-09.
To avoid repeated full-file documentation churn, that newly approved policy is
recorded in this active resume point and will be consolidated into `CONTEXT.md` and
foundation together with the final UI/diagnostics decision.

## Completed Product Boundary

```text
PRIMARY
Real-time voice translation for online meetings

SECONDARY
Indonesian <-> English text translation

INITIAL PLATFORM
Windows

CORE RUNTIME
Local-first / offline-capable after required assets are installed

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
Local custom English voice for outbound translated TTS
Import + Guided Recording
Voice authorization required
Quality/readiness-gated, not fixed sample-minute tiers
Default local English TTS remains independent fallback
Advanced broadcast/emotion/style/multilingual/dialogue/long-form studio is deferred

INSTALLER / DISTRIBUTION
Windows internal/controlled distribution first
One normal-user setup experience
Self-contained core runtime from the user's point of view
No manual Python/pip/model/env-var setup
Package provides desktop app, helper runtime/dependencies, core ASR/translation
assets, default local English TTS, and meeting-audio-route setup/support
Model binaries are release-build inputs, not required in Git
System Python is development fallback only, not production dependency
Core runtime is offline-capable after installation
Fresh install does not package developer UserData or DevelopingData
Auto-update deferred
Code signing is not an internal-release blocker; revisit before broad distribution
Installer filename is a build convention, not product identity
Installer readiness requires clean-Windows install/runtime proof
```

Audio Studio and installer decisions are approved product intent. Their current
source/runtime implementations remain separate evidence questions.

## Packaging Evidence Boundary

Current source only proves packaging preparation:

- Tauri targets Windows NSIS;
- current Tauri bundle config does not yet declare the complete Python/helper/model/
  audio-route release resources;
- package preflight intentionally does not perform a full installer build;
- current helper can still discover system Python and therefore is not yet proof of
  a self-contained installed runtime;
- runtime models/Piper/.venv are intentionally excluded from Git and must enter the
  release through the build/package input process;
- current path discovery still assumes an `EngineData` + `UserData` runtime root.

Therefore installer completeness remains `LOCAL PROOF REQUIRED` until a clean
Windows package is actually installed and exercised.

## Current UI / Diagnostics Evidence To Reconcile

Current active UI mixes product-level and developer-level controls:

- Settings directly exposes a `Developer` tab to normal navigation;
- the home Engine Status card directly exposes `Start Helper`, `Check Worker`,
  `Check Mic`, and `Diagnostics`;
- `Local data` routes directly to Developer settings;
- General Settings exposes runtime/GPU status;
- Audio Settings includes useful normal controls but also explanatory implementation
  language about helper/model/provider pipeline and planned DSP work;
- Translate Settings still labels the realtime mode `Fast` even though approved
  product terminology is `Realtime`;
- Developer Settings intentionally contains low-level helper controls, preload/
  smoke-test actions, capture dispatch controls, hardware status, pipeline state,
  logs, architecture status, model/provider evidence, and validation commands;
- `runtimeProductFacade` already maps low-level runtime state to useful product
  concepts such as Ready, Text ready, Setup needed, Voice ready, Models ready,
  microphone readiness, and next action;
- some normal-user notices still surface raw worker/blocker text rather than a
  grouped product-level problem and recovery action.

The current source therefore already has a useful product-readiness abstraction,
but the active UI still leaks engineering operation into normal product surfaces.

## Holds

Until the UI/diagnostics boundary is approved, do not:

- change application/runtime source;
- perform a visual redesign;
- expose model IDs, Python/helper lifecycle, pipeline smoke/preload controls,
  internal contracts, raw logs, CUDA compute details, or provider internals to
  normal users;
- remove Developer Diagnostics entirely; it remains required for troubleshooting;
- make normal product recovery depend on users manually operating helper/worker
  controls when the app can own that workflow;
- create `02-product-requirements.md` before this final product-boundary decision is
  approved.

## Next Decision

Recover the **normal-user UI versus Developer Diagnostics product boundary**.

Specifically:

1. decide which primary navigation/workflows normal users see;
2. keep normal settings focused on language, tone/mode, audio devices, meeting
   route, history/privacy, appearance, and product-level readiness;
3. decide whether Developer Diagnostics is hidden behind an Advanced/Developer
   entry rather than a permanent top-level Settings tab;
4. replace normal `Start Helper` / `Check Worker` style operations with product
   actions such as automatic setup/repair, Retry, Fix Setup, or Open Diagnostics;
5. define normal readiness states and error grouping without leaking raw blocker
   strings;
6. keep exact runtime/model/provider/GPU/pipeline/log/contract evidence available
   inside Developer Diagnostics;
7. preserve one explicit path from a user-facing setup failure to diagnostics when
   automatic/product-level recovery is insufficient.

Do **not** change runtime/source during this recovery decision.

## Completion Boundary For This Step

This slice is complete when normal navigation, normal Settings, readiness/error
presentation, automatic/product-level recovery actions, and hidden Developer
Diagnostics can be stated as approved product requirements.

After approval:

1. consolidate Audio Studio + installer + UI decisions into `CONTEXT.md` and
   `docs/foundation/01-product-overview.md`;
2. create `docs/foundation/02-product-requirements.md` as the canonical detailed
   product requirement owner;
3. advance `next-action.md` out of broad product context recovery and into bounded
   architecture/source-ownership reconciliation before implementation.

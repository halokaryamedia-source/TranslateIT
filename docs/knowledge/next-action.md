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

`CONTEXT_RECOVERY_MEETING_AUDIO_ROUTING`

Product purpose, platform/locality, language/voice direction, voice
input/segmentation, latency/runtime-mode, and acceleration/provider policy are now
recovered and approved. The next slice must define how translated voice reaches a
meeting application and how the original microphone/local monitoring should behave.

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
Normal user sees capability/readiness, not internal provider IDs
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

## Meeting Audio Routing Evidence To Reconcile

Inherited V1-Advance requirements expected translated English voice to reach the
meeting through a built-in virtual microphone. They also specified muting the
original microphone and monitoring translated output locally at a fixed volume.

Current repository source contains virtual-mic/virtual-audio-route command and
contract work, but those areas must be checked against current runtime state before
being promoted to current policy. The inherited numeric monitoring level and exact
mute/routing behavior have not yet been reapproved.

The approved product requirement already implies one important outcome:
participants in the online meeting must receive the translated English voice for
the outbound workflow. How TranslateIT owns/selects the meeting input device and
how much original/local audio is heard still requires explicit recovery.

## Holds

Until this recovery slice is approved, do not:

- change application/runtime source to match recovered policy yet;
- assume a particular third-party virtual-audio driver is permanent product
  identity;
- claim built-in virtual microphone readiness from contract/source presence;
- assume original microphone mute behavior without reconciling user safety/control;
- freeze inherited `50%` local monitoring as a product constant;
- mix original Indonesian microphone audio into meeting output unless explicitly
  approved;
- claim Zoom/Meet/Teams integration works without target-PC proof;
- create `02-product-requirements.md` yet.

## Next Step

Recover the **meeting audio routing, virtual microphone, original-mic, and local
monitoring policy**.

Specifically:

1. inspect current virtual microphone / virtual audio route implementation and
   runtime contracts;
2. identify whether current source assumes an internal/bundled route, an external
   virtual device, or only a guarded placeholder;
3. decide the required meeting-app experience for translated English output;
4. decide whether original Indonesian mic audio should be muted/excluded from the
   meeting by default while translation is active;
5. decide whether local monitoring is required, optional, or off by default and
   keep volume numeric values as user/runtime settings unless there is a strong
   fixed product reason;
6. define failure behavior when the virtual meeting route is not available.

Do **not** change runtime/source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when the outbound meeting audio destination, virtual-device
product requirement, original-mic mixing/muting rule, local monitoring behavior,
and unavailable-route fallback are explicitly approved with target-PC proof
requirements separated from static source evidence.

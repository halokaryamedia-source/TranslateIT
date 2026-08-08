---
name: windows-audio-runtime-development
description: TranslateIT specialist for the Windows audio runtime boundary: physical microphone discovery/capture, Session Listening/PTT capture mechanics, VAD/speech segmentation, audio format/buffering, Windows input/output device lifecycle, local monitoring, virtual meeting audio route, TranslateIT Meeting Microphone delivery, audio capability truth, and audio-side latency. Do not use for AI inference, desktop presentation, or packaging delivery.
---

# Windows Audio Runtime Development

Use after `development-brief` proves that the current acceptance boundary is
Windows audio acquisition, segmentation, device lifecycle, or delivery.

## Owns

- physical microphone discovery/selection/capture;
- Session Listening and Push-to-Talk capture mechanics;
- VAD, silence detection, speech start/end, and segmentation mechanics;
- PCM/audio buffering and required format compatibility;
- Windows input/output device lifecycle;
- optional local TTS monitoring delivery;
- virtual audio endpoint discovery/configuration/use;
- `TranslateIT Meeting Microphone` delivery;
- audio capability/error truth and audio-side latency stages.

## Does Not Own

- ASR, translation, TTS inference, model/provider loading, CUDA/CPU execution;
- desktop navigation/readiness presentation or user-facing recovery copy;
- installer/package delivery of drivers/providers/runtime assets;
- History/Saved persistence semantics;
- generic Audio Studio model/profile generation.

## Core Boundary

```text
Physical microphone
-> Windows audio runtime
-> finalized speech segment
-> Local AI runtime
-> translated TTS audio
-> Windows audio runtime
-> TranslateIT Meeting Microphone
-> meeting application
```

Audio captures/segments/delivers. AI interprets/transforms.

## Domain Rules

- Session Listening means one capture session stays active until Stop, while
  natural/adaptive speech boundaries produce finalized segments continuously.
- PTT and Session Listening share canonical capture ownership; do not run parallel
  competing microphone pipelines.
- VAD/silence/buffering mechanics belong here. Inference batching, context, ASR,
  translation, and TTS belong to the AI runtime.
- Historical tuning values such as fixed silence/max-duration numbers are tuning
  evidence, not permanent product law.
- Physical microphone remains available for TranslateIT capture while the meeting
  application uses the TranslateIT-managed virtual microphone. Do not globally
  mute the Windows microphone without a new explicit requirement.
- Product identity is `TranslateIT Meeting Microphone`; provider/driver/device
  implementation names are replaceable details.
- Device discovery does not prove route success. Speaker output does not prove
  meeting-route output. Route source exists does not prove target-app delivery.
- If the meeting route is missing, report a meaningful route/setup state. Do not
  silently fall back to raw microphone, speaker, cloud, or another system mic.
- Local monitoring is a separate optional output path and is OFF by default per
  current product policy; it is not a substitute for meeting delivery.
- Keep audio-format conversion/resampling at the relevant audio boundary and only
  as required by actual ASR/TTS/endpoint contracts.
- Lifecycle must open/use/stop/release devices cleanly; avoid duplicate sessions,
  locked microphones, dangling handles, or duplicated playback.
- Initial meeting integration is standard Windows microphone-device selection. Do
  not add Zoom/Meet/Teams-specific plugins/hacks without a proved compatibility
  problem.
- Raw audio remains temporary by default; debugging convenience does not justify
  permanent recording retention.

## Boundary Examples

If device enumeration misses the physical mic, this specialist owns it. If audio
correctly reports `microphone_missing` but the desktop shows `Ready`, use
`desktop-runtime-development`.

If a speech segment is never finalized, this specialist owns the VAD/capture
problem. If a valid segment exists but ASR never handles it, use
`local-ai-runtime-development`.

If a required audio provider is not delivered by the installer, use
`release-packaging-development`. If it is installed but the app selects/configures
the wrong endpoint, this specialist owns it.

## Procedure

1. Ground the audio behavior from the development brief.
2. Identify the exact boundary: capture, segmentation, device, monitoring, or
   meeting route.
3. Inspect the existing audio owner and direct device/runtime contracts.
4. Separate audio mechanics from AI inference and desktop presentation.
5. Establish required endpoint state and failure semantics.
6. Reuse one canonical capture/route path.
7. Make the smallest complete audio change.
8. Run the smallest target-environment proof that can falsify the claim.
9. Return to the development-brief acceptance gate.

## Proof

GitHub/static proof can establish capture lifecycle wiring, device selection,
route configuration, format contracts, failure mapping, and ownership separation.
Microphone capture, VAD behavior, playback, virtual-route operation, and meeting-
application delivery require target Windows proof when those are the claims.

## Anti-Slop Boundary

Do not let the audio layer spawn its own AI pipeline; keep parallel capture
implementations; add silent raw-mic/speaker fallback; hardcode provider names as
product policy; globally mute the mic without requirement; promote inherited VAD
constants into permanent policy; mark routes Ready from device-name discovery
alone; or claim full product latency from audio-only timings.

# Voice Capture Validation

## Branch
`Dev-Pack`

## Problem

The microphone button used to fail with a raw blocker message because helper/provider readiness was not being prepared automatically.

## Root Cause

- The UI flow went directly to `startCapture()`.
- `start_capture()` required provider readiness first.
- The helper started in `not_started` state and no automatic recovery flow was attached to mic usage.

## Current Flow

1. Check microphone device.
2. Check helper bridge status.
3. Auto-start helper if it is stopped or not started.
4. Poll worker/helper readiness.
5. Start capture only when provider readiness is available.
6. If models are missing, show an explicit next action instead of a raw blocker.

## User Actions

- `Check Microphone`
- `Start Helper`
- `Check Worker Status`
- `Open Developer Diagnostics`

## Status Meanings

- `microphone_ready`: a usable input device was detected.
- `helper_ready`: the helper bridge reached ready state.
- `provider_ready`: ASR, translation, and TTS are ready enough for capture.
- `model_missing`: one or more required models are not installed.
- `CUDA unavailable`: GPU is not ready; CPU fallback may still be available.

## Validation Commands

- `npm.cmd run validate:voice-capture`
- `npm.cmd run validate:auto`
- `npm.cmd run setup:worker`
- `npm.cmd run smoke:worker`
- `npm.cmd run smoke:worker:quality`

## Result

- The mic UX no longer stops at the old raw blocker.
- Real voice capture still depends on the required model inventory being installed.


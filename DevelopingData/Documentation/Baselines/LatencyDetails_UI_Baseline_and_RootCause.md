# Latency Details UI Baseline and Root Cause

## Scope
This note applies only to `Experimental` UI wiring for the Latency Details badge and modal.
Do not use it to change runtime engine behavior, TTS, ASR, translation quality, or playback logic.

## Stable rule
The latency badge must remain a simple, single-click entry point to the modal.
Use one click path only. Do not bind the same open action to both the badge and the surrounding top row.

## Current regression pattern
The duplicate-modal symptom happened when the badge open handler was connected to more than one widget in the same transcript card.

One click then behaved like two opens:
- the first modal instance closed normally
- the second instance was still alive underneath it
- the user had to press close again to dismiss the remaining copy

The fix is to keep the open action bound only to the badge, not the surrounding header row.

## What caused the regression
The modal started misbehaving after the click path was widened from the V2-style simple badge click into a multi-binding path.

The two main failure modes were:
1. The dialog constructor could crash at runtime even when compile checks passed. One example was a latency field being read before it had been defined.
2. The badge click could be wired to more than one widget in the same card, which could open more than one modal instance from one user click. That made the dialog appear to reopen or require a second close.

## Why compile checks were not enough
`compileall` only verifies syntax.
It does not catch:
- missing runtime values
- duplicate modal triggers
- event propagation problems
- constructor ordering bugs

## Safe behavior to preserve
- Keep the badge click path simple and direct.
- Keep the surrounding card visual-only unless there is a confirmed, separate interaction requirement.
- Keep the modal constructor tolerant of missing breakdown values.
- Keep the close button as a normal modal close action.
- If the modal is already open, reuse it instead of creating another copy.

## Breakdown mapping guidance
This note does not change the engine. It only explains how the UI should present the breakdown:
- Audio Verify: Audio Process + Finalize
- STT: Transcribe + Finalize
- Translate: Translate only
- TTS: Voice Generate + Finalize

Mapping rule:
- Keep the four visible stages only.
- Keep raw logs detailed in JSON/debug files.
- If there is an unclassified gap between app timestamps and the stopwatch-like end-to-end measurement, assign it to TTS.Finalize as the closest playback handoff proxy.
- Do not create new visible categories such as Text Latency, Voice Latency, Playback, Stopwatch Alignment, or UI Delay.

The important calibration rule is:
- the user-facing total should be built from the same four stages, and any missing remainder should be absorbed into the closest responsible existing stage rather than exposed as a new section.

Do not let Finalize become the default dumping ground for core work when the UI is only meant to summarize user-facing stages.

## Calibration note for the observed samples
For the accepted short-utterance samples that were used to compare the app against the stopwatch:
- `SEG-000001` shows the remaining stopwatch gap after the visible four stages as playback handoff time, so it belongs in `TTS.Finalize`.
- `SEG-000002` shows the same pattern: the gap sits after translation and before audible output, so it still belongs in `TTS.Finalize`.

## TTS handoff timestamp chain
The playback gap is not a cosmetic offset. It must be measured from the actual TTS handoff chain:
- `TTS` request
- `playback_request`
- `queue_put`
- `worker_dequeue`
- `backend_call_start`
- `backend_return`

For UI calibration:
- `Voice Generate` should represent text prep + generation work before the audio is handed off.
- `Finalize` should absorb the measurable playback handoff gap between request, queue, worker dequeue, and backend call start.
- `backend_return` stays in raw logs only and is not the audible-start metric.

If the stopwatch still differs from the app after those timestamps are present, the next correction must come from the missing event in that chain, not from adding a fake offset.

That is why the correction stays in `TTS.Finalize` rather than moving the remainder into `Audio Verify`.
`Audio Verify -> Audio Process` should only absorb pre-ASR work such as speech detection, confirmation, endpointing, and capture cleanup.
It should not absorb the post-translation / pre-audible-playback remainder for these accepted samples.

## Regression guardrail
Before touching Latency Details UI again:
1. Verify the badge still opens the modal on a single click.
2. Verify closing the modal does not spawn another copy.
3. Verify the card still renders after the modal code changes.
4. Keep any layout/breakdown changes separate from click wiring.

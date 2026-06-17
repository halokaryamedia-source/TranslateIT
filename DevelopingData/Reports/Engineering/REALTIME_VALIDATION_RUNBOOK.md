# Realtime Validation Runbook

## Purpose
This runbook defines the next validation steps for the TranslateIT realtime voice pipeline.

## Current scope
The current engine work can validate readiness, dependency state, and safety policy. It cannot yet claim real-device one-second latency until the app-side live wiring and local runtime assets are available.

## Validation checklist
1. Confirm `faster_whisper` dependency is installed for STT.
2. Confirm converted CTranslate2 ID↔EN model files exist under `EngineData/TranslateEngine/ModelData`.
3. Confirm Piper executable is available through PATH or runtime configuration.
4. Confirm Piper voice model exists under `EngineData/TranslateEngine/ModelData/piper`.
5. Confirm `voice_replay_allowed` remains false in every realtime turn result.
6. Confirm latency budget target is reported separately from measured real-device latency.
7. Confirm UI must show fallback or blocked status when any required dependency is missing.

## Required before final realtime-ready claim
- Microphone capture must feed partial STT events.
- Partial STT must feed the realtime turn planner.
- Turn planner must feed TTS readiness.
- TTS runtime must generate or play exactly one voice output per turn.
- UI diagnostics must display STT, MT, TTS, fallback, and latency status.
- Real device benchmark must be run on the target PC.

## Current professional status
The engine-side realtime contracts are prepared. The next stage is app-side integration and real-device validation.

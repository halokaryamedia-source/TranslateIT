# Rust Audio Buffer and Calibration Flow Addendum

## Document control

- Project: TranslateIT
- Branch: `ChatGPT-ConvertEngine`
- Version: `0.6.6-audio-buffer-calibration-flow-boundary`
- Date: `2026-06-14`
- Status: Added Rust audio buffer boundary and calibration flow status commands

## Purpose

This addendum documents the next Rust migration step after input preparation.

The goal is to prepare a safe boundary between input preparation and later real audio processing. The app must not send audio data to ASR until input format, buffer status, evidence, VAD, and calibration rules are controlled by Rust.

## Added files

```text
EngineData/LauncherApp/RustApp/src-tauri/src/engine/audio/buffer.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/audio/calibration_flow.rs
```

## Added Tauri commands

```text
get_audio_buffer_status
get_calibration_flow_status
```

## Current behavior

- `get_audio_buffer_status` reports the planned Rust audio buffer boundary.
- `get_calibration_flow_status` reports the calibration output path and required sample stages.
- The frontend diagnostics panel now shows audio buffer frame status, VAD readiness, calibration readiness, and calibration flow output path.
- No false runtime-ready claim is made.

## Safety rule

The Rust app must continue to report pending status until real audio buffering, calibration evidence, VAD pass/fail, and ASR routing are implemented and validated.

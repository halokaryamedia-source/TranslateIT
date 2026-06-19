# V1 Runtime UX Depth Report

Branch: `fix/v1-runtime-ux-depth`

## Purpose

Address deeper functional UX issues found after local app testing:

1. Voice controls need clear operating modes and should not feel stuck.
2. Settings should not expose placeholder controls that look usable but do nothing.
3. Latency and GPU/CPU fallback state must be visible to the user and developer diagnostics.

## Improvements

### 1. Voice capture mode

Updated:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/directVoiceCaptureBinding.ts
```

Added two runtime-backed voice modes:

- `Click Toggle`: click microphone once to start, click again to stop.
- `Push to Talk`: hold `Ctrl+Space` to record, release to stop and process.

The selected mode is stored in local storage using:

```text
translateit.voiceCaptureMode
```

The binding intentionally does not activate Push to Talk while the user is typing in a text field.

### 2. Latency and GPU policy visibility

Updated:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/realtimeStatusPayloadRefresh.ts
```

The app now refreshes status every five seconds and surfaces:

- runtime status;
- latency target / last latency / p50 latency when reported;
- GPU primary / CUDA ready / CPU fallback policy;
- diagnostic titles for latency and GPU detail.

This does not claim latency is good; it makes latency observable.

### 3. Settings cleanup

Updated:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/settingsViews.ts
```

Changes:

- removed misleading blank advanced cards;
- advanced settings now clearly say they are hidden until runtime-backed;
- Audio settings now expose real voice mode controls;
- Developer settings now explicitly show GPU policy and latency visibility notes;
- planned controls are marked as planned instead of behaving like working buttons.

### 4. Runtime UX validation

Added:

```text
EngineData/Frontend/RustApp/scripts/validate_runtime_ux_depth_integrity.mjs
```

Updated:

```text
EngineData/Frontend/RustApp/package.json
```

New command:

```text
npm run validate:runtime-ux
```

`validate:quick` now includes runtime UX validation.

## Still not claimed

This pass does not claim:

- full ASR > Translate > TTS success on the target PC;
- CUDA is active on the target PC;
- latency is already low;
- noise suppression is implemented;
- all future advanced settings are implemented.

## Required local validation

Run from:

```text
EngineData/Frontend/RustApp
```

Command:

```text
npm.cmd run validate:quick
npm.cmd run dev
```

Manual checks:

1. Open Audio Settings.
2. Switch between Click Toggle and Push to Talk.
3. Click mic in Click Toggle mode.
4. Switch to Push to Talk and hold Ctrl+Space outside text input.
5. Open General/Developer Settings and confirm latency/GPU status is visible.
6. Confirm advanced settings no longer look like random functional buttons.

## Next recommended deep pass

After local validation, the next deep pass should focus on actual engine/provider performance:

1. measure helper bridge translation latency in Rust command timing;
2. persist latest latency evidence to UserData/LogData;
3. expose actual worker device selected by Python runtime;
4. add a setup wizard for model/provider/GPU readiness.
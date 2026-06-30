# V1 Advance — Development-only Progress Calibration

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: progress ini tidak menghitung CI, local compile, Windows runtime, atau end-to-end proof.

## Progress development-only

Progress development-only saat ini: sekitar **87%**.

Definisi:

- Yang dihitung: source features, contracts, bridge, evidence, blocker, diagnostics, orchestration, route selection model, route selection renderer, dan guarded runtime handoff.
- Yang tidak dihitung: CI result, local compile proof, Windows runtime proof, latency proof, dan end-to-end meeting proof.

## Yang sudah selesai secara development

- Capture to ASR boundary source wiring.
- ASR audio payload boundary.
- Worker ASR decode contract.
- Guarded ASR runtime path, default guard-off.
- ASR transcript promotion.
- Translation handoff.
- Guarded translation runtime path, default guard-off.
- TTS handoff.
- Guarded TTS runtime path, default guard-off.
- Pipeline snapshot and evidence file.
- Virtual route contract and route device scan.
- Persistent preferred virtual route config.
- Route output contract JSON.
- Route runtime stub and route stub evidence.
- Typed virtual route frontend bridge.
- Preferred route selection bridge method.
- User-facing route selection surface model.
- User-facing route selection surface renderer.
- Professional readiness gate.
- Source readiness orchestration command.
- Guarded virtual audio route runtime handoff.
- Virtual route validator included in quick validation.
- CI workflow exists, but CI result is not counted here.

## Yang belum selesai secara development

1. Mounting route selection surface into the real application layout.
2. Platform-specific audio route provider execution.
3. Source Orchestration UI button connection.
4. Final UX cleanup for route flow outside Developer Diagnostics.

## New commands/modules added recently

```text
run_professional_source_readiness_orchestration
prepare_guarded_virtual_audio_route_runtime
virtualRouteSelectionSurfaceModel.ts
virtualRouteSelectionSurfaceRenderer.ts
```

Purpose:

- Collect latest pipeline snapshot.
- Collect virtual route status.
- Prepare route runtime stub from latest TTS output path.
- Collect professional gate status.
- Return development-only progress via `development_progress_percent_excluding_ci_local`.
- Return remaining source gaps via `remaining_development_gaps`.
- Prepare guarded audio route runtime handoff with source audio path and selected route devices.
- Provide a modular route selection surface with output/input selectors, save action, refresh action, blocker display, and evidence path display.
- Keep execution disabled until CI/local/Windows validation and provider implementation are ready.

Runtime claims:

```text
professional_source_orchestration_development_only_not_ci_local_runtime_proof
virtual_audio_route_runtime_handoff_source_side_not_audio_runtime_proof
virtual_audio_route_runtime_guarded_provider_not_implemented
virtual_route_selection_surface_source_side_not_audio_runtime_proof
```

## What should be done next

1. Mount the route selection surface into the real application layout.
2. Implement platform-specific audio route provider execution behind guard.
3. Connect the Source Orchestration button using a smaller UI patch or dedicated UI module.
4. After development-only is mature enough, inspect CI result.
5. Local compile and Windows runtime validation remain separate and should not be counted in this development-only percentage.

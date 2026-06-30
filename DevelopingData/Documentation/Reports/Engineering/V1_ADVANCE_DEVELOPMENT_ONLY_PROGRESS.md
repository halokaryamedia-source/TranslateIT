# V1 Advance — Development-only Progress Calibration

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: progress ini tidak menghitung CI, local compile, Windows runtime, atau end-to-end proof.

## Progress development-only

Progress development-only saat ini: sekitar **92%**.

Definisi:

- Yang dihitung: source features, contracts, bridge, evidence, blocker, diagnostics, orchestration, route selection model, route selection renderer, route selection mount helper, entrypoint mounting, Source Orchestration binding, guarded runtime handoff, dan guarded provider script.
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
- Route selection auto-mount helper.
- Route selection surface mounted from `src/main.ts`.
- Professional readiness gate.
- Source readiness orchestration command.
- Source Orchestration UI binding.
- Source Orchestration binding mounted from `src/main.ts`.
- Guarded virtual audio route runtime handoff.
- Guarded virtual audio route provider script.
- Provider dry-run and environment guard.
- Provider source WAV metadata check.
- Provider selected output device lookup.
- Provider dependency-aware blockers for `sounddevice` and `numpy`.
- Audio route runtime contract borrow guard cleanup.
- Virtual route validator included in quick validation.
- CI workflow exists, but CI result is not counted here.

## Yang belum selesai secara development

1. Wire Rust/worker handoff to call the guarded provider script directly.
2. Final UX cleanup/styling for route selection surface outside Developer Diagnostics.
3. Optional provider packaging notes for Windows dependency installation.

## New commands/modules added recently

```text
run_professional_source_readiness_orchestration
prepare_guarded_virtual_audio_route_runtime
virtual_audio_route_provider.py
virtualRouteSelectionSurfaceModel.ts
virtualRouteSelectionSurfaceRenderer.ts
virtualRouteSelectionSurfaceMount.ts
sourceOrchestrationBinding.ts
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
- Mount the route selection surface near the existing capture helper controls without rewriting the large diagnostics binding.
- Provide Source Orchestration as a separate binding/button instead of rewriting the large diagnostics binding.
- Provide a guarded Python provider script that can eventually play generated TTS WAV into a selected virtual output device when explicit runtime guards, dependencies, and Windows validation are ready.
- Keep execution disabled until CI/local/Windows validation and provider implementation are ready.

Runtime claims:

```text
professional_source_orchestration_development_only_not_ci_local_runtime_proof
virtual_audio_route_runtime_handoff_source_side_not_audio_runtime_proof
virtual_audio_route_runtime_guarded_provider_not_implemented
virtual_audio_route_provider_guarded_disabled_no_audio_execution
virtual_audio_route_provider_ready_needs_windows_runtime_validation
virtual_audio_route_provider_execution_attempted_needs_windows_runtime_validation
virtual_route_selection_surface_source_side_not_audio_runtime_proof
```

## What should be done next

1. Wire Rust/worker handoff to call the guarded provider script directly.
2. Add final UX cleanup/styling for the route selection surface outside Developer Diagnostics.
3. Add provider packaging notes for Windows dependency installation.
4. After development-only is mature enough, inspect CI result.
5. Local compile and Windows runtime validation remain separate and should not be counted in this development-only percentage.

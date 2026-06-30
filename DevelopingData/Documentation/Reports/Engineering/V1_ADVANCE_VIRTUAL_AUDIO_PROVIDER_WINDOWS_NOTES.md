# V1 Advance — Virtual Audio Provider Windows Notes

Tanggal: 2026-06-30
Status: documentation only; not runtime proof.

## Purpose

This note documents the expected Windows environment for the guarded virtual audio route provider.

Provider script:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py
```

Provider dependency file:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/requirements-virtual-audio-route.txt
```

Rust command:

```text
dispatch_guarded_virtual_audio_route_provider
```

Frontend bridge helper:

```text
virtualAudioRouteRuntimeApi.dispatchProviderFromLatestPipeline(...)
```

## Required Windows runtime pieces

1. Python runtime available through either:
   - `TRANSLATEIT_PYTHON`, or
   - `python` on PATH.
2. Python packages from `requirements-virtual-audio-route.txt`:
   - `numpy`
   - `sounddevice`
3. A virtual audio cable or virtual mixer output device, for example:
   - VB-Audio Virtual Cable
   - Voicemeeter virtual output
   - another Windows audio device with output channels visible to `sounddevice`
4. A generated TTS WAV file from the TranslateIT pipeline.
5. A selected virtual output device saved through the route selection surface.

## Suggested dependency install command later

Run only on the Windows validation/runtime environment after CI and local compile are clean:

```powershell
python -m pip install -r EngineData/Backend/LocalWorker/WorkerRuntime/requirements-virtual-audio-route.txt
```

If `TRANSLATEIT_PYTHON` points to a dedicated runtime Python, use:

```powershell
$env:TRANSLATEIT_PYTHON -m pip install -r EngineData/Backend/LocalWorker/WorkerRuntime/requirements-virtual-audio-route.txt
```

## Guard policy

The provider must not be treated as runtime proof unless all of these are true:

- CI/source validation is green.
- Local compile validation is green.
- Windows target machine has the provider dependencies installed.
- `TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER=1` is set.
- Payload enables route runtime.
- Dry-run is disabled intentionally.
- The meeting app receives audio from the selected virtual input path.

## Safe defaults

The current development path is intentionally conservative:

- Provider dispatch bridge defaults to `enableRouteRuntime=false`.
- Provider dispatch bridge defaults to `dryRun=true`.
- Provider response is captured as evidence.
- Provider failure becomes a blocker, not a runtime success claim.

## Important blockers

Common provider blockers:

```text
virtual_audio_route_provider:missing_source_audio_path
virtual_audio_route_provider:source_audio_file_missing
virtual_audio_route_provider:audio_file_unreadable
virtual_audio_route_provider:missing_selected_output_device
virtual_audio_route_provider:dependency_missing_sounddevice_numpy
virtual_audio_route_provider:selected_output_device_not_found
virtual_audio_route_provider:playback_failed
```

## Validation order later

1. Confirm CI/source checks are green.
2. Confirm local Rust/Tauri compile is green.
3. Install Windows provider dependencies from `requirements-virtual-audio-route.txt`.
4. Select a virtual output/input route device.
5. Generate a TTS WAV output through the pipeline.
6. Run Provider Dry Run.
7. Inspect provider response JSON and evidence.
8. Enable guarded runtime only after dry-run and device selection are correct.
9. Validate that the meeting app receives audio.

## Runtime claims

```text
virtual_audio_route_provider_guarded_disabled_no_audio_execution
virtual_audio_route_provider_ready_needs_windows_runtime_validation
virtual_audio_route_provider_dry_run_source_side_not_audio_runtime_proof
virtual_audio_route_provider_dispatch_attempted_needs_windows_runtime_validation
virtual_audio_route_provider_execution_attempted_needs_windows_runtime_validation
```

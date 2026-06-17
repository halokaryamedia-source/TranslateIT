# Realtime Local Completion Checklist

## Purpose
This checklist lists the final local steps that cannot be completed by repository-only changes.

## Required local steps
1. Apply the prepared hook patch in the local checkout.
2. Run the hook verifier and confirm all required markers are present.
3. Start the desktop app and verify the realtime status row is visible.
4. Place required local assets under the configured model root.
5. Run validation runner and confirm asset readiness payload is present.
6. Collect latency samples on the target PC.
7. Evaluate the release gate with the collected samples.
8. Close issue `#2` only after all release-gate blockers are clear.

## Required repo helpers
- `DevelopingData/Patches/apply_realtime_app_main_hook.py`
- `DevelopingData/Patches/verify_realtime_app_main_hook.py`
- `DevelopingData/Patches/realtime_hook_status.py`
- `EngineData/TranslateEngine/realtime_asset_manifest.py`
- `EngineData/TranslateEngine/realtime_asset_readiness.py`
- `EngineData/TranslateEngine/realtime_validation_runner.py`
- `EngineData/TranslateEngine/realtime_final_readiness_gate.py`
- `EngineData/TranslateEngine/realtime_latency_sample_gate.py`
- `EngineData/TranslateEngine/realtime_release_gate.py`

## Not allowed
Do not mark realtime mode as ready if any release gate blocker remains.
Do not overwrite the full app file manually without using the prepared patch path.
Do not claim target PC latency performance without measured samples.

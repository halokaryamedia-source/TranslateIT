# TranslateIT V1-Advance Runtime Contract Retarget Audit

Branch: `V1-Advance`
Status: Phase 2 runtime contract retarget completed

## Purpose

This report records the contract cleanup where old active branch labels were retargeted from `Dev-Rust` to `V1-Advance`.

The change does not create a new engine. It keeps the same Rust/Tauri + Python helper architecture and updates the active source-of-truth naming so future development is not confused by old branch labels.

## Contracts updated

The following runtime contracts now declare:

```json
"branch": "V1-Advance"
```

Updated files:

```text
EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json
EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json
EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json
EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json
```

## Preserved architecture

The active architecture remains:

```text
Rust/Tauri desktop shell
Python helper runtime
Local-first model runtime
NVIDIA CUDA-first acceleration
CPU fallback required
```

No alternate engine was introduced.

## V1-Advance capture policy added to contract

`CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json` now records the locked V1-Advance speech policy:

```text
Default input mode: always-listening
Secondary input mode: push-to-talk
Default push-to-talk hotkey: Hold Space
Silence threshold: 700ms
Maximum speech segment: 12 seconds
Primary meeting output: built-in virtual microphone
Headphone monitor volume: 50%
Mute original microphone: required
```

## Audio Studio status clarified

`AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json` now clarifies that Audio Studio is:

```text
secondary_feature_after_main_realtime_engine
```

It remains part of the same TranslateIT V1 engine and must not become a separate engine.

## CI guard added

`validate_v1_advance_policy.mjs` now checks:

1. Required runtime contracts exist.
2. Runtime contract branch fields are `V1-Advance`.
3. Runtime contracts do not declare `Dev-Rust` as the active branch.
4. Final desktop shell remains `Rust/Tauri`.
5. Helper runtime remains `Python`.
6. Capture contract declares 700ms silence threshold.
7. Capture contract declares 12 second max speech segment.
8. Capture contract declares always-listening as the default input mode.

## Next target

The next Phase 2 target is documentation cleanup:

1. Find docs that still imply old branch names are active.
2. Mark historical branch references as inactive or historical.
3. Keep `V1-Advance` as the active development source of truth.
4. Continue avoiding local runtime tests until GitHub/CI-safe work is stable.

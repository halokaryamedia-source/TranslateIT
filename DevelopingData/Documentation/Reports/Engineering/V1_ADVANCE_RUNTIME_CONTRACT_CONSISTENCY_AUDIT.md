# V1-Advance Runtime Contract Consistency Audit

Branch: `V1-Advance`
Status: completed non-local audit

## Purpose

This audit records the non-local runtime contract consistency check for the active V1-Advance source-of-truth contracts.

The goal is to confirm that active contracts agree on the product boundary:

```text
Rust/Tauri desktop shell + Python helper runtime
```

and that they do not claim local runtime readiness before target-PC evidence exists.

## Contracts checked

```text
EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json
EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json
EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json
EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json
```

## Findings

- All checked contracts declare `branch: V1-Advance`.
- Final architecture contract declares `Rust/Tauri` as the final desktop shell and `Python` as helper runtime.
- Python helper bridge contract keeps helper readiness evidence separate from automatic UI readiness.
- Capture helper bridge contract remains `contract_ready_runtime_not_migrated`.
- Capture contract explicitly lists not-ready claims for microphone, ASR, translation, TTS, CUDA, low latency, packaged app, and virtual microphone.
- Audio Studio route contract remains `metadata_runtime_enabled_provider_runtime_blocked`.
- Audio Studio contract reserves generic `ready` only for implemented runtime behavior with target-PC evidence.

## Validator added

A new validator was added:

```text
EngineData/Frontend/RustApp/scripts/validate_runtime_contract_consistency.mjs
```

It checks active runtime contracts for:

- expected branch,
- expected Rust/Tauri and Python boundaries,
- inactive DesignIT/FigmaDesignExport policy,
- helper bridge blocked/degraded state availability,
- capture policy values such as 700ms silence threshold and 12s max segment,
- capture and virtual microphone not-ready claim boundaries,
- Audio Studio provider-blocked semantics.

## Non-local readiness validator update

`validate_non_local_readiness.mjs` now also checks that the runtime contracts exist and remain aligned with the V1-Advance non-local readiness boundary.

## Outcome

The active contracts are consistent enough for the next non-local phase.

No local runtime, helper spawn, model loading, CUDA, microphone, virtual microphone, TTS, installer, or latency readiness is claimed by this audit.

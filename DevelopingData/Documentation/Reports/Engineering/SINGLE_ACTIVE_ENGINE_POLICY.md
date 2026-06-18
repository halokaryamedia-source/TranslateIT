# Single Active Engine Policy

Branch: `Dev-Rust`

## Final rule

TranslateIT has one active product runtime direction:

```text
Rust/Tauri desktop shell + Python helper runtime
```

This means:

- Rust/Tauri is the only active user-facing desktop shell.
- Python is an internal helper runtime, not a separate product shell.
- Python helper processes are started, checked, and presented by Rust/Tauri.
- Runtime readiness must be shown through the current Rust/Tauri status surfaces and evidence paths.

## What is not active

Superseded launcher prototypes, historical handoff notes, and phase reports are historical context only.

They must not be used to claim:

- a second product engine,
- any non-Rust/Tauri user-facing shell,
- packaged app readiness,
- CUDA readiness,
- microphone capture success,
- ASR model readiness,
- translation model readiness,
- TTS output readiness,
- Audio Studio provider readiness,
- Audio Studio quality-score readiness.

## Active source-of-truth priority

When any superseded note conflicts with current implementation, use this priority order:

1. `DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md`
2. `DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md`
3. `EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json`
4. `EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json`
5. `EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json`
6. `EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json`

## Naming rule

Do not describe superseded material as another active engine.

Use these terms instead:

- `historical note`
- `superseded note`
- `reference-only report`
- `prototype note`

Avoid wording that implies another launcher engine can be reactivated without a new approved architecture contract.

## Implementation rule

New code and UI must route through:

```text
EngineData/LauncherApp/RustApp
```

New helper runtime work must route through:

```text
EngineData/Backend/LocalWorker/WorkerRuntime
```

New runtime contracts must route through:

```text
EngineData/Backend/RuntimeContracts
```

## Validation rule

Documentation validators should fail when active status documents reintroduce a second shell direction or use stale source-of-truth ordering.

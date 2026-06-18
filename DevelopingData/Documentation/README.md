# TranslateIT Documentation

## Purpose

This is the single documentation hub for TranslateIT.

The current active engineering entrypoint is:

```text
DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md
```

Read that file first before using older reports, handoff notes, or phase documents.

## Current active engine

TranslateIT has one active product runtime direction:

```text
Rust/Tauri desktop shell + Python helper runtime
```

Python is an internal helper runtime for ASR, translation, TTS/voice, CUDA diagnostics, latency diagnostics, model checks, and audio/provider work. It is not a separate user-facing product shell.

## Current layout

```text
Documentation/
  README.md
  Reports/
    Engineering/
      ACTIVE_DOCUMENTATION_INDEX.md
      CURRENT_APP_STATUS.md
      SINGLE_ACTIVE_ENGINE_POLICY.md
      CAPTURE_HELPER_BRIDGE_MIGRATION_PLAN.md
      HELPER_BRIDGE_TIMEOUT_POLICY.md
      NOISE_HALLUCINATION_FILTERING_POLICY.md
      StructureCleanupReport.md
  Source/
    README.md
    ProjectDocumentation.md
    SystemArchitecture.md
    ManualTestGuide.md
    ProjectHistory.md
  Templates/
    Repository/
      gitignore_template.txt
```

## What to read first

For a new AI/session or developer handoff, read in this order:

1. `DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md`.
2. `DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md`.
3. `DevelopingData/Documentation/Reports/Engineering/SINGLE_ACTIVE_ENGINE_POLICY.md`.
4. `EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json`.
5. `EngineData/Backend/RuntimeContracts/PYTHON_HELPER_BRIDGE_CONTRACT.json`.
6. `EngineData/Backend/RuntimeContracts/CAPTURE_HELPER_BRIDGE_REQUEST_CONTRACT.json`.
7. `EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_STATUS_CONTRACT.json`.
8. `EngineData/README.md`.

## Rules

- Keep documentation here.
- Keep only documents that are current and useful.
- Treat older reports outside the active index as historical context only.
- Keep executable tooling in `DevelopingData/Tooling`.
- Keep runtime app code in `EngineData`.
- Keep user runtime output in `UserData`.
- Do not create new root-level documentation folders.
- Do not restore old documentation paths.
- Update this hub when structure or ownership changes.

# Tests

## Purpose

This folder is reserved for validation and test references.

## Rules

- Keep executable validation scripts under `DevelopingData/ToolKitData/Scripts/Execution` while package references still point there.
- Do not reintroduce old Python engine hardening tests that depend on retired runtime modules.
- Prefer Rust/Tauri and worker-smoke validation evidence.

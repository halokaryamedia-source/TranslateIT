# Engineering Reports

## Purpose

This folder is the only location for active engineering cleanup, evidence notes, templates, and architecture reports.

Old reports under `DevelopingData/Reports` are retired. RustApp root reports are also retired and should be stored here instead.

## Current report groups

- `StructureCleanupReport.md` - root, DevelopingData, Documentation, Tooling, and EngineData cleanup summary.
- `LOCAL_*` reports - local engine and validation evidence notes.
- `MODEL_*` reports - model preparation and validation evidence notes.
- `PRE_TEST_CHECKLIST.md`, `MANUAL_TEST_REPORT_TEMPLATE.md`, and `TESTING_READY.md` - test-planning documents, not runtime files.
- `RUNTIME_EVIDENCE_FLOW.md` and `RUNTIME_GAP_ESTIMATE.json` - evidence and gap tracking documents.

## Rules

- Do not restore `DevelopingData/Reports`.
- Do not store active runtime source here.
- Do not store UI preview files here.
- Keep report names clear and current.
- Delete obsolete phase reports after their decisions are reflected in `DevelopingData/Documentation/Source`.
- New reports must point back to the source documentation when a decision becomes permanent.

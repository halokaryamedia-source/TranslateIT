# Dev-Rust App Check Workflow Evidence

## Purpose
Track validation evidence for the Dev-Rust app check workflow.

## Workflow file

```text
.github/workflows/dev-rust-validation-note.yml
```

## Current status

- Workflow file exists in `.github/workflows`.
- Workflow now runs both frontend TypeScript validation and Rust validation.
- Latest workflow upgrade commit: `772a2f3a9662f6f153c9fe3e4311bb18f55a7676`.
- No successful workflow pass evidence is recorded yet.

## Required validation

The workflow should run:

```text
npm run typecheck
npm run check:rust
```

Manual fallback from local checkout:

```text
cd EngineData/LauncherApp/RustApp
npm run typecheck
npm run check:rust
```

## Readiness rule

Realtime app integration should not be marked fully validated until either the workflow passes or both local commands pass.

# Historical Root File Rules — Superseded

This file records an earlier TranslateIT root-layout contract. It is intentionally retained only as historical/recovery evidence.

## Current authority

The current repository-root and project-memory rules are defined by:

```text
AGENTS.md
CONTEXT.md
docs/knowledge/minimal-nav.md
docs/knowledge/next-action.md
docs/knowledge/source-ownership.md
```

The old rule that all project documentation/reports live under `DevelopingData` is **superseded**.

## Current data boundaries

```text
EngineData
-> canonical product implementation + production runtime assets/contracts

UserData
-> runtime/user-owned data destination

DevelopingData
-> historical/recovery/reference development evidence
```

Additional current root owners such as `.agents/`, `.github/`, `docs/`, `AGENTS.md`, and `CONTEXT.md` are intentional and must not be removed to satisfy this historical file.

Production code/build/package/runtime must not depend on `DevelopingData`. Developer/source-validation output must not use `UserData` as a report destination; temporary development evidence belongs under ignored `.tmp/` paths.

Do not use this historical document to validate the current root layout.

# TranslateIT Workspace

TranslateIT is a Windows-first desktop translation product. The current development authority is branch `New`.

## Project memory

Use these canonical owners instead of reconstructing the project from old reports or chat history:

```text
AGENTS.md
-> how work is performed

CONTEXT.md
-> stable project facts and terminology

docs/foundation/
-> desired product/system behavior

docs/knowledge/next-action.md
-> current continuation state

docs/knowledge/source-ownership.md
-> semantic requirement-to-source ownership
```

## Root data boundaries

```text
EngineData
-> canonical product implementation and production runtime assets/contracts

UserData
-> runtime/user-owned data destination; never product/source authority

DevelopingData
-> historical/recovery/reference development evidence; never normal production authority
```

Production code, build/package inputs, and runtime discovery must not depend on `DevelopingData`. Developer/source-validation outputs must not be stored in `UserData`; temporary development evidence belongs under ignored `.tmp/` paths.

## Current application package

```text
EngineData/Frontend/RustApp
```

The package contains the Tauri desktop application, including frontend TypeScript/CSS and the Rust `src-tauri` runtime. The Python helper/runtime, production runtime assets, and runtime contracts live under `EngineData/Backend`.

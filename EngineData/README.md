# EngineData

`EngineData` is the canonical implementation boundary for TranslateIT.

## Owns

```text
Frontend/RustApp
-> Tauri desktop application
-> TypeScript/CSS product UI
-> Rust src-tauri runtime/commands/engine
-> source/build/contract validation scripts that directly protect the product

Backend/LocalWorker
-> Python helper/worker runtime source

Backend/RuntimeAssets
-> production runtime/model/TTS asset inputs

Backend/RuntimeContracts
-> current machine-readable runtime contracts
```

## Does not own

Do not place these here as persistent source:

```text
current task/progress reports
historical recovery documents
design/reference archives
local validation output
generated logs/cache
user-created or user-saved runtime data
scratch files
```

Generated development/test evidence belongs under ignored `.tmp/` paths. Runtime/user data belongs under `UserData`.

`EngineData` must not depend on `DevelopingData` for normal build, package, launch, runtime discovery, or production behavior. If historical material contains something still required by the product, revalidate it and adopt it into the correct current owner instead of keeping a production dependency on the historical location.

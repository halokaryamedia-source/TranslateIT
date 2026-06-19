# Dev-Pack Root and Modularity Cleanup

## Scope

This cleanup pass targets the first safety layer before deeper UI or runtime refactoring:

1. Root file hygiene.
2. Retired path prevention.
3. Runtime model path truthfulness.
4. Worker-owned Python boundary.
5. Modular boundary validation for active runtime source.

## Changes applied

- Root documentation now includes `.github/` as repository automation only.
- Retired repository routes are documented and ignored to reduce accidental local recreation.
- `MODEL_RUNTIME_MANIFEST.json` no longer claims target-PC model, TTS, or GPU readiness from committed JSON.
- Model runtime paths now point to `EngineData/Backend/RuntimeAssets` only.
- Python model preflight ownership moved to `EngineData/Backend/LocalWorker/WorkerRuntime`.
- App-local Python model setup and validation helpers were removed from `RustApp/scripts`.
- `translateit_tooling.mjs` now blocks Python files outside WorkerRuntime and blocks unexpected top-level entries under `DevelopingData`.
- `validate_modular_boundaries.mjs` was added and wired into `validate:internal` and `validate:full`.

## Intentional behavior

`validate:models` and readiness summaries are allowed to fail until real local evidence exists on the target PC. A committed manifest is treated as a contract, not as proof that local GPU/model/runtime execution is ready.

## Remaining controlled cleanup

Some historical tracked folders may still exist in branch history or in the current working tree. The hardened structure validator is expected to block these until they are migrated or deleted intentionally:

```text
DevelopingData/Reports/
DevelopingData/Tests/
DevelopingData/Patches/
EngineData/TranscriptEngine/
EngineData/TranslateEngine/
EngineData/VoiceEngine/
```

Do not mass-delete without checking whether any content still needs to be preserved under `DevelopingData/Documentation`, `DevelopingData/Quality`, or `EngineData/Backend`.

## Local follow-up commands

Run from the active app package after pulling this branch:

```powershell
cd EngineData/LauncherApp/RustApp
npm run validate:root
npm run validate:structure
npm run validate:worker
npm run validate:modular-boundaries
npm run models:setup
npm run status:readiness
```

Expected result:

- `validate:root` should reveal unexpected root entries if local PC still has stale files.
- `validate:structure` may intentionally block remaining tracked retired routes until the next cleanup pass.
- `models:setup` is conservative and does not claim model readiness until approved RuntimeAssets folders exist locally.
- `status:readiness` remains blocked until real local smoke evidence is written.

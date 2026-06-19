# RustApp Scripts

This folder contains package-level scripts for the active TranslateIT Tauri desktop app package.

## Script profile policy

Use a small set of public profiles first. Older one-off scripts can remain as compatibility aliases, but new workflow should prefer these profiles.

| Profile | Command | Purpose | Expected cost |
| --- | --- | --- | --- |
| Quick validation | `npm run validate:quick` | Fast source-level app, route, naming, Rust check, and frontend build validation. | Low |
| Naming validation | `npm run validate:naming` | Checks required active routes, retired root entries, and runtime/preview separation. | Low |
| Internal validation | `npm run validate:internal` | Development validation without heavy model/GPU checks. | Medium |
| Release preflight | `npm run validate:release-preflight` | Internal validation plus packaged app build. | Medium-high |
| Local heavy validation | `npm run validate:local-heavy` | Full local/model/GPU/worker validation profile. | High |

## Ownership rules

- App package validators can stay here when they directly validate `RustApp` source, Tauri config, UI files, naming policy, or app-specific contracts.
- Repository-wide maintenance scripts should live under `DevelopingData/Tooling/Scripts/Execution`.
- Model setup, GPU setup, and worker smoke tests are local-heavy actions and must not run as part of the quick profile.
- Do not remove existing one-off scripts until their replacement profile has been validated locally.

## Current cleanup status

The script set is still intentionally backwards-compatible. The quick profile now includes naming/route checks. The next cleanup step is to reduce user-facing documentation and contributor instructions to the profile commands above, while keeping old aliases until local validation confirms they are safe to retire.
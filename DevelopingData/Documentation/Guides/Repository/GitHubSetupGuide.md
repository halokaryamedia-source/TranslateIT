# TranslateIT GitHub Setup Guide

## Purpose

This guide keeps the repository setup workflow clean, private, and safe from runtime cache/log/user data.

## Repository visibility

Use a private repository while TranslateIT is still in active development.

Recommended repository name:

```text
TranslateIT
```

## Current professional root

Only these root folders/files are expected:

```text
.github/
DevelopingData/
EngineData/
Launcher/
UserData/
.gitattributes
.gitignore
README.md
TranslateIT.vbs
```

## Retired roots

Do not recreate:

```text
DeveloperData/
DevelopingData/DocumentationData/
DevelopingData/Reports/
DevelopingData/ToolKitData/
DevelopingData/Diagnostics/
DevelopingData/Docs/
DevelopingData/LauncherHelpers/
DevelopingData/SampleData/
DevelopingData/Tests/
```

## What should not be pushed

Do not commit:

- `UserData/CacheData/`
- `UserData/LogData/`
- generated audio files such as `.wav`, `.mp3`, `.flac`, `.ogg`
- local model binaries such as `.bin`, `.safetensors`, `.gguf`, `.onnx`, `.pt`, `.pth`
- `.env`, API keys, tokens, passwords, or local config secrets
- build output such as `dist/`, `build/`, or Rust/Tauri `target/`
- loose root scripts such as `.py`, `.bat`, `.cmd`, or `.ps1`

## Normal update workflow

```powershell
git status
git add .
git commit -m "Describe the TranslateIT update"
git push
```

## Daily verification

From `EngineData/LauncherApp/RustApp`:

```powershell
npm run validate:internal
```

For package/build validation:

```powershell
npm run validate:full
```

Worker checks:

```powershell
npm run setup:worker
npm run validate:worker
npm run validate:models
npm run smoke:worker
npm run status:readiness
```

## Single runtime route rule

The user-facing entry point must remain:

```text
TranslateIT.vbs
```

That route must point to:

```text
EngineData/LauncherApp/RustApp
```

Do not reintroduce Python launcher helpers, BAT helpers, debug launchers, browser-only routes, or alternate runtime routes.

## Documentation rule

All durable docs must live under:

```text
DevelopingData/Documentation
```

## Tooling rule

All executable validation and maintenance scripts must live under:

```text
DevelopingData/Tooling/Scripts/Execution
```

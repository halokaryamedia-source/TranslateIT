# TranslateIT GitHub Setup Guide

## Purpose

This guide keeps the repository setup workflow clean, private, and safe from runtime cache/log/user data.

## Repository visibility

Use a private repository while TranslateIT is still in active development.

Recommended repository name:

```text
TranslateIT
```

## Current professional source roots

```text
DeveloperData/
DevelopingData/
EngineData/
Launcher/
UserData/
README.md
TranslateIT.vbs
.gitignore
```

## What should not be pushed

Do not commit:

- `UserData/CacheData/`
- `UserData/LogData/`
- generated audio files such as `.wav`, `.mp3`, `.flac`, `.ogg`
- local model binaries such as `.bin`, `.safetensors`, `.gguf`, `.onnx`, `.pt`, `.pth`
- `.env`, API keys, tokens, passwords, or local config secrets
- build output such as `dist/`, `build/`, or Rust/Tauri `target/`

## Normal update workflow

```powershell
git status
git add .
git commit -m "Describe the TranslateIT update"
git push
```

## Daily verification

Before pushing, confirm:

```powershell
git status
```

Then run the RustApp validation workflow locally from `EngineData/LauncherApp/RustApp` when possible:

```powershell
npm run validate:internal
```

For final packaging validation:

```powershell
npm run validate:full
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

Do not reintroduce Python launcher helpers or alternate legacy runtime routes.

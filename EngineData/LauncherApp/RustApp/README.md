# TranslateIT RustApp

## Purpose

`RustApp` is the new Tauri-based application shell for the TranslateIT Rust conversion branch.

The goal is to migrate TranslateIT from the current Python/PySide6 launcher and Python runtime orchestration toward:

- a Tauri desktop frontend,
- a Rust command bridge,
- Rust-owned runtime state and lifecycle control,
- and a documented path for replacing the current Python engine modules without silently changing model behavior.

## Current status

Status: `scaffold only`.

This folder does not claim feature parity with the existing Python application yet. The current Rust commands intentionally return migration/scaffold status instead of pretending that ASR, translation, TTS, CUDA, or microphone capture are already converted.

## Folder map

```text
RustApp/
  README.md
  package.json
  index.html
  src/
    main.ts
    styles.css
  src-tauri/
    Cargo.toml
    build.rs
    tauri.conf.json
    src/
      main.rs
```

## Development rules

- Keep the Tauri frontend clean, minimal, and user-facing.
- Keep technical diagnostics behind secondary panels or future settings screens.
- Do not remove the existing Python engine until Rust parity is proven.
- Do not silently replace Faster-Whisper, NLLB, MarianMT, custom voice, CUDA policy, or latency semantics.
- Every conversion step must update the related documentation in `DevelopingData/DocumentationData/SourceDocument/`.
- Final testing is intentionally collected for the end of the conversion milestone, following the user's requested workflow.

## Intended architecture

```text
Tauri WebView Frontend
  -> Rust command API
     -> Rust runtime lifecycle state
     -> Rust audio capture and VAD layer
     -> Rust ASR adapter
     -> Rust translation adapter
     -> Rust TTS/output adapter
     -> UserData cache/log/save writers
```

## Initial commands

The current scaffold exposes these Tauri commands:

- `get_engine_status`
- `start_capture`
- `stop_capture`
- `translate_text`

They are placeholders with explicit migration-state responses. They exist to stabilize the frontend/backend contract before replacing Python runtime behavior.

## Validation script

The scaffold presence check lives at:

```text
DevelopingData/ToolKitData/Scripts/Execution/check_rust_app.py
```

The script verifies that the core RustApp scaffold files exist without running runtime tests early.

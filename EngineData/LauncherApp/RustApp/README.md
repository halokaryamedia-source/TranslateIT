# TranslateIT RustApp

## Purpose

`RustApp` is the new Tauri-based application shell for the TranslateIT Rust conversion branch.

The goal is to migrate TranslateIT from the current Python/PySide6 launcher and Python runtime orchestration toward:

- a Tauri desktop frontend,
- a Rust command bridge,
- Rust-owned runtime state and lifecycle control,
- Rust-owned configuration, cache, log, and saved-data paths,
- Rust-owned audio evidence, calibration, and VAD gates,
- native Rust audio device discovery,
- Rust-owned native inference backend selection records,
- Rust-owned CUDA probe and adapter planning boundaries,
- Rust-owned adapter boundaries for ASR, translation, and TTS,
- and a documented path for replacing the current Python engine modules without silently changing model behavior.

## Current status

Status: `native diagnostics and adapter plan baseline`.

This folder does not claim feature parity with the existing Python application yet. The current Rust commands intentionally return migration/scaffold status instead of pretending that ASR, translation, TTS, CUDA, or microphone capture are already converted.

The final target is a Rust-owned runtime that does not require Python to operate. CUDA inference may use native CUDA-capable libraries through Rust FFI or native bindings.

## Folder map

```text
RustApp/
  README.md
  package.json
  tsconfig.json
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
      engine/
        mod.rs
        state.rs
        config.rs
        cuda_policy.rs
        paths.rs
        settings.rs
        logging.rs
        models.rs
        diagnostics.rs
        audio/
          mod.rs
          device.rs
          calibration.rs
          evidence.rs
          vad.rs
        inference/
          mod.rs
          backend.rs
          cuda_probe.rs
        adapters/
          mod.rs
          asr.rs
          translation.rs
          tts.rs
```

## Development rules

- Keep the Tauri frontend clean, minimal, and user-facing.
- Keep technical diagnostics behind secondary panels or future settings screens.
- Do not remove the existing Python engine until Rust parity is proven.
- Final runtime must not depend on Python.
- Do not silently replace Faster-Whisper, NLLB, MarianMT, custom voice, CUDA policy, or latency semantics.
- Do not silently fall back from CUDA to CPU.
- Do not report CUDA inference as ready just because `nvidia-smi` is present.
- Every conversion step must update the related documentation in `DevelopingData/DocumentationData/SourceDocument/`.
- Final testing is intentionally collected for the end of the conversion milestone, following the user's requested workflow.

## Intended architecture

```text
Tauri WebView Frontend
  -> Rust command API
     -> Rust runtime lifecycle state
     -> Rust config and path layer
     -> Rust settings persistence
     -> Rust logging and diagnostics
     -> Native Rust audio device discovery
     -> Rust audio calibration, evidence, and VAD layer
     -> Rust native inference backend selector
     -> Rust CUDA probe boundary
     -> Rust ASR adapter plan
     -> Rust translation adapter plan
     -> Rust TTS/output adapter
     -> UserData cache/log/save writers
```

## Initial commands

The current scaffold exposes these Tauri commands:

- `get_engine_status`
- `get_runtime_diagnostics`
- `load_runtime_settings`
- `save_default_runtime_settings`
- `start_capture`
- `stop_capture`
- `translate_text`

They are placeholders or support commands with explicit migration-state responses. They exist to stabilize the frontend/backend contract before replacing Python runtime behavior.

## Current diagnostics coverage

Diagnostics now reports:

- project paths,
- UserData paths,
- native audio backend and discovered device count,
- calibration profile status at `UserData/CacheData/rust_calibration_profile.json`,
- `nvidia-smi` probe result,
- native inference backend candidates,
- ASR adapter plan,
- translation adapter plan,
- and current blockers.

## Validation script

The scaffold presence check lives at:

```text
DevelopingData/ToolKitData/Scripts/Execution/check_rust_app.py
```

The script verifies that the RustApp scaffold, runtime support modules, audio gate modules, inference boundary modules, CUDA probe module, and engine contract files exist without running final runtime tests early.

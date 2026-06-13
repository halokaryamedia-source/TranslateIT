# Rust Tauri Conversion Master Addendum

## Document control

- Project: TranslateIT
- Branch: `ChatGPT-ConvertEngine`
- Date: `2026-06-14`
- Status: Full-Rust target documented; Rust engine contract baseline created

## Current truth

TranslateIT now has a Rust/Tauri conversion scaffold at:

```text
EngineData/LauncherApp/RustApp/
```

The current Python implementation remains the behavior reference during migration. The final runtime target is Rust-owned and must not require Python to operate.

## Full-Rust target meaning

`Full Rust` means Rust owns the desktop app, lifecycle state, configuration, data flow, cache/log/save behavior, and adapter boundaries. CUDA inference may use native CUDA-capable libraries through Rust FFI or native bindings, but the final packaged app must not depend on Python runtime execution.

## Files added for this baseline

```text
EngineData/LauncherApp/RustApp/README.md
EngineData/LauncherApp/RustApp/package.json
EngineData/LauncherApp/RustApp/tsconfig.json
EngineData/LauncherApp/RustApp/index.html
EngineData/LauncherApp/RustApp/src/main.ts
EngineData/LauncherApp/RustApp/src/styles.css
EngineData/LauncherApp/RustApp/src-tauri/Cargo.toml
EngineData/LauncherApp/RustApp/src-tauri/build.rs
EngineData/LauncherApp/RustApp/src-tauri/tauri.conf.json
EngineData/LauncherApp/RustApp/src-tauri/src/main.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/mod.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/state.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/config.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/cuda_policy.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/mod.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/asr.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/translation.rs
EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/tts.rs
DevelopingData/ToolKitData/Scripts/Execution/check_rust_app.py
DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/RUST_TAURI_ENGINE_CONVERSION_PLAN.md
DevelopingData/DocumentationData/LogData/RUST_TAURI_CONVERSION_LOG.md
```

## Current limitation

The RustApp has a frontend, Rust command bridge, state/config contracts, CUDA policy boundary, and adapter contracts. The full runtime engine has not yet been converted.

## Next step

Continue with Rust path resolution, persisted settings, logging/reporting, and runtime data models before implementing native audio, ASR, translation, and output adapters.

# TranslateIT V1-Advance Tauri Package Preflight Repair Audit

Branch: `V1-Advance`
Status: repair after Tauri Package Preflight gate failed

## Problem

The first Tauri Package Preflight validator checked for:

```text
get_webview_window("main")
```

inside:

```text
src-tauri/src/main.rs
```

But the current Rust structure keeps the main window bootstrap logic in:

```text
src-tauri/src/app_bootstrap.rs
```

and `main.rs` calls:

```text
app_bootstrap::configure_main_window
```

## Repair

The validator now checks:

```text
src-tauri/src/main.rs
src-tauri/src/app_bootstrap.rs
```

It validates that `main.rs` imports and calls the bootstrap module, then validates that `app_bootstrap.rs` targets the `main` webview window.

## Not claimed

This repair does not run `tauri build`, installer generation, full Rust cargo check, CUDA, model loading, microphone capture, virtual microphone routing, TTS provider runtime, or target-PC latency validation.

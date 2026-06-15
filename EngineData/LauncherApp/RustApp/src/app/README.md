# TranslateIT Frontend Modules

This folder is split by responsibility so the desktop app is easier to maintain.

## `launcher/`
Launcher desktop UI modules. These files own the application shell, DOM bindings, and visual views used by the Tauri window.

## `engineTranslate/`
Bridge layer between the Launcher UI and the Rust/Tauri translation runtime commands. UI code should call this layer instead of directly scattering command names across many files.

## `shared/`
Shared types, icons, and generic helpers that can be reused by Launcher and engine-facing modules.

## Root `main.ts`
The application entry/controller only. It should coordinate state and events, not contain large SVG registries, shell markup, or command definitions.

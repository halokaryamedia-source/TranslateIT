# TranslateIT Tauri Desktop Application

This directory is the current desktop application package on branch `New`.

## Ownership

```text
index.html -> src/main.ts
-> one normal frontend module entry

src/app/simple-launcher/
-> current desktop controller, global Meeting state, and Live transcript presentation

src/app/bridge/
-> one thin runtime API + one product facade

src/app/active-launcher/
-> current Meeting/Text/Settings shell and bounded settings/diagnostics renderers

src/app/first-setup/
-> first-use Meeting setup

src-tauri/src/commands/
-> bounded Tauri command surface

src-tauri/src/engine/
-> runtime/audio/session implementation; deeper inherited dead graph is the next cleanup boundary

scripts/
-> proportional core source/preflight checks plus explicit local compile entrypoint
```

The canonical architecture is one Rust/Tauri desktop application plus one Python local worker. Do not add parallel launchers, worker services, route controllers, readiness systems, or feature bridges to preserve retired behavior.

## Current Product Surface

Normal product UI is Meeting / Text / Settings. Audio Studio, History/Saved, Documents, tone/mode controls, and dev pipeline control surfaces are not initial core and are not separate frontend entries.

## UI Boundary

Visual truth comes from source actually imported by `src/main.ts` and its current callers. Names such as `referenceLayout.css` or `lockedReferenceShellParts.ts` do not make a file historical while the current UI still imports/calls it. Visual/CSS pruning should use rendered proof where removing a reachable stylesheet could change the current interface.

## Proof Boundary

Static source checks do not prove TypeScript/Rust compilation, Tauri launch, Windows audio, model execution, latency, rendered UI, installer behavior, or clean-machine operation. Local/generated proof remains derived output and must not become source authority.

Resume work through root `AGENTS.md`, `CONTEXT.md`, and `docs/knowledge/next-action.md`.

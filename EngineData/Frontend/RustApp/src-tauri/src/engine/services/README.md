# Engine Services Boundary

This folder is reserved for Rust orchestration/use-case modules.

## Purpose

`services` should own application-level coordination that is too large for a Tauri command wrapper but not pure enough for a domain module.

Examples:

- translation flow orchestration;
- capture lifecycle orchestration;
- helper bridge startup/status orchestration;
- model readiness orchestration;
- Audio Studio provider/quality gate orchestration.

## Rules

- Tauri `commands/` call services.
- Services can call `domain`, `io`, adapters, and runtime state modules.
- Services return structured results and UI-safe errors through command wrappers.
- Services should not directly render UI or assume frontend DOM state.

## Migration rule

Move logic here gradually from oversized command files or broad adapter modules. Each migration must preserve command names and response shapes unless the frontend is updated in the same reviewed change.
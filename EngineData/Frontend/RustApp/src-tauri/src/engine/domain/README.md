# Engine Domain Boundary

This folder is reserved for pure Rust domain types, invariants, and decision rules.

## Purpose

Domain modules should contain logic that can be tested without Tauri, DOM, subprocesses, filesystem writes, Python workers, or local model availability.

Good candidates:

- language-pair rules;
- readiness state transitions;
- validation result types;
- runtime profile rules;
- user-safe status normalization;
- contract DTOs shared by services and commands.

## Rules

- No Tauri imports.
- No filesystem writes.
- No process spawning.
- No frontend assumptions.
- Prefer deterministic input/output functions.

## Migration rule

When command or adapter files contain pure rules, move those rules here first before changing runtime behavior. This reduces future regression risk and keeps the app modular.
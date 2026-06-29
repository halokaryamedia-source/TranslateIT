# V1-Advance Non-Local Completion Plan

Branch: `V1-Advance`
Status: active non-local work plan

## Purpose

This plan separates work that can be completed without local target-PC execution from work that must wait for local Windows/runtime evidence.

The goal is to finish as much non-local work as possible first while keeping primary CI green.

## Non-local work rules

Non-local work may include:

- documentation cleanup,
- source-of-truth indexing,
- CI-safe validators,
- TypeScript/frontend compile-safe fixes,
- Rust manifest and module linkage cleanup,
- command registry cleanup,
- contract and schema cleanup,
- UI text and state-flow cleanup that can be validated by TypeScript/build,
- non-runtime scripts that do not claim local readiness.

Non-local work must not claim:

- local Rust/Tauri cargo check pass,
- target-PC helper worker spawn pass,
- CUDA readiness,
- model loading readiness,
- microphone capture readiness,
- virtual microphone readiness,
- TTS quality/readiness,
- final installer readiness,
- target-PC latency evidence.

## Already completed non-local baseline

- `V1-Advance` is the active source branch.
- Primary CI preflight is green.
- Active documentation index exists.
- Runtime readiness report exists.
- Local Tauri compile proof command exists.
- Local compile error intake template exists.
- Stable active text command path is `commands::text_translate::translate_text`.
- Unstable `commands::translation` module was removed from active module registration.
- Helper bridge lifecycle and worker diagnostic commands are available.
- Developer settings expose helper worker controls.

## Remaining non-local work before local validation

1. Keep primary CI green.
2. Keep non-local docs/index consistent.
3. Add or maintain validators that can run without local models/runtime.
4. Check stale references to removed modules or old runtime paths.
5. Clean up docs that still imply local runtime readiness.
6. Keep active contracts aligned with `V1-Advance`.
7. Keep package scripts clearly separated between CI-safe, report-only, local-only, and deferred work.
8. Keep helper worker command contracts documented without claiming runtime success.
9. Keep UI text clear about blocked/pending/degraded states.
10. Prepare local handoff docs so target-PC validation can start immediately after non-local cleanup.

## Handoff point to local work

The non-local phase should hand off to local work only when:

- CI remains green,
- active docs are indexed,
- no known stale references remain in source-of-truth docs,
- local compile command and error intake template are documented,
- the next requested evidence is explicit: run `npm run check:tauri-rust-local` on Windows and send the first real Rust error if it fails.

## Next local-only milestone

After this non-local phase, the first local-only milestone is:

```text
Run npm run check:tauri-rust-local on Windows and fix the first real Rust compile error from logs.
```

Do not reintroduce helper-backed translation, voice synthesis chaining, installer build claims, or target latency claims until local proof logs exist.

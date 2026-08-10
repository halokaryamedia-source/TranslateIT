# TranslateIT — Next Action

## Current Status

The initial product remains Meeting / Text / Settings with required Indonesian -> English Meeting voice, optional incoming English -> Indonesian text, and bidirectional Text translation.

P0 and P0.1 source simplification are now aligned:

- production Tauri registry reduced to current Meeting/Text/setup commands;
- Audio Studio, History/Chat, professional-readiness, dev seed/handoff/smoke, generic capture handoff, hardware/full diagnostics, manual route control, model setup, and GPU-policy commands are removed from the invoke surface;
- `index.html` has one frontend module entry (`src/main.ts`); the retired Audio Studio entry, 200ms retry polling, theme injection, and bindings are removed;
- duplicate frontend runtime/route/pipeline/chat/history bridge files are removed;
- `runtimeApi.ts` exposes only current direct callers and reuses the existing shared Tauri command/error bridge instead of maintaining a second error store;
- normal readiness reads settings + Meeting + helper + input + worker capability only;
- Settings UI is reduced to Meeting / Advanced / bounded Diagnostics; old Realtime/Quality, Push-to-Talk, Audio Studio and dev-pipeline control presentation is removed from those active renderer owners;
- duplicate frontend window-rescue/startup-trace runtime is removed; native window setup remains in `app_bootstrap.rs`;
- the matrix/report-heavy script system is replaced by a small core source-validation set plus separate package/path and local compile proof commands;
- the durable decision log is compacted so superseded feature/release-hash decisions do not consume normal task context;
- initial release explicitly has no SHA-256/checksum/revision identity framework.

No Rust compile, TypeScript typecheck, validator execution, Python tests, Tauri launch, Windows audio acceptance, model execution, or clean-machine release proof was obtained through ChatGPT -> GitHub.

## Current Mode

**Developing** for the next bounded internal cleanup slice.

Execution channel:

```text
ChatGPT -> GitHub
```

## Closed P0.1 — Dead Frontend / Command / Validator Pruning

The active desktop no longer keeps a second Audio Studio startup path or frontend methods for commands that do not exist in the production registry.

The current persistent validator set is intentionally small:

```text
validate_startup_runtime_readiness.mjs
validate_virtual_route_contract.mjs
validate_rust_manifest_preflight.mjs
validate_frontend_build_preflight.mjs

separate boundary:
validate_tauri_package_preflight.mjs

local-only compile proof:
run_local_tauri_compile_check.mjs
```

This is source alignment only. The validators were updated but not executed in this channel.

## Next Step — P0.2 Internal Engine Dead-Graph Pruning

### Goal

Remove deeper Rust engine modules and compatibility state that became unreachable after the product/command/frontend pruning, without changing the working Meeting audio/session/translation path.

### Start Boundary

```text
engine/mod.rs
-> identify direct consumers from CURRENT command/core owners
-> separate active Meeting/audio/settings/path/runtime modules from old planning/simulation/persistence leaves
-> remove proven dead leaf groups
-> reduce/remove blanket #![allow(dead_code)] only as the graph permits
```

### High-Value Candidates To Prove, Not Assume

- `history_store.rs` and History-only persistence graph;
- `session_chat.rs`;
- old transcript/session-save planning graph;
- old dry-run/orchestration/migration/readiness adapters that were only used by removed commands;
- empty `domain/` and `services/` scaffolding;
- native-candidate/status/report modules with no remaining current caller;
- stale backend RuntimeContracts for removed Audio Studio/attachment/dev orchestration, after checking no current runtime loader consumes them.

### Constraints

- do not touch `meeting_session.rs` behavior unless a proven dead dependency is removed from it;
- preserve physical microphone, finalized utterance, Meeting Sound, VAD/segmentation, live segment writing, helper scheduler, worker, Text translation, settings persistence required by current UI, path owner, and Meeting Microphone route;
- do not combine persisted settings schema migration into blind field deletion; first establish which inherited fields still deserialize/save and which callers remain;
- no replacement abstraction/framework;
- no new SHA/checksum/revision work;
- no local/runtime success claim from static deletion.

### Acceptance

1. every deleted engine module is proven unreachable from current command/core owners;
2. active Meeting/Text owners keep one direct dependency path and no compatibility replacement is added;
3. blanket dead-code allowance is reduced only where the remaining graph supports it;
4. stale runtime contracts are removed only when no current loader/validator consumes them;
5. canonical context/ownership remains aligned and local compile/runtime proof remains explicit.

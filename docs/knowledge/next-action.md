# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slice 1 is source-aligned: standalone Text now has one persistent-worker execution route and the manual/one-shot worker fallbacks are retired.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> bounded Slice 2 readiness/capability owners + direct consumers only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Static source may establish ownership and
wiring only; actual helper startup, model inference/quality, latency, CUDA/CPU
behavior, process cancellation timing, Windows audio, and installed operation remain
`LOCAL PROOF REQUIRED`.

## Approved Engine Consolidation Target

```text
Rust/Tauri product runtime
        |
        v
existing helper bridge / later scheduler
        |
        v
ONE persistent Python worker
        |
        +-- ASR
        +-- Translation
        +-- TTS
        |
        v
product result / Meeting route
```

Still locked:

- one persistent worker process/protocol;
- no fake/manual/rule-based product translation fallback;
- no automatic cross-mode fallback merely to obtain output;
- Meeting session/generation authority remains in the existing Meeting owner;
- Windows audio remains outside AI ownership;
- model replacement waits for bounded evaluation evidence;
- Python/Rust tooling stays under existing skill governance;
- Svelte is not part of Engine consolidation and may be reconsidered later as a
  separate frontend architecture decision after Engine contracts stabilize.

## Slice 1 — Completed Source Boundary

Canonical standalone Text path is now:

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust commands/text_translate.rs
-> existing persistent helper bridge
-> realtime_local_worker.py `translate`
-> one result
```

Current source facts:

- `bridge_paths.rs` launches `realtime_local_worker.py` directly;
- `realtime_local_worker_entry.py` is removed;
- `realtime_local_worker_accelerated.py` is removed as a standalone worker owner;
- `commands/text_translate.rs` no longer falls back to `engine::translate_text`;
- `engine/manual_translation.rs` and `manual_translation_accelerated.rs` are removed;
- their engine module registration/re-export is removed;
- Text helper/model/direction/response failure stays blocked instead of producing a
  rule/dictionary preview result;
- the canonical Text command does not retry another translation mode;
- the reachable translation-flow source validator now checks this real static
  ownership instead of requiring the retired `engine::translate_text` fallback or
  migration handoff markers.

Important bounded limitations:

- `runtime_profile` still reaches Text for compatibility; caller-owned `Text ->
  Quality` / `Meeting -> Realtime` belongs to Slice 3;
- helper locking/scheduling and cancellation remain unchanged until Slice 3;
- `adapters/translation_logic.rs` may remain as inherited/dead adapter source but is
  no longer an active Text product fallback; inspect any remaining direct consumer
  before later deletion;
- legacy capture/voice one-shot and migration/stub paths remain outside Text and are
  not claimed consolidated by Slice 1.

## Proof State

**CURRENT-PROJECT VERIFIED** at static-source level:

1. Text `translate_text` has one persistent-helper execution route.
2. The persistent helper resolves to the base `realtime_local_worker.py` entry.
3. Manual Rust translation and standalone entry/accelerated Python worker owners are
   absent from the active source tree.
4. No rule-based/manual fallback remains reachable from the standalone Text command.
5. The updated reachable source validator describes the same ownership contract.

No build/test command was executed through the current ChatGPT -> GitHub channel.
Therefore Rust compile, frontend typecheck, helper startup, Python import/model load,
and actual translation remain `LOCAL PROOF REQUIRED`.

## Hold

- do not reintroduce removed translation owners as compatibility fallback;
- do not change models to hide readiness problems;
- do not add another readiness gate or runtime manifest;
- do not solve scheduler/mode/tooling work inside the readiness slice unless required
  to remove a readiness contradiction;
- do not resume finalized-utterance/Meeting feature expansion yet;
- do not start local Windows acceptance yet.

## Next Step

Start **Engine Consolidation Slice 2 — capability/readiness truth**. Reconcile static
model installation evidence, current persistent-worker capability/load state, helper
status, Meeting preflight, and `runtimeProductFacade` so each claim has one semantic
truth path. Remove stale source/runtime snapshots and migration/professional gates
from normal product readiness without redesigning scheduler/cancellation or modes in
the same slice.
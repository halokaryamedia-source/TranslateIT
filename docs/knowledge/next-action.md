# TranslateIT — Next Action

## Current Status

The initial product remains Meeting / Text / Settings with required Indonesian -> English Meeting voice, optional incoming English -> Indonesian text, and bidirectional Text translation.

P0 through P0.4 source simplification are now aligned:

- production Tauri/frontend surface is reduced to current Meeting/Text/setup behavior;
- Audio Studio, History/Chat, document/attachment helpers, professional-readiness, old pipeline/debug command families, and duplicate frontend runtime paths are removed;
- normal readiness no longer performs broad diagnostic/model/GPU polling;
- validation tooling is reduced from matrix/report-heavy infrastructure to a small source/preflight set;
- the Rust engine root is reduced to current audio/session/settings/path owners;
- the old Rust adapters/planning/readiness/orchestration graph and duplicate backend RuntimeContracts are removed;
- persisted settings schema is version 6 with only Text direction, First Setup state/checkpoint, microphone preference, and Meeting Sound preference;
- the old realtime-handoff state, no-state `clear_runtime_handoff_state()` function, no-state `pipeline_handoff.rs` module, and their Meeting rollback/Stop calls are removed;
- no replacement cleanup service, migration framework, second settings store, or handoff compatibility alias was created;
- initial release still has no SHA-256/checksum/revision identity framework.

No Rust compile, TypeScript typecheck, validator execution, Python tests, Tauri launch, Windows audio acceptance, model execution, or clean-machine release proof was obtained through ChatGPT -> GitHub.

## Closed P0.4 — No-State Handoff Tombstone Removal

`meeting_session.rs` no longer imports or calls:

```text
reset_live_pipeline_handoff_status()
clear_runtime_handoff_state()
```

The source owner files are also gone where appropriate:

```text
commands/pipeline_handoff.rs -> removed
commands/mod.rs -> no pipeline_handoff module declaration
engine/runtime_state.rs -> no clear_runtime_handoff_state() compatibility function
```

No real cleanup resource was replaced. Meeting rollback/Stop still directly owns the existing sequence of authority revocation, route cancellation where applicable, microphone/Meeting Sound stop, helper cancellation, consumer cleanup, finalized/transient state cleanup, and runtime-session clear.

The current source validator definition now forbids the handoff tombstones from returning. The validator was updated but not executed in this channel.

## Current Mode

**Plan** for the next installed-runtime boundary.

Execution channel:

```text
ChatGPT -> GitHub
```

No project specialist is used by default while this boundary remains in Plan.

## Next Step — Plan Minimal Packaged Worker Execution

### Goal

Choose the smallest reliable way for an installed TranslateIT build to start the one existing Python local worker without requiring the user to install Python, create a virtual environment, set environment variables, or operate Hugging Face/Python tooling manually.

### Current Boundary

`bridge_paths.rs` currently discovers worker Python through development-friendly candidates:

```text
TRANSLATEIT_WORKER_PYTHON
WorkerRuntime/.venv/.../python
system python
system python3
Windows py -3
```

This is acceptable for development but is not a clean installed-user contract.

The installed path foundation already exists:

```text
Tauri resource/runtime root -> immutable worker/runtime assets
app local data root -> writable cache/log/state
```

Do not reopen that path architecture unless evidence proves it insufficient.

### Plan Questions

1. What is the smallest prepared worker execution payload that can be shipped beside the app: a packaged Python runtime/environment or a frozen worker executable?
2. Which option best preserves the current single worker, current Python dependencies, model loading behavior, and simple debugging without creating another runtime architecture?
3. What exact resource path should `bridge_paths.rs` treat as canonical for installed execution, while keeping a bounded development fallback only for debug/development builds?
4. What files/dependencies must be present in the prepared payload so the installed user never depends on system Python or `.venv` creation?
5. What local proof is required before calling installed worker execution ready: package presence, helper process start, worker status, translation call, and clean-machine execution?

### Constraints

- keep one Python local worker; do not rewrite ASR/translation/TTS in Rust;
- no downloader, package manager, artifact registry, checksum framework, or generic plugin/runtime manager;
- no user-facing Python/model/runtime controls;
- no system-Python requirement for normal installed use;
- keep development convenience only if it is explicitly development-scoped and does not become installed runtime truth;
- do not change model family or Meeting/Text behavior in this Plan;
- prefer the smallest prepared payload that works with the existing release/resource owners.

### Plan Acceptance

1. one canonical installed worker executable/runtime path is selected;
2. development fallback scope is explicit and cannot silently become production success;
3. required worker dependencies and payload responsibility are bounded without a new framework;
4. the next Developing slice is small enough to implement through existing `bridge_paths.rs` / helper / package owners;
5. local and clean-machine proof requirements are explicit and separate from source alignment.

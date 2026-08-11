# TranslateIT — Next Action

## Current Status

The initial product remains Meeting / Text / Settings with required Indonesian -> English Meeting voice, optional incoming English -> Indonesian text, and bidirectional Text translation.

P0 through P0.3 source simplification are now aligned:

- production Tauri/frontend surface is reduced to current Meeting/Text/setup behavior;
- Audio Studio, History/Chat, document/attachment helpers, professional-readiness, old pipeline/debug command families, and duplicate frontend runtime paths are removed;
- normal readiness no longer performs broad diagnostic/model/GPU polling;
- validation tooling is reduced from matrix/report-heavy infrastructure to a small source/preflight set;
- the Rust engine root is reduced to current audio/session/settings/path owners;
- the old Rust adapters/planning/readiness/orchestration graph and duplicate backend RuntimeContracts are removed;
- persisted settings schema is reduced to version 6 with only Text direction, First Setup state/checkpoint, microphone preference, and Meeting Sound preference;
- previous settings JSON is tolerated by the same Serde owner through unknown-key compatibility and the next normal save writes only the small schema;
- `runtime_profile`, History flags, sensitivity/mode flags, CPU/degraded toggles, autoplay flags, and custom voice/profile persistence are removed from current Rust/frontend settings contracts;
- no generic settings migration framework or second settings store was created;
- initial release still has no SHA-256/checksum/revision identity framework.

No Rust compile, TypeScript typecheck, validator execution, Python tests, Tauri launch, Windows audio acceptance, model execution, or clean-machine release proof was obtained through ChatGPT -> GitHub.

## Closed P0.3 — Persisted Settings Schema Simplification

Current persisted shape:

```text
schema_version = 6
source_language
target_language
meeting_setup_state
meeting_setup_checkpoint
audio.input_device_id
audio.output_device_id
```

Current direct responsibilities are:

```text
Text -> source_language / target_language
First Setup -> meeting_setup_state / meeting_setup_checkpoint / both device ids
Microphone capture -> input_device_id
Meeting Sound capture -> output_device_id
Meeting Settings -> both device ids
```

`engine/settings.rs` remains the only schema/deserialization/sanitization owner. Its bounded compatibility test defines the immediately previous larger JSON shape and verifies that a subsequent save does not persist the retired keys. The test definition was added but not executed in this channel.

## Current Mode

**Developing** for one final bounded compatibility tombstone cleanup before returning to runtime/package acceptance work.

Execution channel:

```text
ChatGPT -> GitHub
```

## Next Step — P0.4 No-State Handoff Tombstone Removal

### Goal

Remove the last old pipeline/handoff cleanup calls that now own no state, without changing actual Meeting Start/Stop resource behavior.

### Current Residue

`meeting_session.rs` still calls:

```text
reset_live_pipeline_handoff_status()
clear_runtime_handoff_state()
```

The old pipeline/handoff owners have already been removed. `commands/pipeline_handoff.rs` is only a no-state reset hook and `engine/runtime_state.rs::clear_runtime_handoff_state()` is a no-op compatibility function.

### Method

Remove only the direct imports/calls, then remove the no-state module/function declarations. Do not introduce a replacement cleanup service or compatibility alias.

### Out Of Scope

- changing Meeting lifecycle states or authority semantics;
- changing rollback order for real resources;
- changing microphone or Meeting Sound capture;
- changing helper cancellation/join behavior;
- changing Meeting Microphone routing;
- changing worker/model behavior;
- packaging/download/hash architecture;
- claiming local compile/runtime proof.

### Acceptance

1. `meeting_session.rs` no longer calls either no-state handoff reset;
2. `commands/pipeline_handoff.rs` and its module declaration are removed;
3. `engine/runtime_state.rs` no longer exposes `clear_runtime_handoff_state()`;
4. real Stop/rollback cleanup order remains otherwise unchanged and source validation/canonical docs reflect the removal;
5. local compile/Tauri/Windows runtime proof remains explicit and separate.

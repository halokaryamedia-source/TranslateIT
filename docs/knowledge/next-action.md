# TranslateIT — Next Action

## Current Status

The initial product remains Meeting / Text / Settings with required Indonesian -> English Meeting voice, optional incoming English -> Indonesian text, and bidirectional Text translation.

The following simplification slices are source-aligned:

- Pause/Resume removed from the normal Meeting lifecycle.
- Meeting Stop no longer depends on History persistence.
- optional incoming suppression failure cannot block healthy outbound.
- release payload SHA-256/checksum/revision identity work is rejected for the initial release.
- production Tauri registration has been reduced to the current core and explicit setup/diagnostic commands.
- old development pipeline/capture command surfaces have been removed from active command modules.
- normal frontend readiness no longer requests full Diagnostics, model inventory, GPU policy, or status bundles.
- normal Meeting model inventory reads are cached; explicit Verify Models refreshes the inventory.
- startup diagnostics no longer mirror trace records into Rust IPC.
- model-manifest `revision` / `checksum` placeholders are removed.

No Rust compile, TypeScript typecheck, Python tests, Tauri launch, Windows audio acceptance, or clean-machine release proof was executed through the GitHub channel.

## Closed P0 — Core Surface Pruning

Production Tauri registration is now intentionally limited to:

```text
explicit runtime diagnostics
helper status/start/worker status
Meeting status/committed turns/Start/Stop
Verify Models
input status/device list/device probes
settings load/save
Mic Test capture Start/Stop
Text Translate
```

Deferred/debug families such as Audio Studio, History/Chat, professional-readiness orchestration, development seed/handoff/smoke commands, generic capture handoffs, manual virtual-route commands, audio evidence, model setup, and native GPU-policy commands are no longer in the production invoke surface.

`runtime_capture.rs` now owns only the two active capture wrappers. `pipeline_handoff.rs` now owns only the reset hook still called by Meeting cleanup. `diagnostics.rs` now exposes only the explicit runtime-diagnostics command required by the current product surface.

Normal `loadProductRuntimeSnapshot()` is reduced from the previous broad diagnostic snapshot to the minimum product reads:

```text
settings
+ Meeting session
+ helper status
+ microphone/input status
+ worker capability status when helper is ready
```

Model installation presence remains a Meeting preflight fact but is cached in Rust so 1.2-second Meeting status polling does not repeatedly rescan model directories or rewrite evidence files.

## Release Simplification

Do not resume the previous payload-identity plan.

Initial release has no requirement for:

- SHA-256 archive identity;
- checksum registry;
- pinned source-revision contract as a separate product subsystem;
- artifact identity controller/service;
- replacement hash framework.

The local sidecar Setup topology remains: approved prepared runtime assets are placed into the existing application-local runtime layout and then validated by real worker/runtime execution during the later local acceptance phase.

## Next Step — P0.1 Dead Source And Validator Pruning

Remove the now-unreachable implementation and validation scaffolding that remains after active-surface pruning, without changing the working Meeting/Text pipeline.

### In Scope

1. prove direct reachability of remaining old command/engine/frontend files;
2. delete or disconnect unreachable Audio Studio, History/Chat, old pipeline/capture, professional/native-candidate, preview, and related compatibility source that no active owner needs;
3. remove stale frontend bridge methods/types/styles that only target commands no longer registered;
4. reduce blanket `allow(dead_code)` only after the relevant module graph is proven clean;
5. collapse redundant static validation profiles that only protect removed/deferred surfaces, while retaining proportional compile/type/worker/core contract checks;
6. reconcile the older decision-log release-hash wording with the current no-hash initial-release decision.

### Out of Scope

- changing ASR/translation/TTS models;
- changing Meeting audio routing or suppression behavior;
- changing Start/Stop safety;
- removing optional incoming EN -> ID;
- broad visual redesign;
- adding packaging/checksum/release-identity architecture;
- claiming local Windows acceptance.

### Acceptance

- no remaining active import/module/registry path requires the removed deferred subsystems;
- normal Meeting/Text behavior keeps one owner per responsibility;
- production frontend does not expose bridge methods for knowingly removed product commands unless a direct current caller proves compatibility is required;
- validation commands reflect the current small product surface rather than historical features;
- removal reduces source/maintenance surface instead of replacing it with new abstraction;
- local compile/runtime proof remains explicitly separate.

# TranslateIT — Next Action

## Current Status

The initial product remains Meeting / Text / Settings with required Indonesian -> English Meeting voice, optional incoming English -> Indonesian text, and bidirectional Text translation.

P0 through P0.2 source simplification are now aligned:

- production Tauri/frontend surface is reduced to current Meeting/Text/setup behavior;
- Audio Studio, History/Chat, document/attachment helpers, professional-readiness, old pipeline/debug command families, and duplicate frontend runtime paths are removed;
- normal readiness no longer performs broad diagnostic/model/GPU polling;
- validation tooling is reduced from matrix/report-heavy infrastructure to a small source/preflight set;
- the Rust engine root is reduced to audio, Mic Test lifecycle, logging, paths, runtime settings/state, settings, and shared command state;
- the entire old Rust adapters/planning/readiness/orchestration graph is removed;
- History/chat/session-save/transcript-session/native-inference/CUDA/status/runtime-job/domain/services engine scaffolding is removed;
- obsolete audio calibration/capture-plan/device-config/noise/preprocess/stream-build planning leaves are removed;
- engine-root blanket `#![allow(dead_code)]` is removed;
- Mic Test Stop cannot clear an application Meeting-owned session;
- backend `RuntimeContracts/` duplicate JSON architecture scaffolding is removed after current worker/Tauri/validator reachability showed no active consumer;
- initial release still has no SHA-256/checksum/revision identity framework.

No Rust compile, TypeScript typecheck, validator execution, Python tests, Tauri launch, Windows audio acceptance, model execution, or clean-machine release proof was obtained through ChatGPT -> GitHub.

## Closed P0.2 — Internal Engine Dead-Graph Pruning

Current Rust engine root:

```text
engine/
├─ audio/
├─ capture_lifecycle.rs
├─ logging.rs
├─ paths.rs
├─ runtime_settings.rs
├─ runtime_state.rs
├─ settings.rs
└─ state.rs
```

`commands/audio.rs` now exposes only the current device/status operations required by the product. Mic Test uses direct capture ownership instead of the old handoff/planning gate. `runtime_state.rs` no longer stores a RealtimeHandoffReport or a second handoff snapshot architecture.

One no-state `clear_runtime_handoff_state()` compatibility boundary remains because current Meeting rollback/Stop still calls it. It owns no state and is not permission to recreate the removed handoff architecture.

## Current Mode

**Developing** for the next bounded compatibility cleanup.

Execution channel:

```text
ChatGPT -> GitHub
```

## Next Step — P0.3 Persisted Settings Schema Simplification

### Goal

Reduce the persisted/frontend `RuntimeSettings` contract to settings that still have a current Meeting/Text/setup caller, while loading old settings safely once through the existing settings owner.

### Direct Candidates To Prove

Current inherited fields include:

```text
language_focus_mode
runtime_profile
history_enabled
sensitivity
input_sensitivity
show_advanced_devices
allow_low_but_usable_input
allow_cpu_degraded_mode
auto_play_translation_voice
auto_play_out_voice
use_custom_voice_actor
voice_actor_profiles_root
voice_actor_profile_id
```

Do not assume every field is dead. Check `engine/audio/*`, First Setup, Meeting Settings, Text direction, worker/route callers, and settings save/load before removal.

### Intended Minimum Shape

Keep only state with a current product responsibility, expected to center on:

```text
schema version
Text source/target language
First Setup state/checkpoint
physical microphone preference
Meeting Sound preference
```

Any additional retained field must have a current direct caller.

### Migration Rule

Do not create a generic migration framework. Use the existing `engine/settings.rs` deserialization/sanitization owner to tolerate the immediately previous JSON shape and save the new small shape. Do not preserve obsolete product concepts as permanent aliases after that bounded compatibility read.

### Out Of Scope

- changing Meeting audio/VAD/suppression behavior;
- changing ASR/translation/TTS models;
- changing worker scheduling;
- changing Meeting Microphone route behavior;
- removing optional incoming;
- packaging/download/hash architecture;
- claiming local compile/runtime proof.

### Acceptance

1. every persisted field retained has a current direct caller;
2. removed fields do not remain in frontend defaults/types or normal settings save output;
3. an existing old settings JSON can fall back/migrate without a second settings store or generic migration framework;
4. Text direction, device preferences, and First Setup state remain owned by the same settings path;
5. source validation/canonical docs reflect the smaller schema and local compile/runtime proof remains separate.

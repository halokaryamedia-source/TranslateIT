# TranslateIT — Current Context

This file stores stable current project facts. Task continuation belongs in `docs/knowledge/next-action.md`; durable reasoning belongs in `docs/knowledge/decision-log.md`.

## Authority

- Development authority: branch `New`.
- `V1-Advance` and `DevelopingData` are historical/recovery evidence only.
- Current product policy is defined by `docs/foundation/01-product-overview.md` and `docs/foundation/02-product-requirements.md`.

## Product Target

TranslateIT is a simple local Windows translator focused on Indonesian and English.

```text
Meeting
├─ Start Translation
├─ ID speech -> final ID transcript -> EN translation -> EN TTS
├─ translated voice -> TranslateIT Meeting Microphone
├─ optional EN Meeting Sound -> ID text
└─ Stop Translation

Text
├─ ID <-> EN
├─ Translate
└─ Copy

Settings
├─ Meeting devices/setup
└─ Advanced diagnostics
```

The normal Meeting lifecycle is:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Pause/Resume, History/Saved, Audio Studio, Documents, Tone/Context, partial translated subtitles, and user-facing Realtime/Quality modes are not part of the initial core.

## Runtime Architecture

The canonical runtime remains:

```text
Rust/Tauri desktop application
+
Python local worker
```

The local worker owns ASR, translation, and TTS execution. Rust owns desktop lifecycle, audio/session authority, device routing, and product integration. Do not create a second engine or product shell.

## Translation Runtime

- Required Meeting outbound direction is Indonesian -> English.
- Text supports Indonesian -> English and English -> Indonesian.
- Translation model selection is direction-based; old Realtime/Quality labels do not choose a different model.
- Required outbound uses finalized speech only.
- Optional incoming EN -> ID may degrade or disable without blocking safe outbound.
- Previous Meeting turns are not fed back as translation context.

## Meeting Ownership

`commands/meeting_session.rs` remains the canonical application Meeting/session owner.

- Start establishes one application Meeting session and outbound authority.
- Navigation does not stop or recreate an active Meeting.
- Stop revokes output authority before cleanup, stops audio lanes, cancels/joins Meeting work, clears transient committed turns, and clears the runtime session.
- Meeting Stop does not persist to History.
- Safe application close uses the same canonical Stop lifecycle.

## Current Runtime Surface

The production Tauri registration surface has been reduced to the commands required by the current product path: explicit Diagnostics, helper status/start/worker status, Meeting status/turns/Start/Stop, explicit model verification, audio device/status operations, settings load/save, Mic Test capture Start/Stop, and Text translation.

Deferred/debug command families such as Audio Studio, History/Chat, dev seed/pipeline smoke/handoff commands, professional readiness gates, manual virtual-route commands, model setup/GPU policy commands, audio evidence commands, and generic capture-handoff commands are no longer registered in the production invoke surface.

`commands/runtime_capture.rs` is now only the two Mic Test capture wrappers required by the active UI. `commands/pipeline_handoff.rs` remains only as the small reset hook still called by Meeting cleanup; the old development handoff state is removed from that module.

## Normal Readiness Cost

Normal product readiness now reads only:

```text
settings
+ Meeting session status
+ helper status
+ microphone/input status
+ worker capability status when helper is ready
```

Full Diagnostics, model inventory, GPU/native-backend probing, and status bundles are not part of the normal frontend readiness snapshot.

Meeting preflight still needs model-installation presence. That inventory is cached after its first read; repeated Meeting status polling does not rescan model directories or rewrite validation evidence. Explicit `Verify Models` refreshes the cache and may write diagnostic evidence.

Startup diagnostics remain local frontend traces only; normal startup no longer mirrors selected trace records back into Rust through Tauri IPC.

## Release Boundary

Initial release does **not** use a SHA-256/checksum/revision identity framework for the prepared runtime payload.

Do not introduce a replacement checksum service, artifact registry, payload identity controller, or similar framework merely to compensate for removing hashes. For the controlled initial release, the approved prepared payload and deterministic placement into the existing runtime layout are sufficient.

The local sidecar Setup topology remains valid: one user-facing Setup path should place the required worker/runtime/model assets under the application-local runtime root and then verify that the real worker can load and execute them. The hash/revision sub-plan previously associated with that topology is superseded by the current simplification decision.

## Proof Boundary

ChatGPT -> GitHub source work can establish source structure, ownership, and static contract alignment. It does not establish:

- Rust or TypeScript compilation;
- Python test execution;
- Tauri launch success;
- Windows audio/device behavior;
- packaged model presence/load/quality/latency;
- clean-machine Setup/install success.

Those remain local proof requirements and must not be inferred from source alone.

## Deferred Source

Some historical/deferred files still exist in the repository even though they are no longer registered or imported by the normal product path. Git history already preserves deleted behavior; remaining unreachable source should be removed only after direct reachability is checked, not by filename alone.

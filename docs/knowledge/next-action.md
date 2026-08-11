# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This changes proof timing only; it does not reduce release acceptance.

A comprehensive core/release audit is already established. Work continues one bounded P0 source-correctness slice at a time instead of expanding feature scope or treating every discovered issue as an unrelated roadmap item.

Meeting Core Runtime Reliability now has nine bounded source slices aligned:

```text
1. required AI preparation before Meeting Live
2. outbound freshness / bounded finalized-speech backpressure
3. outbound priority against in-flight optional incoming work
4. Stop-time helper lifecycle recovery
5. Meeting Microphone provider preflight before authority
6. duration-grounded Meeting Microphone delivery hang containment
7. in-session required-helper transport recovery
8. optional incoming failure isolation / freshness semantics
9. active runtime settings / public helper restart isolation
```

The ninth slice closes P0.2 at source level:

- Rust `select_audio_device` rejects microphone/Meeting Sound preference mutation while any runtime session still owns resources, preserving the current saved setting rather than attempting hot rebind;
- the public Tauri `start_helper_bridge` command is now routed through `commands/runtime.rs`, which defers manual/setup helper restart while a runtime session exists;
- internal Meeting recovery still calls the direct helper lifecycle path, so bounded Live recovery is not blocked by the public product guard;
- standalone Text may continue sharing a healthy helper, but if the helper is stopped it uses the guarded public restart path and cannot restart the worker underneath Meeting/Mic Test;
- Settings derives an active-resource lock from the current runtime snapshot, disables microphone/Meeting Sound mutation, Mic Test start, and `Check Setup`, and also guards handlers against stale invocation;
- non-mutating device discovery, microphone status checks, Diagnostics refresh, and model inventory inspection remain available;
- no pending-settings store, mid-session device rebind, second settings owner, or second helper lifecycle path was added.

These source slices are not target-Windows/runtime/release proof.

## Priority Map

Priority is based on impact on the approved small core rather than discovery order.

### P0 — Core source correctness before first integrated proof wave

#### P0.1 — Optional Incoming Failure Isolation — CLOSED SOURCE / LOCAL PROOF REQUIRED

Intentional outbound-priority deferral is a healthy stale incoming drop. Incoming helper transport failure restores the same shared worker before releasing incoming scheduler ownership, without retrying old incoming speech.

Deferred proof: force incoming write/read failure while outbound waits and verify same-worker restoration, no stale incoming retry/commit, and truthful failure if recovery itself fails.

#### P0.2 — Active Meeting Settings / Recovery Isolation — CLOSED SOURCE / LOCAL PROOF REQUIRED

Current boundary:

```text
active Meeting / Mic Test runtime session
-> existing audio resources remain authoritative
-> audio preference mutation rejected
-> Settings mutation/recovery controls unavailable
-> public/manual helper restart deferred
-> internal Meeting bounded recovery remains allowed
-> Stop releases session
-> normal setting/recovery actions become available again
```

Deferred proof: Start Meeting -> navigate Settings -> verify device mutation, Mic Test, Check Setup, public helper restart, and Text auto-restart cannot disrupt the session -> Stop -> verify those actions are available again.

#### P0.3 — Meeting Route Pair / Identity / Session Truth — ACTIVE NEXT

Current route discovery can independently choose a virtual-looking output endpoint and input endpoint from broad name keywords, then call the route ready when both exist. That does not prove they are a matched cable/functionally equivalent route. Normal UI also presents `TranslateIT Meeting Microphone` as a product endpoint even though the current source has not established that exact installed Windows device identity.

Required correction:

- establish one truthful canonical route pair/configuration contract;
- do not infer readiness from two unrelated virtual-looking endpoints;
- keep the active Meeting generation on a stable selected route rather than silently drifting to another discovered candidate;
- normal UI must describe the actual supported endpoint without pretending a custom named Windows device exists unless the release path truly provides it;
- do not build a new driver/audio daemon unless the approved functionally-equivalent Windows endpoint cannot satisfy the requirement.

#### P0.4 — Meeting Route Provider Preflight Hang Containment

Actual playback has a duration-grounded deadline, but provider preflight before Meeting authority still uses a synchronous process wait without a bounded process lifetime.

Required correction: bound preflight process lifetime, terminate/join on timeout, keep failure explicit before authority, and do not confuse this with a product latency threshold.

#### P0.5 — Sleep / Hibernate Authority Invalidation

Windows suspend/hibernate must invalidate Meeting output authority and wake must remain non-Live until a new explicit Start.

Do not add Pause/Resume.

### P1 — Core truthfulness, boundedness, and long-session hardening

#### P1.1 — Functional Setup Readiness Alignment

Explicit Check Setup/final setup verification should align with the stronger functional required-outbound Start contract without making normal lightweight status polling repeatedly spawn models/providers.

#### P1.2 — Helper Scheduler Admission Bounds

Execution is serialized and priority-aware, but waiting scheduler admission itself is not explicitly bounded/stale-aware. Add only the minimum caller-aligned bound; do not create a generic job framework.

#### P1.3 — Helper stderr Privacy / Disk Bounds

Rust runtime logs are bounded/redacted. Helper stderr remains generation-specific raw append output. Bring it under bounded privacy-safe diagnostics without logging conversation bodies.

#### P1.4 — Product-Release vs Meeting-Required Asset Semantics

EN->ID Marian correctly does not block required outbound Meeting Start, but bidirectional Text is still part of complete initial release. Distinguish `required for Meeting outbound` from `required for complete release` without creating a second inventory owner.

### P2 — Release-blocking materialization and executable proof

These remain mandatory release work even while the explicit hold postpones execution.

#### P2.1 — Frontend dependency / compile / rendered proof

```text
npm dependency materialization
-> regenerate/review package-lock
-> Svelte autofixer
-> svelte-check
-> Vite build
-> rendered UI / resize / keyboard / focus smoke
-> clipboard proof
```

#### P2.2 — Rust / Tauri executable proof

```text
Rust/Tauri compile
-> launch
-> Start / Stop / safe close
-> Settings active-session guards
-> resource/thread/handle cleanup
-> relevant fault paths
```

#### P2.3 — Canonical Python environment and model proof

```text
resolve/review uv.lock
-> private PythonRuntime environment
-> Ruff / deterministic worker tests where appropriate
-> real ASR
-> ID->EN translation
-> EN->ID translation
-> English TTS
-> CUDA preferred + CPU fallback behavior
```

Quality, code-switching, names/numbers/technical fidelity, latency, and CPU practicality require real target evidence.

#### P2.4 — Windows Meeting audio acceptance

```text
physical microphone
-> finalized-speech segmentation
-> outbound ASR / translation / TTS
-> selected Meeting route
-> real meeting-app input reception
-> optional Meeting Sound loopback
-> own-TTS suppression
-> incoming freshness/priority
-> safe Stop / Close / sleep
```

Inject the hardened failure cases: outbound/incoming helper transport failure, Stop during inference, provider stall, route disappearance, and backlog contention.

#### P2.5 — Latency / stability / long-session acceptance

Measure finalized utterance end -> first translated playback on target hardware. Verify memory, temp cleanup, worker restarts, callback errors, logs, and long-session stability before considering provider persistence, model replacement, VAD tuning, or broader optimization.

#### P2.6 — Installer / clean-machine materialization

Release must deliver one normal-user setup with private PythonRuntime, required models, TTS assets/provider, Meeting route support, Tauri resource staging, NSIS install, installed-runtime validation, and clean-machine proof. No manual Python/pip/env/repository/model placement.

### P3 — Cleanup / process hardening after core acceptance

- reconcile stale root `README.md` references to removed/deferred PTT, Documents, History/Saved, Tone, and Realtime/Quality product behavior;
- reconcile stale WorkerRuntime README mode/NLLB descriptions;
- remove stale internal preset terminology only when the current call graph proves it unnecessary;
- add CI only after current lockfiles/build commands stabilize;
- keep Documents, History/Saved, Audio Studio/custom voice, PTT, tone, context, additional languages, incoming TTS, and automatic mid-session Meeting Sound rebind deferred.

## Sequencing Rule

```text
finish bounded P0 source correctness
-> release local/integration hold
-> first integrated proof wave
-> fix measured/runtime failures
-> finish still-relevant P1
-> release packaging + clean-machine acceptance
```

Do not keep accumulating speculative source-only hardening after P0 while executable evidence is still absent.

## Current Mode

**Plan** — P0.2 is source-closed. Continue one bounded P0 source task at a time while the explicit local-test hold remains active.

Execution channel:

```text
ChatGPT -> GitHub
```

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, helper/provider fault injection, Windows audio/device test, installer test, performance measurement, or rendered UI inspection has been executed during the hold.

## Deferred Integrated Proof Queue

When the hold is explicitly released, execute P2 in dependency order. P0.2 adds a specific interaction test: keep Meeting Live while visiting Settings/Text, attempt device/setup/helper restart paths, confirm active resources stay unchanged, then Stop and confirm ordinary mutation/recovery becomes available again.

## Next Step — P0.3 Meeting Route Pair / Identity / Session Truth

Audit and correct the Meeting Microphone route contract so readiness represents one truthful matched output/input route and the active Meeting generation uses a stable selected pair. Reconcile normal UI naming with the endpoint actually provided by the supported Windows route. Do not create a driver, daemon, second audio-route owner, or broad device abstraction unless the existing functionally-equivalent endpoint path is proved insufficient.

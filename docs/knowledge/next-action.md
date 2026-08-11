# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This changes proof timing only; it does not reduce release acceptance.

The bounded P0 source-correctness set from the comprehensive core/release audit is now closed at source level. The project should **not** continue accumulating P1 source hardening while compile/runtime/device evidence remains intentionally unavailable.

Meeting Core Runtime Reliability now has twelve bounded source slices aligned:

```text
1. required AI preparation before Meeting Live
2. outbound freshness / bounded finalized-speech backpressure
3. outbound priority against in-flight optional incoming work
4. Stop-time helper lifecycle recovery
5. Meeting route provider functional preflight before authority
6. duration-grounded Meeting route delivery hang containment
7. in-session required-helper transport recovery
8. optional incoming failure isolation / freshness semantics
9. active runtime settings / public helper restart isolation
10. matched Meeting route pair / truthful endpoint identity / generation stability
11. bounded Meeting route provider preflight child lifetime
12. Windows sleep / hibernate authority invalidation through canonical Stop
```

The twelfth slice closes P0.5 at source level:

- the existing Tauri main-window bootstrap installs a Windows power-message hook instead of creating another Meeting lifecycle owner;
- `WM_POWERBROADCAST` suspend and automatic/critical resume boundaries check whether the application Meeting still owns a runtime session;
- an owned Meeting converges through the existing `stop_meeting_translation()` path, whose first lifecycle action is generation/output-authority revocation before provider/helper/consumer/capture cleanup;
- resume handling is cleanup convergence only and never calls Start, Resume, playback replay, or a second output path;
- no-Meeting power transitions are no-ops;
- normal minimize/navigation behavior is unchanged;
- the Windows bootstrap fails closed if the native power hook cannot be installed;
- no Pause/Resume feature, automatic wake restart, second Meeting lifecycle, sleep-specific audio cleanup stack, or new runtime service was added.

These source slices do not constitute target-Windows/runtime/release proof.

## Priority Map

Priority is based on impact on the approved small core rather than discovery order.

### P0 — Core source correctness before first integrated proof wave — SOURCE CLOSED

#### P0.1 — Optional Incoming Failure Isolation — CLOSED SOURCE / LOCAL PROOF REQUIRED

Intentional outbound-priority deferral is a healthy stale incoming drop. Incoming helper transport failure restores the same shared worker before releasing incoming scheduler ownership, without retrying old incoming speech.

Deferred proof: force incoming write/read failure while outbound waits and verify same-worker restoration, no stale incoming retry/commit, and truthful failure if recovery itself fails.

#### P0.2 — Active Meeting Settings / Recovery Isolation — CLOSED SOURCE / LOCAL PROOF REQUIRED

Active Meeting/Mic Test resources freeze audio preference mutation and public/manual helper restart until canonical Stop. Internal bounded Meeting recovery remains allowed.

Deferred proof: Start Meeting -> navigate Settings/Text -> attempt device/setup/helper restart paths -> confirm active resources remain unchanged -> Stop -> confirm ordinary mutation/recovery becomes available again.

#### P0.3 — Meeting Route Pair / Identity / Session Truth — CLOSED SOURCE / LOCAL PROOF REQUIRED

```text
Windows audio inventory
-> one matched virtual-cable playback/input pair
-> missing / mismatch / ambiguity blocks
-> exact pair prepared before new Meeting Start
-> exact pair bound to Meeting generation
-> provider preflight + playback use that pair
-> endpoint disappears -> fail closed, no silent switch
-> UI shows actual Windows recording endpoint to select in meeting app
```

Deferred proof: real single/multiple cable enumeration, exact pair identity, endpoint disappearance, and actual meeting-application input reception.

#### P0.4 — Meeting Route Provider Preflight Hang Containment — CLOSED SOURCE / LOCAL PROOF REQUIRED

```text
matched route pair prepared
-> provider child spawn
-> bounded poll
-> success -> record measured preflight time
-> safety ceiling exceeded -> kill + wait child
-> explicit provider_preflight_deadline_exceeded
-> Meeting authority never created
```

Deferred proof: force provider preflight hang, verify process termination/reaping, verify Start remains non-Live, then measure normal cold preflight on target Windows.

#### P0.5 — Sleep / Hibernate Authority Invalidation — CLOSED SOURCE / LOCAL PROOF REQUIRED

```text
Windows power transition
-> native main-window power message
-> application Meeting exists?
   -> yes: canonical Stop
      -> revoke generation authority first
      -> cancel provider/helper/consumers/capture
      -> clear transient session state
   -> no: no-op
-> wake remains non-Live
-> explicit new Start required
```

Deferred proof: real Windows sleep and hibernate while Meeting is Live, suspend during inference/playback, wake after interrupted cleanup, no-Meeting suspend, and explicit confirmation that no stale audio/output resumes automatically.

### P1 — Core truthfulness, boundedness, and long-session hardening

P1 remains mapped but is **not the next source-work queue** until the first executable proof wave establishes which issues still matter.

#### P1.1 — Functional Setup Readiness Alignment

Explicit Check Setup/final setup verification should align with the stronger functional required-outbound Start contract without making normal lightweight status polling repeatedly spawn models/providers.

#### P1.2 — Helper Scheduler Admission Bounds

Execution is serialized and priority-aware, but waiting scheduler admission itself is not explicitly bounded/stale-aware. Add only the minimum caller-aligned bound if integrated evidence confirms the need; do not create a generic job framework.

#### P1.3 — Helper stderr Privacy / Disk Bounds

Rust runtime logs are bounded/redacted. Helper stderr remains generation-specific raw append output. Bring it under bounded privacy-safe diagnostics before release without logging conversation bodies.

#### P1.4 — Product-Release vs Meeting-Required Asset Semantics

EN->ID Marian correctly does not block required outbound Meeting Start, but bidirectional Text remains part of complete initial release. Distinguish `required for Meeting outbound` from `required for complete release` without creating a second inventory owner.

### P2 — Release-blocking materialization and executable proof

These are now the next meaningful project boundary once the explicit hold is released.

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
-> Windows power-lifecycle hook baseline
-> active-session Settings guards
-> matched Meeting route preparation/binding
-> bounded provider-preflight termination
-> resource/thread/handle cleanup
-> relevant fault paths
```

#### P2.3 — Canonical Python environment and model proof

```text
resolve/review uv.lock
-> private PythonRuntime environment
-> deterministic worker tests where appropriate
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
-> matched selected Meeting route
-> real meeting-app input reception
-> optional Meeting Sound loopback
-> own-TTS suppression
-> incoming freshness/priority
-> safe Stop / Close / sleep / hibernate / wake
```

Inject hardened failure cases: outbound/incoming helper transport failure, Stop during inference, provider preflight hang, provider playback stall, route disappearance, multiple-route ambiguity, backlog contention, and suspend during active work.

#### P2.5 — Latency / stability / long-session acceptance

Measure finalized utterance end -> first translated playback on target hardware. Verify memory, temp cleanup, worker restarts, callback errors, logs, power-transition recovery, and long-session stability before considering provider persistence, model replacement, VAD tuning, or broader optimization.

#### P2.6 — Installer / clean-machine materialization

Release must deliver one normal-user setup with private PythonRuntime, required models, TTS assets/provider, supported Meeting route, Tauri resource staging, NSIS install, installed-runtime validation, and clean-machine proof. No manual Python/pip/env/repository/model placement.

### P3 — Cleanup / process hardening after core acceptance

- reconcile stale root `README.md` references to removed/deferred PTT, Documents, History/Saved, Tone, and Realtime/Quality product behavior;
- reconcile stale WorkerRuntime README mode/NLLB descriptions;
- remove stale internal preset terminology only when the current call graph proves it unnecessary;
- add CI only after current lockfiles/build commands stabilize;
- keep Documents, History/Saved, Audio Studio/custom voice, PTT, tone, context, additional languages, incoming TTS, and automatic mid-session Meeting Sound rebind deferred.

## Sequencing Rule

```text
P0 source correctness CLOSED
-> explicit release of local/integration hold
-> first integrated compile/type baseline
-> first runtime/model/Windows-audio proof wave
-> fix measured failures
-> finish only still-relevant P1
-> release packaging + clean-machine acceptance
```

Do not continue into P1 merely because source edits are possible. Executable evidence is now the higher-priority missing input.

## Current Mode

**Plan / proof hold** — all mapped P0 source-correctness tasks are source-closed. The next meaningful acceptance step requires the user to explicitly release the local/integration test hold.

Execution channel until that release:

```text
ChatGPT -> GitHub
```

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, provider/device runtime test, suspend/hibernate runtime test, installer test, performance measurement, or rendered UI inspection has been executed during the hold.

## Deferred Integrated Proof Queue

P0.5 adds real Windows sleep/hibernate cases to the proof wave: suspend while Live/listening, suspend during helper inference, suspend during Meeting-route playback, hibernate/wake, and a no-Meeting control case. Every case must verify old Meeting generation authority is invalid and that wake does not auto-start/replay translated voice.

## Next Step — First Integrated Proof Wave — HOLD RELEASE REQUIRED

Once the user explicitly releases the local/integration hold, begin with dependency/lockfile materialization plus the first Svelte/Vite and Rust/Tauri compile/type baseline. Fix compile/contract failures before running Python/model and Windows audio/device fault proof. Do not continue P1 source hardening until executable evidence identifies the remaining real failures.

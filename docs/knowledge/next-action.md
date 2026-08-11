# TranslateIT — Next Action

## Current Status

The bounded P0 source-correctness set from the comprehensive core/release audit is source-closed. The user has now released the previous proof hold **only for frontend dependency/build/render proof** so the current application UI could be inspected truthfully from built source.

That frontend-only proof was executed through a temporary GitHub Actions workflow and the temporary workflow file was removed afterward. No permanent CI owner was added.

### Frontend proof obtained

Proof run: GitHub Actions run `31516375524` on the `New` source graph plus a temporary render harness.

```text
npm dependency materialization -> PASS in proof runner
svelte-check                  -> PASS: 0 errors, 4 warnings
Vite production build         -> PASS
actual Svelte browser render  -> PASS
Meeting screenshot            -> PASS
Text screenshot + interaction -> PASS
Settings screenshot           -> PASS
```

The four Svelte warnings are all `state_referenced_locally` warnings in `src/pages/FirstSetup.svelte`; they are not compile errors and did not block the production frontend build or the requested Meeting/Text/Settings render.

The screenshots are **actual pixels rendered from the current Svelte/Vite source**, not generated artwork. For this frontend-only proof, Tauri command responses were injected with simulated Ready/device data so the normal product surfaces could render without starting Rust, Python, models, or Windows audio. Therefore the screenshots prove frontend composition/build behavior only; they do not prove native Tauri integration, real devices, model readiness, or Meeting audio delivery.

The proof runner generated its own dependency state. No new repository `package-lock.json` was adopted as release authority in this preview task. The Svelte autofixer was not required because no Svelte source was edited as part of the render proof.

Meeting Core Runtime Reliability remains twelve bounded source slices:

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

## Priority Map

Priority remains based on impact on the approved small core rather than discovery order.

### P0 — Core source correctness before integrated proof — SOURCE CLOSED

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

Deferred proof: real Windows sleep and hibernate while Meeting is Live, suspend during inference/playback, wake after interrupted cleanup, no-Meeting suspend, and confirmation that no stale output resumes automatically.

### P1 — Core truthfulness, boundedness, and long-session hardening

P1 remains mapped but should not be resumed merely because source edits are possible. First use executable/native evidence to determine which hardening still matters.

#### P1.1 — Functional Setup Readiness Alignment

Explicit Check Setup/final setup verification should align with the stronger functional required-outbound Start contract without making normal lightweight status polling repeatedly spawn models/providers.

#### P1.2 — Helper Scheduler Admission Bounds

Execution is serialized and priority-aware, but waiting scheduler admission itself is not explicitly bounded/stale-aware. Add only the minimum caller-aligned bound if integrated evidence confirms the need; do not create a generic job framework.

#### P1.3 — Helper stderr Privacy / Disk Bounds

Rust runtime logs are bounded/redacted. Helper stderr remains generation-specific raw append output. Bring it under bounded privacy-safe diagnostics before release without logging conversation bodies.

#### P1.4 — Product-Release vs Meeting-Required Asset Semantics

EN->ID Marian correctly does not block required outbound Meeting Start, but bidirectional Text remains part of complete initial release. Distinguish `required for Meeting outbound` from `required for complete release` without creating a second inventory owner.

### P2 — Release-blocking materialization and executable proof

#### P2.1 — Frontend dependency / compile / rendered proof — PARTIAL PROOF OBTAINED

Obtained in the frontend-only proof runner:

```text
dependency materialization -> PASS
svelte-check               -> PASS, 0 errors / 4 FirstSetup warnings
Vite production build      -> PASS
Meeting/Text/Settings render from built source -> PASS with simulated Tauri data
Text input/Translate UI interaction -> PASS with simulated translation response
```

Still required before release:

```text
review/fix relevant Svelte warnings
adopt/review canonical dependency lockfile
native Tauri/WebView render
resize smoke
keyboard/focus smoke
clipboard proof
real runtime-state projection
```

#### P2.2 — Rust / Tauri executable proof — STILL HELD

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

#### P2.3 — Canonical Python environment and model proof — STILL HELD

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

#### P2.4 — Windows Meeting audio acceptance — STILL HELD

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

#### P2.5 — Latency / stability / long-session acceptance — STILL HELD

Measure finalized utterance end -> first translated playback on target hardware. Verify memory, temp cleanup, worker restarts, callback errors, logs, power-transition recovery, and long-session stability before considering provider persistence, model replacement, VAD tuning, or broader optimization.

#### P2.6 — Installer / clean-machine materialization — STILL HELD

Release must deliver one normal-user setup with private PythonRuntime, required models, TTS assets/provider, supported Meeting route, Tauri resource staging, NSIS install, installed-runtime validation, and clean-machine proof. No manual Python/pip/env/repository/model placement.

### P3 — Cleanup / process hardening after core acceptance

- reconcile stale root `README.md` references to removed/deferred PTT, Documents, History/Saved, Tone, and Realtime/Quality product behavior;
- reconcile stale WorkerRuntime README mode/NLLB descriptions;
- remove stale internal preset terminology only when the current call graph proves it unnecessary;
- add permanent CI only after current lockfiles/build commands stabilize;
- keep Documents, History/Saved, Audio Studio/custom voice, PTT, tone, context, additional languages, incoming TTS, and automatic mid-session Meeting Sound rebind deferred.

## Sequencing Rule

```text
P0 source correctness CLOSED
-> frontend-only render proof PARTIAL PASS
-> review actual UI
-> explicit approval before widening proof scope
-> Rust/Tauri + runtime/model/Windows-audio proof
-> fix measured failures
-> finish only still-relevant P1
-> release packaging + clean-machine acceptance
```

## Current Mode

**Plan / frontend proof review** — frontend source now has real dependency/type/build/render evidence, but broader local/runtime/device testing remains held. The immediate question is whether the actual rendered UI is acceptable or needs frontend changes before proof scope expands.

Execution channel for the completed preview:

```text
GitHub Actions proof runner
```

Not executed in this preview task:

```text
Rust/Tauri compile or launch
Python/model execution
real Windows device/audio test
Meeting microphone delivery
sleep/hibernate runtime test
installer test
performance measurement
clipboard/native interaction proof
```

## Deferred Integrated Proof Queue

All P0 runtime cases remain queued. The new frontend proof reduces uncertainty only for Svelte type/build/render composition; it does not discharge any Windows/runtime/model acceptance gate.

## Next Step — Review Actual Frontend Render

Review the actual Meeting, Text, and Settings screenshots produced from the built `New` frontend. Decide whether the current visual hierarchy/layout is acceptable or requires bounded frontend corrections before widening the proof scope beyond frontend rendering.

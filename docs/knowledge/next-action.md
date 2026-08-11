# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This changes proof timing only; it does not reduce release acceptance.

A comprehensive core/release audit is established. Work continues one bounded P0 source-correctness slice at a time instead of expanding feature scope or treating every newly discovered issue as an unrelated roadmap item.

Meeting Core Runtime Reliability now has eleven bounded source slices aligned:

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
```

The eleventh slice closes P0.4 at source level:

- `prepare_meeting_virtual_audio_route_provider()` no longer uses unbounded synchronous `.output()`;
- provider preflight now uses the existing provider executable/script with `spawn -> try_wait poll` under the Windows-audio owner;
- a 30-second pre-authority safety ceiling bounds cold Python startup/import/device enumeration without becoming a product latency SLA;
- if the deadline is exceeded, Rust kills and waits for the provider child before returning `virtual_audio_route:provider_preflight_deadline_exceeded`;
- provider wait failure is explicit as `virtual_audio_route:provider_preflight_process_wait_failed`;
- successful preflight still records measured elapsed time, and actual per-utterance playback continues using the separate duration-grounded delivery deadline;
- the matched route pair prepared by P0.3 remains the route input to provider preflight;
- canonical Meeting authority is still created only after provider preflight and required AI preparation succeed;
- no persistent audio daemon, alternate provider, generic timeout framework, or second route owner was added.

These source slices do not constitute target-Windows/runtime/release proof.

## Priority Map

Priority is based on impact on the approved small core rather than discovery order.

### P0 — Core source correctness before first integrated proof wave

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

Deferred proof: real single/multiple cable enumeration, exact pair identity, endpoint disappearance, and actual Zoom/Meet/Teams-style input reception.

#### P0.4 — Meeting Route Provider Preflight Hang Containment — CLOSED SOURCE / LOCAL PROOF REQUIRED

Current boundary:

```text
matched route pair prepared
-> provider child spawn
-> poll every route-process quantum
-> success before 30 s -> record measured preflight time
-> still running at 30 s -> kill + wait child
-> explicit provider_preflight_deadline_exceeded
-> Meeting authority never created
```

The 30-second value is only a hang-containment ceiling. It deliberately does not reuse the WAV-duration playback formula and does not define acceptable product latency.

Deferred proof: force provider preflight to hang, verify process termination/reaping, verify Start remains non-Live, then measure normal cold preflight on target Windows to confirm the safety ceiling has sufficient margin.

#### P0.5 — Sleep / Hibernate Authority Invalidation — ACTIVE NEXT

Product policy requires Windows suspend/hibernate to invalidate active Meeting output authority and forbids automatic translated-voice resume after wake. Current safe-close lifecycle is bounded, but the source still lacks the canonical suspend/hibernate path.

Required correction:

```text
Windows suspend / hibernate signal
-> revoke active Meeting output authority first
-> cancel/stop provider + helper/consumers/capture through canonical Meeting cleanup semantics
-> wake remains non-Live
-> user must explicitly Start a new Meeting session
```

Acceptance boundary:

- suspend/hibernate must not leave a generation authorized to speak;
- cleanup must converge through existing Meeting ownership rather than a parallel sleep-specific audio/runtime stack;
- wake must not auto-Start, auto-resume, or replay queued/stale speech;
- ordinary no-Meeting suspend must remain harmless/idempotent;
- do not add Pause/Resume as a product feature.

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
-> matched selected Meeting route
-> real meeting-app input reception
-> optional Meeting Sound loopback
-> own-TTS suppression
-> incoming freshness/priority
-> safe Stop / Close / suspend / wake
```

Inject hardened failure cases: outbound/incoming helper transport failure, Stop during inference, provider preflight hang, provider playback stall, route disappearance, multiple-route ambiguity, and backlog contention.

#### P2.5 — Latency / stability / long-session acceptance

Measure finalized utterance end -> first translated playback on target hardware. Verify memory, temp cleanup, worker restarts, callback errors, logs, and long-session stability before considering provider persistence, model replacement, VAD tuning, or broader optimization.

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
finish bounded P0 source correctness
-> release local/integration hold
-> first integrated proof wave
-> fix measured/runtime failures
-> finish still-relevant P1
-> release packaging + clean-machine acceptance
```

Do not keep accumulating speculative source-only hardening after P0 while executable evidence is still absent.

## Current Mode

**Plan** — P0.4 is source-closed. Continue one bounded P0 source task at a time while the explicit local-test hold remains active.

Execution channel:

```text
ChatGPT -> GitHub
```

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, provider/device runtime test, suspend/hibernate runtime test, installer test, performance measurement, or rendered UI inspection has been executed during the hold.

## Deferred Integrated Proof Queue

When the hold is explicitly released, execute P2 in dependency order. P0.4 adds provider-preflight hang injection and child-termination/reaping verification before authority to the Windows/runtime proof wave.

## Next Step — P0.5 Sleep / Hibernate Authority Invalidation

Audit the existing Tauri/Windows application lifecycle boundary and connect suspend/hibernate to canonical Meeting authority invalidation and cleanup. Wake must remain non-Live until an explicit new Start. Reuse the existing Stop/session owners; do not introduce Pause/Resume, an automatic wake restart, a second Meeting lifecycle, or a parallel Windows-audio cleanup path.

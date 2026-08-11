# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

A comprehensive audit of the current `New` canonical product policy, source ownership, active Meeting/Text/Settings implementation, local worker/runtime, Windows audio route, packaging configuration, and deferred proof boundary established one ordered release-oriented priority map. Work continues one bounded source slice at a time rather than treating every discovered issue as an isolated roadmap.

Meeting Core Runtime Reliability now has eight bounded source slices aligned:

```text
1. required AI preparation before Meeting Live
2. outbound freshness / bounded finalized-speech backpressure
3. outbound priority against in-flight optional incoming work
4. Stop-time helper lifecycle recovery
5. Meeting Microphone provider preflight before authority
6. duration-grounded Meeting Microphone delivery hang containment
7. in-session required-helper transport recovery
8. optional incoming failure isolation / freshness semantics
```

The eighth slice closes P0.1 at source level:

- exact `helper_scheduler:incoming_deferred_for_outbound` is a healthy freshness drop, not a runtime failure;
- deferred incoming ASR/translation work is discarded and the optional lane returns to fresh `listening` without a degraded blocker;
- a proven incoming helper `*_write_failed:*` / `*_read_failed:*` transport failure does not retry the old incoming event;
- while the failed `MeetingIncoming` request still owns its scheduler permit, the same canonical helper worker is restored so a waiting required outbound request cannot inherit a stopped worker;
- internal Live helper restart does not clear the generation-scoped outbound pipeline claim, while the public/manual helper-start path retains its normal reset semantics;
- recovery failure remains a real degraded condition; ordinary incoming ASR/translation/model/content failure remains a real incoming failure;
- no incoming retry queue, stale subtitle replay, second worker, or new runtime owner was added.

These source slices reduce concrete failure modes but do not constitute target-Windows/runtime/release proof.

## Priority Map

Priority is based on impact on the approved small core, not code convenience or discovery order.

### P0 — Core source correctness before the first integrated proof wave

#### P0.1 — Optional Incoming Failure Isolation — CLOSED SOURCE / LOCAL PROOF REQUIRED

Implemented boundary:

```text
intentional incoming deferral
-> discard old optional event
-> healthy Listening for fresh Meeting Sound

incoming helper transport failure
-> do not retry stale incoming speech
-> restore the same shared helper before MeetingIncoming scheduler ownership releases
-> preserve required outbound continuity / priority claim
-> incoming failure remains subordinate/degradable
```

Deferred runtime proof must force incoming write/read failure while outbound is waiting and verify that the same worker is restored before outbound receives scheduler ownership, the old incoming event is not retried or committed, and genuine recovery failure remains visible.

#### P0.2 — Active Meeting Settings / Recovery Isolation — ACTIVE NEXT

Navigation intentionally does not stop a healthy Meeting, but current Settings remains operational while a Meeting is active. Device selection can persist new microphone/Meeting Sound preferences while the current capture streams still own their old endpoints, and `Check Setup` / `fix-setup` can invoke `start_helper_bridge`, which restarts the shared helper.

Required correction:

- active Meeting resources must not be silently reconfigured underneath the current session;
- setup/recovery actions must not restart the helper or mutate current audio ownership while application Meeting authority is Live;
- either disable/defer those mutations until the next session or add only the minimum explicit next-session semantics needed by the existing product UX;
- do not implement mid-session hot rebind as part of this task.

#### P0.3 — Meeting Route Pair / Identity / Session Truth

Current route selection can independently choose a virtual-looking output device and input device from broad name keywords and call the route ready when both exist. That does not prove the two endpoints are a matched cable/functionally equivalent route. The internal route preference setter also is not part of the current Tauri command surface, while normal UI instructs users to choose `TranslateIT Meeting Microphone` by product name.

Required correction:

- one canonical route pair must be selected/configured truthfully;
- route readiness must not be inferred from two unrelated virtual-looking endpoints;
- the active Meeting generation should use a stable selected route rather than silently drifting because another candidate appears;
- normal UI must describe the actual supported endpoint contract without pretending a custom named device exists when the product has not installed/exposed one;
- do not build a new driver or audio daemon unless the approved functionally-equivalent Windows endpoint cannot satisfy the requirement.

#### P0.4 — Meeting Route Provider Preflight Hang Containment

Actual Meeting playback has a duration-grounded deadline, but `prepare_meeting_virtual_audio_route_provider()` still uses a synchronous provider process wait before Meeting authority without a bounded process lifetime. A provider import/device-enumeration hang can therefore stall Start indefinitely before authority is created.

Required correction:

- bound provider-preflight process lifetime;
- terminate/join the provider on preflight timeout;
- keep preflight failure explicit and before Meeting authority;
- do not turn this into an arbitrary Meeting playback latency threshold.

#### P0.5 — Sleep / Hibernate Authority Invalidation

Product policy requires Windows sleep/hibernate to invalidate active Meeting output authority and forbids automatic voice resume after wake. Current application lifecycle source handles safe application exit, but no canonical sleep/hibernate invalidation path is currently established.

Required correction:

```text
Windows suspend / hibernate
-> revoke Meeting output authority
-> stop/cancel Meeting resources safely
-> wake remains non-Live
-> new explicit user Start required
```

Do not introduce Pause/Resume as a user feature.

### P1 — Core truthfulness, boundedness, and long-session hardening

#### P1.1 — Functional Setup Readiness Alignment

Normal status polling should remain lightweight, but current product-level setup checks can still present Meeting readiness from cached/static inventory + helper status before the stronger provider preflight and required AI preparation that `Start Translation` performs.

Align explicit `Check Setup` / final setup verification with the functional required outbound readiness contract without making normal 1.2-second Meeting status polling spawn models/providers repeatedly.

#### P1.2 — Helper Scheduler Admission Bounds

The helper execution scheduler serializes one active worker request and honors the correct priority order, but waiting counts/condvar admission are not explicitly bounded. Current normal UI callers already constrain most concurrency, so this is not ranked above the proven P0 bugs; nevertheless PR-054 requires bounded queues and stale work rejection.

Add only the minimum admission/staleness bound that matches current callers. Do not create a generic job framework.

#### P1.3 — Helper stderr Privacy / Disk Bounds

Rust runtime JSONL logging is already bounded/redacted, but helper stderr logging appends raw worker stderr into generation-specific files without the same redaction/rotation boundary. Repeated restarts can also accumulate generation-specific stderr logs.

Bring helper stderr evidence under a bounded, privacy-safe diagnostic policy without recording conversation bodies or turning logs into another state owner.

#### P1.4 — Product-Release vs Meeting-Required Asset Semantics

The current model manifest intentionally marks EN->ID Marian as nonblocking for required Meeting outbound, which is correct for Meeting Start. However initial release policy requires bidirectional Indonesian/English translation assets because standalone Text is core.

Do not simply mark EN->ID `required=true`, because the current inventory `required` field also drives Meeting preflight and would incorrectly make optional incoming/reverse Text block healthy outbound Meeting Start. Establish the smallest distinction between:

```text
required for Meeting outbound Start
vs
required for complete product release
```

without creating a second model inventory owner.

### P2 — Release-blocking materialization and executable proof

These items are release blockers even though they are not all source bugs. They remain intentionally unexecuted while the local/integration hold is active.

#### P2.1 — Frontend dependency and compile/render proof

```text
npm dependency materialization
-> regenerate/review package-lock
-> official Svelte autofixer on changed Svelte files
-> svelte-check
-> Vite build
-> rendered UI / resize / keyboard / focus accessibility smoke
-> clipboard proof
```

#### P2.2 — Rust / Tauri executable proof

```text
Rust/Tauri compile
-> application launch
-> Start / Stop / safe-close lifecycle
-> resource/thread/handle cleanup observation
-> fault-path compile coverage
```

#### P2.3 — Canonical Python environment and model proof

`pyproject.toml` is the current dependency owner, but `uv.lock` has not yet been generated/reviewed. Runtime assets are intentionally not committed as Git payloads.

Required proof/materialization includes:

```text
resolve/review Python lock
-> private PythonRuntime dependency environment
-> Ruff / deterministic worker tests where appropriate
-> real ASR load + final transcription
-> ID->EN translation
-> EN->ID translation
-> English TTS
-> CUDA-preferred + CPU-fallback behavior
```

Translation/ASR/TTS quality, code-switching, names/numbers/technical fidelity, and CPU practicality require representative runtime evidence rather than source markers.

#### P2.4 — Windows Meeting audio acceptance

Required target-Windows evidence includes:

```text
physical microphone capture
-> natural finalized-speech segmentation
-> outbound ASR/translation/TTS
-> selected Meeting route playback
-> actual meeting-application input reception
-> optional Meeting Sound loopback
-> own-TTS suppression
-> incoming freshness/priority
-> safe Stop / Close / sleep behavior
```

Also inject the fault cases already hardened in source: outbound and incoming helper transport failures, Stop during inference, provider stall/deadline, route disappearance, and backlog contention.

#### P2.5 — Latency / stability / long-session acceptance

Measure the official outbound latency boundary from finalized utterance end to first translated playback. Measure target hardware before deciding whether provider-process persistence, different model/provider choices, queue tuning, or VAD tuning are warranted.

Also verify long-session memory, cache/temp cleanup, worker restart behavior, callback errors, and bounded logs.

#### P2.6 — Installer / clean-machine materialization

Current source defines packaged interpreter/path ownership and NSIS intent, but actual private `PythonRuntime`, model assets, TTS assets, Meeting-route support, and Tauri resource staging are not yet release-proven.

Release must eventually provide one user setup experience with no manual Python/pip/env/repository/model placement, then pass installed-runtime and clean-machine validation.

### P3 — Cleanup / process hardening after core acceptance is stable

- reconcile stale root `README.md` claims that still mention removed/deferred PTT, Documents, History/Saved navigation, Tone, and Realtime/Quality product behavior;
- reconcile stale `WorkerRuntime/README.md` descriptions that still describe old mode/NLLB routing rather than the current direction-based Marian path;
- remove/rename stale internal audio/VAD preset language only if current call graph proves it is no longer needed;
- add CI automation only after current lockfiles/build commands are materially stable; CI does not replace Windows/audio/model/installer proof;
- keep Documents, History/Saved, Audio Studio/custom voice, PTT, tone controls, conversation context, additional languages, incoming TTS, and automatic mid-session Meeting Sound rebind deferred until the small core passes the release acceptance gate.

## Priority Interpretation

```text
P0 / P1
-> current source behavior/contract still needs correction or hardening

P2
-> proof/materialization that determines whether the product actually works on target Windows

P3
-> cleanup/process/deferred scope that must not delay core acceptance
```

The project should not continue accumulating a long chain of source-only hardening indefinitely. After the bounded P0 source correctness set is materially closed, the preferred transition is to release the current local/integration hold and execute the first integrated proof wave before adopting new architecture or speculative optimization. This remains a sequencing recommendation only; the hold remains active until explicitly released.

## Closed Source Boundaries

```text
Frontend Phase 1 -> Svelte application ownership
Frontend Phase 2 -> bounded semantic visual system
Frontend Phase 3 -> UX state / feature completeness
Frontend Phase 4 -> source accessibility / maintainability hardening
Frontend Phase 5 -> framework-contract review
Humanized Familiar Translation UI -> PR-166 interaction hierarchy + copy simplification
Frontend Runtime Efficiency / Backend Alignment -> coherent state + fewer redundant IPC paths + Rust-owned transactions
Meeting Core Runtime Reliability Phase 1 -> required AI preparation before Live + fail-closed provider readiness + truthful ASR failure state
Meeting Outbound Freshness / Backpressure -> bounded queue retains newer waiting speech by evicting oldest waiting backlog
Meeting Outbound Priority Against In-Flight Incoming -> active incoming stage may finish, later incoming stages defer until required outbound helper pipeline completes
Stop / Helper Lifecycle Recovery -> intentional Stop-time hard-cancel restores the same canonical helper before next Start preflight
Meeting Microphone Provider Preflight -> actual provider Python/dependency/output-device capability checked without playback before Meeting authority
Meeting Microphone Delivery Hang Containment -> provider lifetime bounded by actual WAV duration + measured provider-preflight timing, with Stop precedence and no replay after uncertain timeout
In-Session Required Helper Recovery -> transport-only Live outbound failures restart the same worker; ASR/translation retry once, synthesis is not automatically retried
Optional Incoming Failure Isolation -> explicit outbound-priority deferral is a healthy stale-event drop; incoming transport failure restores the same shared helper before releasing incoming scheduler ownership, with no old-event retry
```

## Current Mode

**Plan** — P0.1 is source-closed. Continue one bounded P0 source task at a time while the explicit local-test hold remains active.

Execution channel for source work:

```text
ChatGPT -> GitHub
```

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, helper/provider fault injection, Windows audio/device test, installer test, performance measurement, or rendered UI inspection has been executed through ChatGPT -> GitHub during the hold.

## Deferred Integrated Proof Queue

When the hold is explicitly released, execute the P2 proof/materialization wave above in dependency order rather than treating it as optional cleanup. P0.1 specifically adds an incoming-failure contention case: force incoming helper write/read failure while required outbound is waiting, verify same-worker restoration occurs before outbound scheduler admission, and verify no stale incoming event is retried/committed.

## Next Step — P0.2 Active Meeting Settings / Recovery Isolation

Audit and correct Settings/setup mutations while application Meeting authority is active. Prevent microphone/Meeting Sound preference changes and setup/helper recovery from silently reconfiguring or restarting resources underneath a Live Meeting. Prefer deferring those actions until the next session; do not add mid-session hot rebind, another settings owner, or another helper lifecycle path.

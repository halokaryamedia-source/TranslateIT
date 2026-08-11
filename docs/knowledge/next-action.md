# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This changes proof timing only; it does not reduce release acceptance.

A comprehensive core/release audit is established. Work continues one bounded P0 source-correctness slice at a time instead of expanding feature scope or treating every newly discovered issue as an unrelated roadmap item.

Meeting Core Runtime Reliability now has ten bounded source slices aligned:

```text
1. required AI preparation before Meeting Live
2. outbound freshness / bounded finalized-speech backpressure
3. outbound priority against in-flight optional incoming work
4. Stop-time helper lifecycle recovery
5. Meeting route provider preflight before authority
6. duration-grounded Meeting route delivery hang containment
7. in-session required-helper transport recovery
8. optional incoming failure isolation / freshness semantics
9. active runtime settings / public helper restart isolation
10. matched Meeting route pair / truthful endpoint identity / generation stability
```

The tenth slice closes P0.3 at source level:

- Meeting route readiness now requires one matched Windows virtual-audio output/input pair rather than two independently discovered virtual-looking endpoints;
- the playback-side `Input` endpoint and recording-side `Output` endpoint must share the same normalized pair identity;
- explicit persisted route preferences must contain both endpoints and must match the same pair;
- without an explicit pair, one unique standard VB-CABLE base pair is preferred when present, otherwise exactly one matched pair may be selected; missing or ambiguous pairs block instead of guessing;
- the matched pair is prepared before public Meeting Start and the same pair is bound to the active Meeting generation;
- while that generation is active, route checks retain the exact bound endpoint names and fail closed if either endpoint disappears instead of silently switching to a newly discovered pair;
- provider preflight and actual delivery continue consuming `get_virtual_mic_route_selection()`, so they follow the prepared/generation-bound route owner rather than creating another route selection path;
- the frontend now exposes the current route contract through `get_virtual_mic_route_contract_status` and Meeting / Settings / First Setup show the actual Windows recording endpoint that the user must select in the meeting application;
- normal UI no longer claims that a Windows device literally named `TranslateIT Meeting Microphone` already exists; that phrase remains a product concept, not fabricated endpoint identity;
- no custom driver, audio daemon, second route owner, mid-session rebind, or broad generic device framework was added.

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

Current boundary:

```text
Windows audio inventory
-> identify one matched virtual-cable playback/input pair
-> block missing / mismatched / ambiguous pair
-> prepare exact pair before new Meeting Start
-> provider preflight uses that pair
-> Meeting generation binds that exact pair
-> delivery keeps that pair for the generation
-> endpoint disappears/mismatches -> fail closed, no silent switch
-> UI shows actual Windows recording endpoint for meeting-app microphone selection
```

Deferred target-Windows proof:

```text
one standard VB-CABLE / supported matched pair
-> verify detected playback + recording endpoints are the real paired cable

multiple virtual cable endpoints
-> verify canonical base pair is selected only when unambiguous
-> otherwise verify ambiguity blocks rather than combining unrelated endpoints

Meeting Live
-> remove/disable one bound endpoint
-> verify current generation does not switch to another route

meeting application
-> select the exact recording/input endpoint shown by TranslateIT
-> verify translated English audio actually arrives there
```

#### P0.4 — Meeting Route Provider Preflight Hang Containment — ACTIVE NEXT

Actual Meeting playback already has a duration-grounded deadline, but provider preflight before Meeting authority still uses a synchronous process wait without a bounded process lifetime. A provider import or device-enumeration hang can therefore block Start indefinitely before authority exists.

Required correction:

- bound the provider-preflight child lifetime;
- terminate and join it on deadline;
- keep timeout/failure explicit and before Meeting authority;
- preserve the matched route pair prepared by P0.3;
- do not reuse the playback duration formula as a preflight latency threshold and do not add a persistent route daemon.

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
-> active-session Settings guards
-> matched Meeting route preparation/binding
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
-> safe Stop / Close / sleep
```

Inject hardened failure cases: outbound/incoming helper transport failure, Stop during inference, provider stall, route disappearance, multiple-route ambiguity, and backlog contention.

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

**Plan** — P0.3 is source-closed. Continue one bounded P0 source task at a time while the explicit local-test hold remains active.

Execution channel:

```text
ChatGPT -> GitHub
```

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, provider/device runtime test, installer test, performance measurement, or rendered UI inspection has been executed during the hold.

## Deferred Integrated Proof Queue

When the hold is explicitly released, execute P2 in dependency order. P0.3 adds matched-pair detection, exact meeting-app endpoint selection, multi-route ambiguity, and bound-route disappearance tests to the Windows audio proof wave.

## Next Step — P0.4 Meeting Route Provider Preflight Hang Containment

Bound the Meeting route provider preflight child process before Meeting authority. If dependency import/device enumeration/provider preflight does not complete within a bounded pre-authority deadline, terminate and join that child, return an explicit setup/runtime blocker, and leave Meeting non-Live. Preserve the P0.3 matched-pair snapshot and the existing duration-grounded playback deadline; do not create a persistent route daemon or generic timeout framework.

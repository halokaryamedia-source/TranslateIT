# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source remains aligned through the Humanized Familiar Translation UI pass and the Frontend Runtime Efficiency / Backend Alignment pass. Meeting Core Runtime Reliability now has five bounded source slices aligned:

- Rust remains the single application Meeting/session authority and the Python worker remains the one ASR/translation/TTS execution path;
- `Start Translation` exercises required ASR, Indonesian -> English translation, and English TTS readiness before Meeting authority/capture can commit `Live`;
- required Start preparation is scheduler-classed as `MeetingOutbound`, failed required preparation invalidates stale provider readiness, and preflight is rechecked before authority creation;
- a finalized segment with no stable transcript returns to healthy `Listening`, while a real ASR failure projects `attention_needed`;
- the finalized speech producer remains naturally segmented and bounded at two waiting finalized utterances per lane;
- when that pending queue is full, the audio owner evicts the oldest still-waiting finalized utterance before accepting newer finalized speech, so realtime backlog does not preferentially preserve stale speech;
- required outbound helper work keeps a generation-scoped pipeline claim across its ASR -> ID-to-EN translation -> TTS helper stages;
- when fresh outbound work begins while optional incoming inference is already running, the already-running incoming worker stage may finish, but later incoming stages are deferred until the outbound helper pipeline releases its claim;
- full Meeting Stop still revokes authority first and may hard-cancel an in-flight Meeting helper task by terminating the one persistent worker;
- the next valid `Start Translation` restores only the exact intentional post-Stop helper state `helper_bridge:meeting_session_hard_cancelled` through the same canonical helper before ordinary preflight/AI preparation;
- the Meeting Microphone delivery audit found that static route readiness previously proved only selected route devices + provider script + execution guard, not whether the selected Python runtime could import the actual audio dependencies and resolve the selected output device;
- `Start Translation` now runs a bounded **Meeting route provider preflight** before AI preparation and before Meeting authority: the existing provider process is invoked with `preflight_only`, performs no playback, imports the same `numpy` / `sounddevice` runtime used by real delivery, resolves the selected output endpoint, and must return explicit `preflight_verified + audio_route_ready` before Start can continue;
- provider preflight failure returns before Meeting authority/capture is created; it does not silently fall through to first-utterance failure;
- the ordinary lightweight Meeting status/preflight remains process-free, so frontend status polling does not spawn a route provider process repeatedly;
- normal synthesized-TTS delivery is still serialized and at-most-once: the provider uses blocking playback, Rust accepts completion only when the provider reports actual execution + route-ready success, Stop/generation revoke can kill the active provider process, and temporary TTS is removed only after the synchronous provider returns/cancels;
- per-utterance provider process creation was **not** replaced by a persistent route service because no target-PC latency/process-churn measurement currently proves that extra lifecycle complexity is justified;
- no second audio-route owner, persistent route daemon, playback retry, raw-mic fallback, provider/model change, or VAD change was introduced;
- source validation records required AI preparation, finalized-speech freshness, helper-stage priority continuity, bounded Stop-time helper recovery, and Meeting route provider preflight before authority.

The remaining concrete Meeting Microphone lifecycle issue is bounded execution time: `dispatch_meeting_virtual_audio_route_provider` polls the provider until it exits or Meeting authority is revoked, but there is currently no delivery deadline. A provider/device call that stalls can therefore hold the serialized outbound consumer indefinitely until the user Stops the Meeting. This should be handled without inventing an arbitrary timeout unrelated to actual TTS duration.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, provider preflight execution, Windows audio test, installer test, performance measurement, process-churn measurement, Stop/restart runtime observation, or rendered UI inspection was executed through ChatGPT -> GitHub.

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
Meeting Outbound Freshness / Backpressure -> bounded queue retains newer waiting speech by evicting the oldest waiting backlog
Meeting Outbound Priority Against In-Flight Incoming -> active incoming stage may finish, later incoming stages defer until required outbound helper pipeline completes
Stop / Helper Lifecycle Recovery -> only intentional Stop-time hard-cancel restores the same canonical helper before next Start preflight
Meeting Microphone Provider Preflight -> actual provider Python/dependency/output-device capability is checked without playback before Meeting authority
```

## Current Mode

**Plan** — the next bounded source issue is Meeting Microphone delivery hang containment while the explicit local-test hold remains active.

Execution channel for next source work:

```text
ChatGPT -> GitHub
```

Do not replace the provider with a persistent daemon merely to avoid process creation. First inspect how actual synthesized WAV duration can provide a non-arbitrary delivery deadline, how provider cancellation and at-most-once semantics should behave when that deadline is exceeded, and whether the existing TTS/provider response already carries enough duration evidence to avoid a new dependency or duplicate audio parser.

## Deferred Integrated Proof Queue

When the user explicitly releases the hold:

```text
frontend dependency install + regenerate package-lock
-> official Svelte autofixer on changed Svelte files
-> svelte-check
-> Vite frontend build
-> Rust/Tauri compile + launch
-> rendered UI / resize / keyboard / focus accessibility smoke
-> clipboard interaction proof
-> private PythonRuntime + worker/model smoke
-> required Meeting Start AI-preparation proof
-> Meeting route provider preflight proof with real installed numpy/sounddevice + selected route device
-> repeated finalized-utterance / backlog-overload behavior observation
-> verify outbound waits only for the already-running incoming worker stage and no later incoming stage executes before outbound helper completion
-> Stop during active helper inference -> next Start helper recovery proof
-> Windows Meeting Microphone playback/completion/cancellation proof
-> measure per-utterance provider process overhead before considering persistence
-> Meeting polling / transcript update behavior observation
-> audio-device probe/save transaction proof
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — Meeting Microphone Delivery Hang Containment

Audit and implement a bounded provider delivery deadline derived from actual synthesized-audio/runtime evidence rather than an arbitrary fixed wait. Preserve serialized at-most-once playback, generation/Stop cancellation, temporary-file ownership, and the one existing Windows audio route owner.
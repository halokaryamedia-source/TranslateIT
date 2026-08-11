# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source remains aligned through the Humanized Familiar Translation UI pass and the Frontend Runtime Efficiency / Backend Alignment pass. Meeting Core Runtime Reliability now has three bounded source slices aligned:

- Rust remains the single application Meeting/session authority and the Python worker remains the one ASR/translation/TTS execution path;
- `Start Translation` exercises required ASR, Indonesian -> English translation, and English TTS readiness before Meeting authority/capture can commit `Live`;
- required Start preparation is scheduler-classed as `MeetingOutbound`, failed required preparation invalidates stale provider readiness, and preflight is rechecked before authority creation;
- a finalized segment with no stable transcript returns to healthy `Listening`, while a real ASR failure projects `attention_needed`;
- the finalized speech producer remains naturally segmented and bounded at two waiting finalized utterances per lane;
- when that pending queue is full, the audio owner evicts the oldest still-waiting finalized utterance before accepting newer finalized speech, so realtime backlog does not preferentially preserve stale speech;
- required outbound helper work now keeps a generation-scoped pipeline claim across its ASR -> ID-to-EN translation -> TTS helper stages;
- when fresh outbound work begins while optional incoming inference is already running, the already-running incoming worker stage is allowed to finish, but subsequent incoming stages are deferred before worker execution until the outbound helper pipeline releases its claim;
- the deferral check runs both before scheduler admission and again after permit acquisition, so an incoming request queued before the outbound claim cannot slip between outbound helper stages;
- the pipeline claim is released after TTS, on outbound helper failure/stale generation, and during helper/Meeting cancellation paths so it cannot intentionally persist across Stop/restart;
- this priority correction does **not** hard-kill the worker merely because outbound arrived, does not create a second worker, and does not preempt an inference call already executing inside Python;
- VAD, speech-boundary tuning, finalized queue capacity, model choice, Meeting Microphone delivery, and the Python worker implementation remain unchanged;
- source validation records required outbound AI preparation, bounded newest-preferred finalized speech, and helper-stage priority continuity.

The next proven Meeting-runtime problem is now helper lifecycle continuity after Stop:

- full Meeting Stop intentionally hard-cancels an in-flight helper request by terminating the persistent worker when that request belongs to the Meeting session;
- after that cancellation the helper is left `stopped`, while the next `Start Translation` currently performs its ordinary preflight before required-AI preparation/restart;
- therefore a Stop that lands during active inference can leave the following Start blocked on `local_runtime_not_ready` until some separate recovery action restarts the helper;
- this is a bounded lifecycle/recovery problem and should be corrected without weakening Stop authority-first semantics or creating a second worker.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, Windows audio test, installer test, performance measurement, scheduler-contention runtime observation, or rendered UI inspection was executed through ChatGPT -> GitHub.

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
Meeting Outbound Priority Against In-Flight Incoming -> allow the active incoming stage to finish, then defer further incoming helper stages until required outbound ASR/translation/TTS releases the worker pipeline
```

## Current Mode

**Plan** — the next bounded source issue is Stop/helper lifecycle recovery while the explicit local-test hold remains active.

Execution channel for next source work:

```text
ChatGPT -> GitHub
```

Do not broaden the next slice into worker replacement, parallel inference services, model changes, retry frameworks, or Meeting Microphone redesign. Preserve authority-first Stop and determine the smallest canonical way for the next valid Start/readiness path to recover the same persistent worker after a Stop-time hard cancellation.

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
-> repeated finalized-utterance / backlog-overload behavior observation
-> verify older waiting outbound work is discarded before newer finalized speech under contention
-> verify outbound waits only for the already-running incoming worker stage and no later incoming stage executes before outbound helper completion
-> Windows Meeting audio/device proof
-> Meeting polling / transcript update behavior observation
-> audio-device probe/save transaction proof
-> Stop / helper lifecycle recovery proof
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — Stop / Helper Lifecycle Recovery

Audit and correct the case where Meeting Stop hard-cancels an in-flight Meeting helper task and leaves the one persistent worker stopped, causing the following Start to fail its initial preflight before it can prepare the required AI runtime. Preserve safe Stop cancellation and one-worker ownership; recover only through the canonical helper/runtime path.
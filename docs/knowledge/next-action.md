# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source remains aligned through the Humanized Familiar Translation UI pass and the Frontend Runtime Efficiency / Backend Alignment pass. Meeting Core Runtime Reliability now has six bounded source slices aligned:

- Rust remains the single application Meeting/session authority and the Python worker remains the one ASR/translation/TTS execution path;
- `Start Translation` exercises required ASR, Indonesian -> English translation, and English TTS readiness before Meeting authority/capture can commit `Live`;
- required Start preparation is scheduler-classed as `MeetingOutbound`, failed required preparation invalidates stale provider readiness, and preflight is rechecked before authority creation;
- a finalized segment with no stable transcript returns to healthy `Listening`, while a real ASR failure projects `attention_needed`;
- the finalized speech producer remains naturally segmented and bounded at two waiting finalized utterances per lane; when full, the oldest still-waiting utterance is evicted so current realtime speech is not discarded merely to preserve stale backlog;
- required outbound helper work keeps a generation-scoped pipeline claim across ASR -> ID-to-EN translation -> TTS; an already-running optional incoming stage may finish, but later incoming stages defer until required outbound helper work releases the pipeline;
- full Meeting Stop still revokes authority first and may hard-cancel an in-flight Meeting helper task; the next valid Start restores only the exact intentional post-Stop helper state `helper_bridge:meeting_session_hard_cancelled` through the same canonical helper before ordinary preflight/AI preparation;
- `Start Translation` performs a bounded Meeting Microphone provider preflight before authority: the existing provider imports its actual audio dependencies and resolves the selected output device without playback, while ordinary status polling remains process-free;
- normal Meeting Microphone delivery remains synchronous, serialized, generation-cancellable, and at-most-once; temporary TTS remains owned by the Meeting caller until route dispatch returns or is cancelled;
- Meeting Microphone delivery now has a **duration-grounded deadline** rather than an unbounded provider wait: the route owner parses the generated PCM WAV duration, combines that actual playback length with the measured successful provider-preflight process/device time, and records both inputs plus the computed deadline in route status/evidence;
- the deadline formula is proportional to actual runtime evidence (`provider preflight elapsed + 2 × WAV duration + one poll quantum`) rather than a fixed global playback timeout;
- Stop/generation revoke still wins over the deadline path; if the deadline is exceeded first, Rust kills and joins the provider child, marks execution as potentially attempted, returns `provider_delivery_timed_out`, and explicitly refuses replay from the beginning because playback state is uncertain;
- source WAV duration must be readable as the same PCM WAVE boundary the current provider expects; missing/invalid duration or missing successful provider-preflight timing fails closed before route execution instead of falling back to an arbitrary wait;
- per-utterance provider process creation is still unchanged because no target-PC process-overhead measurement currently justifies a persistent route daemon or second audio-route owner;
- no playback retry, raw-mic fallback, additional route service, model/provider replacement, VAD change, or dependency was added;
- source validation records required AI preparation, finalized-speech freshness, helper-stage priority continuity, bounded Stop-time helper recovery, Meeting route provider preflight, duration-grounded route deadline, no-replay timeout semantics, and temporary-TTS ownership.

The next concrete required-outbound lifecycle gap is inside the one helper runtime while a Meeting is already Live. A helper request write/read/deadline failure terminates the persistent worker and leaves it `stopped`; current automatic helper recovery is intentionally limited to the separate post-Stop hard-cancel condition and only runs when a new Meeting Start is requested. Therefore an otherwise-authoritative Live Meeting can remain alive after a worker transport/deadline failure while later required outbound utterances encounter `helper_bridge:not_running` instead of a bounded in-session recovery path. This needs a separate local-AI/session-owner review because retry safety differs by ASR, translation, and TTS stage and must not replay uncertain Meeting audio output.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, provider preflight execution, WAV/deadline execution, Windows audio test, installer test, performance measurement, process-churn measurement, Stop/restart runtime observation, helper-failure recovery observation, or rendered UI inspection was executed through ChatGPT -> GitHub.

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
Stop / Helper Lifecycle Recovery -> only intentional Stop-time hard-cancel restores the same canonical helper before next Start preflight
Meeting Microphone Provider Preflight -> actual provider Python/dependency/output-device capability checked without playback before Meeting authority
Meeting Microphone Delivery Hang Containment -> provider lifetime bounded by actual WAV duration + measured provider-preflight timing, with Stop precedence and no replay after uncertain timeout
```

## Current Mode

**Plan** — the next bounded source issue is in-session required-helper recovery while the explicit local-test hold remains active.

Execution channel for next source work:

```text
ChatGPT -> GitHub
```

Do not add a generic retry loop or restart the worker for every failed model result. First distinguish worker transport/lifecycle failure from a normal ASR/translation/TTS content failure, determine which current stage can be safely re-executed before any Meeting output side effect, and keep recovery bounded under the canonical Meeting session owner with one helper worker.

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
-> force a provider stall and verify duration-grounded timeout kills the child without replay
-> measure per-utterance provider process overhead before considering persistence
-> force helper transport/deadline failure during Live and verify bounded recovery behavior once implemented
-> Meeting polling / transcript update behavior observation
-> audio-device probe/save transaction proof
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — In-Session Required Helper Recovery

Audit the Live Meeting path for helper process write/read/deadline failures that stop the one persistent worker after Start. Separate transport/lifecycle failure from normal inference/content failure, establish which ASR/translation/TTS stages are safe to retry before any Meeting output side effect, and implement the smallest bounded recovery that preserves one worker, current generation authority, stale-work rejection, and at-most-once Meeting playback.

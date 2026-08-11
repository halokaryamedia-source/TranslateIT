# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source remains aligned through the Humanized Familiar Translation UI pass and the Frontend Runtime Efficiency / Backend Alignment pass. Meeting Core Runtime Reliability now has two bounded source slices aligned:

- Rust remains the single application Meeting/session authority and the Python worker remains the one ASR/translation/TTS execution path;
- `Start Translation` exercises required ASR, Indonesian -> English translation, and English TTS readiness before Meeting authority/capture can commit `Live`;
- required Start preparation is scheduler-classed as `MeetingOutbound`, failed required preparation invalidates stale provider readiness, and preflight is rechecked before authority creation;
- a finalized segment with no stable transcript returns to healthy `Listening`, while a real ASR failure projects `attention_needed`;
- the finalized speech producer remains naturally segmented and bounded at two waiting finalized utterances per lane;
- when that pending queue is full, the audio owner now evicts the **oldest still-waiting** finalized utterance before accepting the newer finalized utterance instead of discarding current outbound speech merely to preserve an older backlog;
- retained finalized work still leaves the queue FIFO; already-running outbound processing/output is not preempted by this audio-boundary freshness rule;
- queue capacity, VAD thresholds, silence/adaptive speech-boundary behavior, session/generation authority, and the serialized outbound consumer remain unchanged;
- incoming keeps the same newest-preferred bounded backlog behavior, while required outbound now follows the same PR-054 stale-work principle rather than the former asymmetric newest-drop behavior;
- no second queue owner, generic backpressure framework, retry mechanism, extra worker, model change, or Meeting Microphone redesign was introduced;
- source validation records both the required outbound AI preparation contract and the bounded newest-preferred finalized-speech queue contract.

The remaining bounded Meeting-runtime issues are intentionally separate:

- the single worker scheduler prioritizes queued outbound work but does not preempt an **already-running** optional incoming request, so required outbound may still wait behind in-flight incoming inference;
- full Meeting Stop can hard-cancel an in-flight helper request by terminating the persistent worker, so post-Stop helper readiness/restart continuity needs a separate lifecycle review;
- Meeting Microphone provider dispatch remains synchronous in the outbound consumer and belongs to a separate Windows audio/runtime delivery boundary.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, Windows audio test, installer test, performance measurement, queue-overload runtime observation, or rendered UI inspection was executed through ChatGPT -> GitHub.

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
```

## Current Mode

**Plan** — the next bounded source issue is required outbound priority when optional incoming inference is already running.

Execution channel for next source work:

```text
ChatGPT -> GitHub
```

Do not broaden the next slice into worker replacement, parallel inference services, VAD tuning, model changes, or Meeting Microphone redesign. First determine whether current in-flight incoming work can be safely cancelled/deferred when fresh required outbound work arrives without destroying useful worker/model continuity or violating at-most-once/session authority.

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
-> Windows Meeting audio/device proof
-> Meeting polling / transcript update behavior observation
-> audio-device probe/save transaction proof
-> Stop / helper lifecycle recovery proof
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — Meeting Outbound Priority Against In-Flight Incoming

Audit the current one-worker scheduler/cancellation boundary for the case where optional incoming ASR/translation is already executing when a required outbound utterance becomes ready. Preserve one worker and the outbound > incoming priority rule, but do not hard-kill or rebuild the worker unless current source evidence proves that bounded cancellation is the smallest safe solution.

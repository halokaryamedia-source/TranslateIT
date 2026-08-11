# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source remains aligned through the Humanized Familiar Translation UI pass and the Frontend Runtime Efficiency / Backend Alignment pass. Meeting Core Runtime Reliability now has four bounded source slices aligned:

- Rust remains the single application Meeting/session authority and the Python worker remains the one ASR/translation/TTS execution path;
- `Start Translation` exercises required ASR, Indonesian -> English translation, and English TTS readiness before Meeting authority/capture can commit `Live`;
- required Start preparation is scheduler-classed as `MeetingOutbound`, failed required preparation invalidates stale provider readiness, and preflight is rechecked before authority creation;
- a finalized segment with no stable transcript returns to healthy `Listening`, while a real ASR failure projects `attention_needed`;
- the finalized speech producer remains naturally segmented and bounded at two waiting finalized utterances per lane;
- when that pending queue is full, the audio owner evicts the oldest still-waiting finalized utterance before accepting newer finalized speech, so realtime backlog does not preferentially preserve stale speech;
- required outbound helper work keeps a generation-scoped pipeline claim across its ASR -> ID-to-EN translation -> TTS helper stages;
- when fresh outbound work begins while optional incoming inference is already running, the already-running incoming worker stage may finish, but later incoming stages are deferred until the outbound helper pipeline releases its claim;
- the deferral check runs both before scheduler admission and again after permit acquisition, so queued incoming work cannot slip between required outbound helper stages;
- full Meeting Stop still revokes authority first and may hard-cancel an in-flight Meeting helper task by terminating the one persistent worker;
- the next valid `Start Translation` now recognizes only the exact intentional post-Stop state `helper_bridge:meeting_session_hard_cancelled`, restarts the same canonical helper through `start_helper_bridge`, and then runs the ordinary Meeting preflight and required AI preparation;
- generic helper stops, manual/general task cancellation, missing runtime/model/provider conditions, and other helper failures are **not** auto-retried by this recovery path and remain explicit blockers;
- the recovery occurs before the initial Start preflight, so a worker intentionally stopped by the previous Meeting Stop no longer blocks Start before the existing AI preparation path can run;
- no worker is restarted during Stop itself, no second worker/runtime is created, and authority-first Stop semantics are unchanged;
- VAD, speech-boundary tuning, finalized queue capacity, model choice, Meeting Microphone delivery, and the Python worker implementation remain unchanged;
- source validation records required outbound AI preparation, bounded newest-preferred finalized speech, helper-stage priority continuity, and the exact bounded Stop-time helper recovery condition.

The next source boundary is Meeting Microphone delivery lifecycle/efficiency. Current outbound processing still dispatches the guarded Meeting Microphone provider synchronously for each synthesized utterance. That preserves serialized output and Stop cancellation, but the source boundary should be audited before assuming per-utterance provider process creation and current completion semantics are the smallest reliable delivery design.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, Windows audio test, installer test, performance measurement, Stop/restart runtime observation, scheduler-contention runtime observation, or rendered UI inspection was executed through ChatGPT -> GitHub.

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
Meeting Outbound Priority Against In-Flight Incoming -> allow the active incoming stage to finish, then defer later incoming helper stages until required outbound ASR/translation/TTS releases the worker pipeline
Stop / Helper Lifecycle Recovery -> only the intentional Stop-time hard-cancel state restores the same canonical helper before the next Start preflight
```

## Current Mode

**Plan** — audit the Meeting Microphone delivery lifecycle while the explicit local-test hold remains active.

Execution channel for next source work:

```text
ChatGPT -> GitHub
```

Do not assume that synchronous per-utterance provider dispatch is inherently wrong. Inspect the existing guarded virtual-audio route owner, provider process contract, cancellation semantics, temporary TTS lifecycle, and direct Meeting caller first. Preserve serialized at-most-once output and do not create a second audio route service merely to reduce process churn.

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
-> Stop during active helper inference -> next Start helper recovery proof
-> Windows Meeting audio/device and Meeting Microphone delivery proof
-> Meeting polling / transcript update behavior observation
-> audio-device probe/save transaction proof
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — Meeting Microphone Delivery Lifecycle Audit

Audit the current synthesized-TTS -> guarded provider -> TranslateIT Meeting Microphone path for per-utterance process churn, blocking/cancellation behavior, output-completion truth, and temporary-file ownership. Keep at-most-once serialized delivery and one canonical Windows audio route owner; change source only where a concrete delivery-lifecycle problem is proved.

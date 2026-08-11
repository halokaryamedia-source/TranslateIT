# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source remains aligned through the Humanized Familiar Translation UI pass and the Frontend Runtime Efficiency / Backend Alignment pass. Meeting Core Runtime Reliability now has seven bounded source slices aligned:

- Rust remains the single application Meeting/session authority and the Python worker remains the one ASR/translation/TTS execution path;
- `Start Translation` exercises required ASR, Indonesian -> English translation, and English TTS readiness before Meeting authority/capture can commit `Live`;
- required Start preparation is scheduler-classed as `MeetingOutbound`, failed required preparation invalidates stale provider readiness, and preflight is rechecked before authority creation;
- a finalized segment with no stable transcript returns to healthy `Listening`, while a real ASR failure projects `attention_needed`;
- the finalized speech producer remains naturally segmented and bounded at two waiting finalized utterances per lane; when full, the oldest still-waiting utterance is evicted so current realtime speech is not discarded merely to preserve stale backlog;
- required outbound helper work keeps a generation-scoped pipeline claim across ASR -> ID-to-EN translation -> TTS; an already-running optional incoming stage may finish, but later incoming stages defer until required outbound helper work releases the pipeline;
- full Meeting Stop still revokes authority first and may hard-cancel an in-flight Meeting helper task; the next valid Start restores only the exact intentional post-Stop helper state `helper_bridge:meeting_session_hard_cancelled` through the same canonical helper before ordinary preflight/AI preparation;
- `Start Translation` performs a bounded Meeting Microphone provider preflight before authority: the existing provider imports its actual audio dependencies and resolves the selected output device without playback, while ordinary status polling remains process-free;
- normal Meeting Microphone delivery remains synchronous, serialized, generation-cancellable, and at-most-once; temporary TTS remains owned by the Meeting caller until route dispatch returns or is cancelled;
- Meeting Microphone provider lifetime is bounded by actual PCM WAV duration plus measured provider-preflight timing; Stop/generation revoke remains higher priority than the delivery deadline and a timeout is never replayed from the beginning;
- Live required-outbound helper transport failures are now separated from normal inference/content failures: only helper `*_write_failed:*` and `*_read_failed:*` responses for an authoritative `meeting_lane=you` generation are eligible for automatic in-session recovery;
- transport recovery acquires `MeetingOutbound` scheduler priority, restarts the **same canonical helper worker**, rechecks that the generation is still authoritative and `Live`, and preserves the outbound pipeline claim before optional incoming work can execute;
- ASR `transcribe` and ID->EN `translate` are the only current stages automatically re-executed, and each failed stage receives at most **one** retry because recovery calls the non-recursive worker execution path directly;
- `synthesize` is deliberately **not** retried after a helper transport failure: the helper is restored for later utterances, but current synthesis remains failed because child-process/file state can be uncertain and automatic re-synthesis would add unnecessary side-effect ambiguity before Meeting playback;
- normal ASR empty speech, model/provider/content failures, incoming work, Text work, manual/general cancellation, Meeting Stop cancellation, and stale generations do not enter this transport-recovery path;
- if the one bounded retry itself fails, the response remains failed and the helper is not placed into an automatic restart loop;
- no second worker, generic retry framework, playback retry, raw-mic fallback, additional audio-route service, model/provider replacement, VAD change, or new dependency was introduced;
- source validation records required AI preparation, finalized-speech freshness, helper-stage priority continuity, bounded Stop-time recovery, Meeting Microphone preflight/deadline behavior, and bounded in-session helper transport recovery with ASR/translation-only retry semantics.

The next concrete runtime-truth issue is the optional incoming lane's handling of an intentional outbound-priority deferral. `helper_scheduler:incoming_deferred_for_outbound` is a normal freshness/priority outcome, but the current incoming caller handles the non-`ok` response through the same branch used for real incoming ASR/translation failure. That can mark incoming as degraded or describe a failure even though the lane merely yielded to required outbound work. The deferred incoming event should be discarded as stale assistance and return to listening without presenting a false runtime fault.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, helper transport-failure injection, provider preflight execution, WAV/deadline execution, Windows audio test, installer test, performance measurement, process-churn measurement, Stop/restart runtime observation, or rendered UI inspection was executed through ChatGPT -> GitHub.

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
In-Session Required Helper Recovery -> transport-only Live outbound failures restart the same worker; ASR/translation retry once, synthesis is not automatically retried
```

## Current Mode

**Plan** — the next bounded source issue is intentional incoming-deferral semantics while the explicit local-test hold remains active.

Execution channel for next source work:

```text
ChatGPT -> GitHub
```

Do not turn incoming deferral into a retry queue or preserve old incoming speech until outbound finishes. The optional lane should prefer current comprehension: recognize the scheduler's explicit deferral result, discard that old event, restore/listen for fresh Meeting Sound, and reserve degraded/error state for actual ASR/translation/runtime failure.

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
-> force helper write/read/deadline failure during Live ASR and translation -> verify same-worker recovery + exactly one stage retry
-> force helper transport failure during Live synthesis -> verify helper recovers for later speech while current synthesis is not retried or delivered
-> Windows Meeting Microphone playback/completion/cancellation proof
-> force a provider stall and verify duration-grounded timeout kills the child without replay
-> measure per-utterance provider process overhead before considering persistence
-> Meeting polling / transcript update behavior observation
-> audio-device probe/save transaction proof
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — Incoming Deferral Semantics / Freshness

Correct the optional incoming caller so the explicit `helper_scheduler:incoming_deferred_for_outbound` result is treated as intentional freshness/priority yielding rather than a runtime failure. Drop that old incoming event, return the lane to healthy listening when still eligible, and preserve degraded/error status only for genuine incoming ASR/translation/runtime failures.

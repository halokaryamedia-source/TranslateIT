# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source remains aligned through the Humanized Familiar Translation UI pass and the Frontend Runtime Efficiency / Backend Alignment pass. The first bounded Meeting Core Runtime Reliability slice is now also source-aligned:

- Rust remains the single application Meeting/session authority and the Python worker remains the one ASR/translation/TTS execution path;
- `Start Translation` still checks the ordinary Meeting preflight first, but now exercises the required local AI runtime **before** creating Meeting authority, opening capture, or committing `Live`;
- required Start preparation runs ASR preload, Indonesian -> English translation preload, English TTS preflight, then re-reads worker capability status;
- Start preparation is scheduler-classed as `MeetingOutbound`, so this core readiness work is not treated like ordinary Diagnostics/Text work before the session starts;
- a failed required ASR / ID->EN translation / TTS preparation invalidates cached outbound `provider_ready` instead of leaving a stale healthy readiness claim behind;
- after successful AI preparation, Meeting preflight is checked again before application Meeting authority is created;
- a finalized segment that simply produces no stable transcript returns to healthy `Listening`, while a real ASR failure now projects `attention_needed` rather than appearing as normal listening;
- existing generation/session stale-result guards, transactional Start rollback, serialized outbound stages, optional/degradable incoming lane, and authority-first Stop semantics remain intact;
- no second worker, parallel Meeting owner, generic queue framework, additional model, retry framework, or new runtime service was introduced;
- source validation now records the required outbound preparation and fail-closed readiness contracts.

The audit also found additional bounded Meeting-runtime issues that were intentionally not folded into this slice:

- the finalized outbound pending queue currently preserves older pending speech when full and discards the newest finalized outbound utterance; freshness/backpressure policy needs its own audio-boundary correction;
- the single worker scheduler prioritizes queued outbound work but does not preempt an already-running optional incoming request;
- full Meeting Stop can hard-cancel an in-flight helper request by terminating the persistent worker, so post-Stop helper readiness/restart continuity needs a separate lifecycle review;
- Meeting Microphone provider dispatch remains synchronous in the outbound consumer and therefore belongs to a separate Windows audio/runtime boundary rather than this local-AI preparation slice.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, Windows audio test, installer test, performance measurement, or rendered UI inspection was executed through ChatGPT -> GitHub.

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
```

## Current Mode

**Plan** — the next bounded source issue is Meeting outbound freshness/backpressure while the explicit local-test hold remains active.

Execution channel for next source work:

```text
ChatGPT -> GitHub
```

Do not broaden the next slice into VAD tuning, new worker architecture, model replacement, or Meeting Microphone redesign. Fix the proven finalized-outbound queue freshness behavior first, preserve current natural speech-boundary policy, then reassess the next bottleneck from current source evidence.

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
-> repeated finalized-utterance / backlog behavior observation
-> Windows Meeting audio/device proof
-> Meeting polling / transcript update behavior observation
-> audio-device probe/save transaction proof
-> Stop / helper lifecycle recovery proof
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — Meeting Outbound Freshness / Backpressure

Correct the proven finalized outbound pending-queue policy so current speech is not discarded merely to preserve older unconsumed speech. Keep the queue bounded, preserve generation/session authority and natural finalized-speech boundaries, and do not introduce a second worker or generic queue subsystem.

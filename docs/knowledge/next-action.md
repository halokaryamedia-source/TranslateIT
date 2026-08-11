# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source is now aligned through the Humanized Familiar Translation UI pass **and** the Frontend Runtime Efficiency / Backend Alignment pass:

- one `src/main.ts -> App.svelte` frontend owner;
- Meeting / Text / Settings / First Setup remain declarative Svelte owners;
- `runtimeApi.ts` remains the Tauri transport boundary and `runtimeProductFacade.ts` remains the product-facing mapper;
- settings bridge failure is explicit unavailable state rather than fabricated default settings / First Setup;
- Meeting-facing readiness is projected from the canonical Meeting preflight and recomputed coherently when current Meeting status changes;
- active Meeting polling still checks lightweight Meeting status, but the committed transcript snapshot is only requested when current status revision signals a meaningful change;
- Start/Stop immediately consume the authoritative status returned by the Rust Meeting command rather than doing an immediate full product refetch just to rediscover the result;
- normal application settings use `ProductRuntimeSnapshot.settings`; bootstrap settings remain separate only before the normal snapshot exists;
- audio-device change is one Rust-owned probe/preserve/save transaction through `select_audio_device`, so frontend code no longer owns rollback semantics across several IPC calls;
- Text translation now has a typed backend result separating translated text, product-facing message, and technical blocker; worker/model/device failure detail is not normal Text copy;
- Text still preserves stale-source feedback, editable result, Copy, Ctrl/Cmd+Enter, and late-result protection;
- First Setup preserves five persisted checkpoints but removes the redundant second microphone check after candidate selection already verified the microphone;
- recovery wording is truthful (`Check Setup` / `Check Again`) rather than presenting a route-unrelated action as a guaranteed fix;
- Settings keeps `Meeting / Advanced`; Diagnostics refreshes when explicitly opened;
- no new router, global store, event framework, UI framework, theme engine, animation framework, or parallel backend owner was introduced;
- source validation now records the atomic audio selection, typed Text result, coherent Meeting projection, explicit unavailable settings, and gated transcript-polling contracts.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, clipboard execution, Python/model execution, Windows audio test, installer test, performance measurement, or rendered UI inspection was executed through ChatGPT -> GitHub.

## Closed Frontend Source Boundaries

```text
Phase 1 -> Svelte application ownership
Phase 2 -> bounded semantic visual system
Phase 3 -> UX state / feature completeness
Phase 4 -> source accessibility / maintainability hardening
Phase 5 -> framework-contract review
Humanized Familiar Translation UI -> PR-166 interaction hierarchy + copy simplification
Frontend Runtime Efficiency / Backend Alignment -> coherent state + fewer redundant IPC paths + Rust-owned transactions
```

Source-level accessibility intent remains native controls, focus-visible rules, reduced-motion handling, bounded `aria-live`, Bits UI safe-close dialog semantics, and First Setup progressbar semantics. These are not assistive-technology or rendered proof.

## Current Mode

**Plan** — wait for the next major product/source boundary while the explicit local-test hold remains active.

Execution channel for any next source work:

```text
ChatGPT -> GitHub
```

Do not create another frontend polish slice automatically. The remaining frontend uncertainty is now primarily compile/render/runtime evidence rather than another speculative source-design pass. Continue frontend source work only when a concrete issue is discovered, a major feature requires it, or the user releases the test hold.

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
-> Windows Meeting audio/device proof
-> Meeting polling / transcript update behavior observation
-> audio-device probe/save transaction proof
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — User-Selected Major Feature

Keep the integrated-test queue deferred. The next development boundary is whichever **major feature or concrete source problem the user selects next**. Do not return to speculative frontend decoration or local testing unless the user explicitly changes the hold.

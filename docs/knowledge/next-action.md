# TranslateIT — Next Action

## Current Status

The user explicitly keeps local/integration testing on hold until the major feature set is ready. This hold changes proof timing only; it does not reduce release acceptance.

The current frontend source is now aligned through the Humanized Familiar Translation UI pass:

- one `src/main.ts -> App.svelte` frontend owner;
- Meeting / Text / Settings / First Setup remain declarative Svelte owners;
- `runtimeApi.ts` and `runtimeProductFacade.ts` remain the runtime boundary;
- old vanilla controller/shell/First Setup/CSS ownership remains removed;
- approved stack remains Svelte 5 + Vite + TypeScript + Tailwind CSS 4 + semantic CSS tokens + selective Bits UI + `@lucide/svelte`;
- `PR-166` now owns the durable familiar-translation interaction policy;
- Meeting Ready presents `You speak -> Meeting hears`, suppresses redundant healthy badges, and keeps one dominant Start/Stop action;
- Meeting Live presents `Listening / Translating / Speaking`, a chronological `YOU / MEETING` transcript, optional incoming status, and Stop Translation without exposing normal-user pipeline vocabulary;
- Text uses a familiar `From / To` two-pane flow with Swap, Translate, editable result, Copy, Ctrl/Cmd+Enter, stale-source feedback, and late-result protection;
- First Setup preserves all five persisted checkpoints/device/recovery facts while using ordinary meeting-language questions and progress semantics;
- Settings uses `Meeting / Advanced` tabs rather than a nested second sidebar; Diagnostics remains the technical boundary;
- sidebar and top status hierarchy are lighter and product-facing;
- normal Ready states are visually calm; attention states carry stronger emphasis;
- no new router, global store, UI framework, theme engine, animation framework, or backend abstraction was introduced.

No `npm install`, package-lock regeneration, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, clipboard execution, Python/model execution, Windows audio test, installer test, or rendered UI inspection was executed through ChatGPT -> GitHub.

## Closed Frontend Source Boundaries

```text
Phase 1 -> Svelte application ownership
Phase 2 -> bounded semantic visual system
Phase 3 -> UX state / feature completeness
Phase 4 -> source accessibility / maintainability hardening
Phase 5 -> framework-contract review
Humanized Familiar Translation UI -> PR-166 interaction hierarchy + copy simplification
```

Source-level accessibility intent now includes native controls, focus-visible rules, reduced-motion handling, bounded `aria-live`, Bits UI safe-close dialog semantics, and First Setup progressbar semantics. These are not assistive-technology or rendered proof.

## Current Mode

**Plan** — wait for the next major product/source boundary while the explicit local-test hold remains active.

Execution channel for any next source work:

```text
ChatGPT -> GitHub
```

Do not create another frontend polish slice automatically. Without build/render evidence, further visual tuning risks becoming speculative. Continue source work only when the user selects another major feature, identifies a concrete UI issue/reference, or releases the test hold.

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
-> installer/installed-runtime proof
-> clean-machine proof
```

## Next Step — User-Selected Major Feature

Keep the integrated-test queue deferred. The next development boundary is whichever **major feature or concrete source problem the user selects next**. Do not add speculative frontend decoration or return to local testing unless the user explicitly changes the hold.

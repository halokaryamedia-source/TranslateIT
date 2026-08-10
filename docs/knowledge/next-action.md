# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Global Meeting Strip + Safe Stop & Close is source-aligned. The existing desktop shell now presents canonical application Meeting state outside the Meeting workspace, normal native close fails closed until Meeting state is verified, `Stop & Close` reuses canonical Stop and verifies session clear before forced window destroy, and orderly native exit delegates to the same backend Stop/finalization owner.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/02-product-requirements.md PR-023 / PR-076..079
-> inspect current Meeting Sound / output-capture candidates only for the next Plan boundary
```

## Current Mode

**Plan**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust compilation, TypeScript typecheck, static-validator execution, native close-event
invocation, rendered strip/dialog behavior, Stop/close race timing, filesystem History
persistence, Windows audio/device behavior, and installed operation remain
`LOCAL PROOF REQUIRED`.

# Closed Source Boundary — Global Meeting Strip + Safe Stop & Close

## A. One lifecycle authority remains

Canonical Meeting lifecycle is unchanged:

```text
runtimeProductFacade / runtimeApi
-> get_meeting_session_status
-> start / pause / resume / stop_meeting_translation
-> runtime_state.rs + meeting_session.rs
```

The global shell does not own Meeting session/generation state and does not implement a
second Stop sequence.

## B. Cross-view Meeting strip

The existing shell is extended through:

```text
main.ts
-> shell.ts markup
-> GlobalMeetingShell.ts presentation/orchestration helper
-> runtimeApi.getMeetingSessionStatus
-> mapProductMeetingState
```

The strip:

- is visible only outside the Meeting workspace while the canonical application
  Meeting session exists;
- presents a compact product state + ID -> EN status;
- exposes only `Open Meeting`, delegated through the existing Meeting navigation
  button/controller;
- has no global Pause/Resume/Stop lifecycle controls;
- uses a bounded lightweight Meeting-status refresh rather than the full readiness /
  Diagnostics bundle;
- does not read transcript bodies or accumulate Meeting state in the browser.

Current product states surfaced include Starting, Live, Paused, Resuming, Stopping,
and existing outbound `Needs attention`.

## C. Native close guard

Current Tauri v2 window behavior was verified against official documentation before
implementation. The frontend uses the native close-request event as a guard and uses a
forced window destroy only after the safe-close contract has been satisfied.

Normal close behavior is now source-wired as:

```text
native close request
-> prevent requested close
-> fresh canonical Meeting status read

verified no Meeting session
-> destroy window

canonical application Meeting exists
-> Keep Open / Stop & Close dialog

status unavailable / unknown owner
-> remain open (fail closed)
```

The main-window capability explicitly permits only the required forced-destroy command
in addition to the existing core defaults.

## D. Stop & Close completion gate

`Stop & Close` reuses the same product/backend action as the Meeting workspace:

```text
runtimeProductFacade.runProductMeetingAction("stop")
-> stop_meeting_translation
-> authority revoke + resource cleanup
-> Meeting History finalization policy
-> transient/session clear
-> fresh get_meeting_session_status verification
-> destroy window only when has_session == false
```

A sent Stop request is not treated as completion. Failure, unknown status, or a
remaining session leaves TranslateIT open.

If canonical lifecycle is already `Stopping`, the shell does not launch another Stop.
It waits through bounded status reads until the existing Stop clears the session, then
completes the pending close request.

## E. Orderly native-exit fail-safe

`src-tauri/src/main.rs` now builds the Tauri App and listens to orderly
`RunEvent::ExitRequested`. If the application Meeting owner still exists, it delegates
to `commands::meeting_session::stop_meeting_translation()` rather than reproducing
capture/helper/History cleanup.

If cleanup still reports an application-owned Meeting and the main control window is
available, exit is prevented and the window is restored. If no user control window
remains, the fail-safe does not deliberately keep an invisible process alive.

This is an orderly-exit source safeguard only. Forced process termination, OS crash,
power loss, and actual Windows event ordering are not statically proven.

## F. Static regression definition

`validate_startup_runtime_readiness.mjs` now defines checks for:

- global shell markup/startup wiring;
- read-only canonical Meeting-status consumption;
- no direct parallel Start/Pause/Resume/Stop/capture/transcript path in the global shell;
- close-request prevention and post-Stop forced-destroy gate;
- required `core:window:allow-destroy` capability;
- native orderly-exit delegation to canonical Stop;
- absence of duplicate capture/helper/History cleanup in native main;
- preservation of previous transcript and Meeting History ownership contracts.

The validator was **not executed** in this channel.

# Static Proof State

**CURRENT-PROJECT VERIFIED** at source level:

1. one canonical backend Meeting lifecycle remains;
2. Text/History/Settings can receive a lightweight projection of that same Meeting state without a second store;
3. `Open Meeting` reuses current navigation rather than creating another route owner;
4. native close does not treat an unknown Meeting status as safe-to-close;
5. `Stop & Close` reuses canonical Stop and requires fresh proof that the session is gone before window destroy;
6. already-Stopping state is observed rather than duplicated;
7. orderly native exit delegates to canonical Stop/History finalization rather than reproducing cleanup;
8. the required Tauri window-destroy capability is explicitly scoped to the main window.

No compile/typecheck/validator execution, native event invocation, rendered UI,
Stop-close race proof, History filesystem proof, or Windows behavior was obtained.

# Known Gaps Kept Truthful

- incoming Meeting Sound / `INCOMING` transcript turns and self-output suppression are not implemented;
- approved tone/context does not yet reach canonical inference;
- Text Copy/direct Save remains incomplete;
- multi-instance enforcement and sleep/hibernate handling remain incomplete;
- `uv.lock`, model acquisition metadata, and packaging remain incomplete;
- all compile/test/model/audio/performance/installed proof remains deferred locally.

# Hold

- do not turn Close into minimize-to-tray/background behavior;
- do not add global Pause/Resume/Stop controls or simulate `Stop Voice`;
- do not bypass canonical `stop_meeting_translation` or duplicate History finalization;
- do not treat status/bridge failure as proof that no Meeting exists;
- do not mix incoming Meeting implementation into the completed close lifecycle slice.

## Next Step

Plan the **Canonical Incoming Meeting Sound + Self-Output Suppression Boundary**. Resolve
one owner/path for Meeting Sound capture -> final English ASR -> Indonesian committed
`INCOMING` turn, including how TranslateIT's own English TTS is excluded, how incoming
remains optional/degradable, and how it shares chronological Meeting turn ordering
without creating a second Meeting/session/conversation authority.

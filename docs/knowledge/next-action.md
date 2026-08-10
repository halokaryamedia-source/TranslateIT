# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **The Global Meeting Cross-View State + Safe Close Lifecycle boundary is ownership-resolved. The existing desktop shell/controller will present a read-only global Meeting strip from the canonical application Meeting session, and native close will use the existing canonical Stop lifecycle before application exit rather than creating a second Meeting control plane. Source implementation is next.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> SimpleLauncherController.ts + lockedReferenceShellParts.ts
-> runtimeProductFacade.ts / runtimeApi.ts only as existing canonical bridge
-> main.ts + windowRescue.ts + src-tauri main.rs/app_bootstrap.rs only for native window lifecycle
-> meeting_session.rs only as the existing Stop/finalization owner
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Before implementation of version-sensitive native-window behavior, retrieve the current
official Tauri v2 documentation for close-request/application-exit events. Repository
policy remains semantic authority; external documentation only resolves the concrete
Tauri API contract.

Rust compilation, TypeScript typecheck, static-validator execution, native close-event
invocation, rendered strip/dialog behavior, Stop/close race timing, filesystem History
persistence, Windows runtime behavior, and installed operation remain
`LOCAL PROOF REQUIRED`.

# Closed Planning Boundary

## A. One Meeting lifecycle authority remains

The canonical lifecycle remains:

```text
runtimeProductFacade / runtimeApi
-> get_meeting_session_status
-> start / pause / resume / stop_meeting_translation
-> runtime_state.rs + meeting_session.rs
```

Cross-view presentation and native window handling must not create another Meeting
session store, generation owner, Stop implementation, recovery controller, or
persistence path.

## B. Cross-view presentation owner

The active desktop shell is already owned by `SimpleLauncherController.ts` together
with the current shell markup in `lockedReferenceShellParts.ts` / `shell.ts`.

That existing shell will own a **compact global Meeting strip**. It is presentation
only and reads the canonical `MeetingSessionStatus` through the existing bridge and
`mapProductMeetingState()`.

The strip is shown outside the Meeting workspace when the application Meeting session
exists. It covers the current application-owned lifecycle states:

```text
Starting
Live
Paused
Resuming
Stopping
Needs attention        # existing unsafe outbound attention only
```

Normal content is intentionally small:

```text
Meeting state
ID -> EN / short plain-language status
Open Meeting
```

`Open Meeting` reuses the existing navigation owner. The strip does not gain its own
Pause/Resume/Stop controls. The optional contextual `Stop Voice` requirement remains a
later capability because no current canonical Stop Voice source exists.

The strip is hidden on the Meeting workspace to avoid duplicating the local Meeting
controls/transcript and hidden when no application Meeting session exists.

Background refresh must be bounded and read-only. It must not repeatedly run the full
product readiness/Diagnostics bundle merely to keep the strip current, and it must not
persist a frontend Meeting state store.

## C. Current source gap

Current source already proves navigation independence, but it does **not** yet satisfy
the global presentation contract:

- `userPresence` / `recordStatusText` are updated only through controller readiness
  refresh and are not a dedicated cross-view Meeting strip;
- `MeetingLiveActivityPresentation.ts` refreshes detailed Meeting activity only while
  the Meeting workspace is visible;
- Settings has no dedicated global active-Meeting surface;
- `main.ts`, `main.rs`, and `app_bootstrap.rs` currently install no safe-close guard.

## D. Normal native close contract

Approved product behavior remains: minimize/hide does not end a healthy Meeting, but
closing TranslateIT while an application Meeting session exists requires explicit
**Stop & Close**.

Normal native close request:

```text
read canonical Meeting status

verified no application Meeting session
-> allow normal close

application Meeting session exists
-> prevent native close
-> show shell-level confirmation dialog
   -> Keep Open
   -> Stop & Close

Meeting status cannot be verified safely
-> prevent close
-> keep user control plane visible
-> show retryable close-state message
```

There is no `Close anyway` path while an application Meeting session may still own
output authority.

The confirmation dialog is a shell element, not a page and not a new lifecycle owner.

## E. Stop & Close contract

`Stop & Close` must reuse exactly the same canonical Stop action as the Meeting
workspace:

```text
Stop & Close
-> runtimeProductFacade.runProductMeetingAction("stop")
-> stop_meeting_translation
-> revoke generation authority
-> resource cleanup
-> Meeting History finalization policy
-> clear transient/session state
-> only then permit native window close
```

The window must not close merely because the Stop button/request was sent. The returned
canonical state must confirm that the application Meeting session no longer exists.

If Stop/finalization reports failure or the post-Stop state still has a Meeting
session, TranslateIT remains open and the user receives a normal product-level error.

For a session already in `Stopping`, close handling waits for the existing canonical
Stop to finish rather than launching a second cleanup path. For `Starting` or
`Resuming`, explicit `Stop & Close` is newer user intent and may invoke the existing
backend Stop authority; generation guards must prevent the older transition from
re-establishing output afterward.

A one-shot frontend "close permitted" flag after verified Stop is transport/presentation
state only; it must never represent Meeting lifecycle truth.

## F. Orderly native-exit fail-safe

A frontend close guard cannot be the only safety layer because the product requirement
also covers loss of the normal user control plane.

The Tauri application/window lifecycle owner in `main.rs` / `app_bootstrap.rs` should
install one orderly-exit fail-safe that delegates to the **same** backend Meeting Stop/
finalization owner if an application exit proceeds while a Meeting session still
exists.

This fail-safe:

- does not show a second prompt;
- does not implement another Stop sequence;
- does not own Meeting state;
- only delegates to the existing canonical backend cleanup/finalization;
- is for orderly native exit paths that still execute application lifecycle hooks.

Forced process termination, OS crash, or power loss cannot be claimed safe from static
source and remain local/platform proof boundaries.

# Planned Implementation Slice

Implement **Global Meeting Strip + Safe Stop & Close**.

In scope:

1. shell-level global Meeting strip in the existing shell markup/style system;
2. bounded read-only canonical Meeting-status refresh outside the Meeting workspace;
3. `Open Meeting` navigation through the existing controller;
4. shell-level native close interception and `Keep Open / Stop & Close` confirmation;
5. canonical Stop completion gate before native close is permitted;
6. orderly native-exit fallback delegating to the same backend Stop owner;
7. static source-contract validation for no duplicate lifecycle authority.

Out of scope:

- contextual global `Stop Voice`;
- cross-view Push-to-Talk implementation;
- incoming Meeting Sound / `INCOMING` turns;
- tray/background application mode;
- multi-instance enforcement;
- sleep/hibernate implementation;
- Svelte, packaging, benchmark, or local Windows acceptance.

## Acceptance criteria

1. **One authority:** global strip/dialog/native-exit paths read or delegate to the
   existing application Meeting lifecycle; no frontend/backend duplicate Meeting store
   or cleanup sequence is introduced.
2. **Cross-view truth:** Text, History, and Settings can show the current application
   Meeting state and return to Meeting without stopping/recreating it; Meeting/idle do
   not show a duplicate strip.
3. **Safe close:** verified active/paused/transitional Meeting state prevents normal
   window close and requires explicit `Stop & Close`; unknown status also fails closed.
4. **Stop completion gate:** native close occurs only after canonical Stop reports no
   remaining application Meeting session; failure leaves the app open, and existing
   `Stopping` is not duplicated.
5. **Orderly-exit fallback:** native app-exit handling reuses the same backend Stop/
   History-finalization owner and does not become a second lifecycle control plane.

# Proof Budget

`ChatGPT -> GitHub` may prove:

- current shell/window owner wiring;
- canonical status/action caller paths;
- absence of duplicate Meeting state/Stop implementations;
- close-order source guards;
- static validator definitions;
- canonical documentation consistency.

Still `LOCAL PROOF REQUIRED`:

- TypeScript/Rust compilation;
- validator execution;
- actual Tauri close-request/event behavior;
- confirmation dialog and cross-view rendered behavior;
- close/Start/Resume/Stop race timing;
- History persistence during Stop & Close;
- Windows native lifecycle behavior.

# Hold

- do not convert native Close into minimize-to-tray/background mode;
- do not add global Pause/Resume/Stop controls to the strip;
- do not bypass `stop_meeting_translation` or duplicate History finalization;
- do not treat a bridge/status failure as proof that no Meeting exists;
- do not mix incoming Meeting, PTT, multi-instance, sleep/hibernate, packaging, or
  Windows acceptance into this slice.

## Next Step

Implement **Global Meeting Strip + Safe Stop & Close** as the bounded Developing slice
above, after verifying the exact current Tauri v2 close-request/application-exit API
from official documentation.
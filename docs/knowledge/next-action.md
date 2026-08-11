# TranslateIT — Next Action

## Current Status

The bounded P0 source-correctness set from the comprehensive core/release audit remains source-closed. Broader Rust/Tauri, Python/model, Windows-audio, installer, and performance testing remain held.

The user released the hold only for frontend dependency/build/render work and then requested a professional visual audit of the actual rendered application. The Meeting / Text / Settings visual layer has now been revised in **ALIGN** mode: existing product behavior and runtime contracts were preserved while hierarchy, density, spacing, component weight, and desktop use of space were improved.

### Frontend visual redesign

Current source changes:

```text
visual tokens
-> slightly lifted dark surfaces, softer hierarchy, smaller radii/shadow
-> narrower sidebar, wider useful content region

sidebar
-> reduced width and row height
-> simpler active state
-> removed secondary nav descriptions from the visible scan path
-> compact product readiness footer

Meeting
-> simple “Meeting translation” heading
-> compact ID -> EN direction strip
-> three horizontally scannable setup facts
-> fewer nested row/card layers
-> readiness message + recovery + Start/Stop consolidated in one footer
-> primary Start/Stop visually anchored at the action edge

Text
-> familiar From / To workspace retained
-> nested textarea boxes replaced by clean editor panes
-> translation status and character count de-emphasized
-> Copy / Translate grouped at result-action edge

Settings
-> Meeting / Advanced tabs moved into the page header
-> repeated title/section layers removed
-> microphone and Meeting Sound use one compact two-column setup region
-> Meeting microphone and setup actions consolidated into the same panel
-> Advanced / Diagnostics density reduced without changing technical ownership
```

No navigation semantics, readiness truth, Meeting lifecycle, Text translation behavior, settings persistence, Tauri bridge behavior, model/audio behavior, or backend ownership changed in this visual slice.

### Frontend proof obtained

Latest visual proof: GitHub Actions run `31518906505` on branch `New` plus a temporary browser render harness. The temporary workflow was removed after proof and is not a permanent CI owner.

```text
npm dependency materialization     -> PASS in proof runner
startup source contract validator  -> PASS
svelte-check                       -> PASS: 0 errors, 4 existing FirstSetup warnings
Vite production build              -> PASS
actual built Svelte Meeting render -> PASS
actual built Svelte Text render    -> PASS
Text interaction / translated view -> PASS with simulated translation response
actual built Svelte Settings render-> PASS
```

The four warnings remain `state_referenced_locally` warnings in `src/pages/FirstSetup.svelte`; this visual task did not edit First Setup.

The screenshots are real pixels from the built Svelte/Vite source, not generated artwork. The browser proof injects simulated Tauri Ready/device responses so the visual surfaces can be evaluated without starting Rust, Python, models, or Windows audio. It proves frontend composition/build behavior only.

The proof runner generated temporary dependency state; no repository `package-lock.json` was adopted as release authority.

## Priority Map

### P0 — Core source correctness — SOURCE CLOSED / RUNTIME PROOF REQUIRED

1. Optional Incoming Failure Isolation
2. Active Meeting Settings / Recovery Isolation
3. Meeting Route Pair / Identity / Session Truth
4. Meeting Route Provider Preflight Hang Containment
5. Sleep / Hibernate Authority Invalidation

All remain queued for target runtime/device proof.

### P1 — Core hardening after executable evidence

- **P1.1 Functional Setup Readiness Alignment**
- **P1.2 Helper Scheduler Admission Bounds**
- **P1.3 Helper stderr Privacy / Disk Bounds**
- **P1.4 Product-Release vs Meeting-Required Asset Semantics**

Do not resume these merely because source edits are possible; first use executable/native evidence to identify which hardening still matters.

### P2 — Release-blocking proof/materialization

#### P2.1 Frontend — PARTIAL PROOF OBTAINED

Obtained:

```text
dependency materialization in proof runner
source validator
svelte-check
Vite production build
Meeting / Text / Settings browser render
basic Text interaction render
```

Still required before release:

```text
review/fix relevant FirstSetup warnings
adopt/review canonical dependency lockfile
native Tauri/WebView render
resize smoke
keyboard/focus smoke
clipboard proof
real runtime-state projection
```

#### P2.2 Rust / Tauri executable proof — STILL HELD

```text
compile
-> launch
-> Start / Stop / safe close
-> Windows power lifecycle
-> active-session settings guards
-> matched route preparation/binding
-> provider-preflight termination
-> resource cleanup / fault paths
```

#### P2.3 Python / model proof — STILL HELD

Real ASR, ID->EN, EN->ID, English TTS, CUDA-preferred and CPU fallback behavior remain unproved.

#### P2.4 Windows Meeting audio acceptance — STILL HELD

Physical mic, actual Meeting route, meeting-app reception, optional incoming, suppression, Stop/Close/sleep/wake, and hardened fault cases remain unproved.

#### P2.5 Latency / stability / long-session — STILL HELD

Target-hardware latency and long-session resource behavior remain unmeasured.

#### P2.6 Installer / clean-machine — STILL HELD

Private PythonRuntime, models/assets, supported Meeting route, NSIS staging/install, installed execution, and clean-machine acceptance remain required.

### P3 — Cleanup after core acceptance

README/runtime documentation drift, stale internal terminology, and permanent CI may be reconciled after core acceptance. Deferred product features remain out of initial scope.

## Sequencing Rule

```text
P0 source correctness CLOSED
-> frontend actual-render redesign + proof COMPLETE for current visual slice
-> user visual acceptance
-> explicit approval before widening proof scope
-> Rust/Tauri + runtime/model/Windows-audio proof
-> fix measured failures
-> finish only still-relevant P1
-> packaging + clean-machine acceptance
```

## Current Mode

**Plan / visual acceptance** — the requested clean-look redesign has source/type/build/render evidence. Broader native/runtime/device proof remains outside the currently released frontend-only scope.

## Next Step — Review Redesigned Actual Render

Review the new actual Meeting, Text, and Settings renders. If the visual direction is approved, keep this frontend design baseline and return to the broader proof sequence only after explicit approval to widen the current hold.

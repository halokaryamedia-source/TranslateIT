# TranslateIT — Next Action

## Current Status

The user approved the redesigned Meeting / Text / Settings visual direction as the ongoing TranslateIT frontend baseline. Future visual work must preserve this clean desktop-utility language through the existing `desktop-ui-design-development` owner unless the user explicitly changes direction.

The previous proof hold has now been widened one bounded step beyond frontend rendering: **Windows Rust/Tauri compile proof** is allowed and has been executed. Python/model execution, real Windows audio/device proof, installer proof, and performance measurement are still not part of the current proof scope.

## Approved Frontend Visual Baseline

Preserve these rules:

```text
compact dark desktop utility
clear task/state hierarchy before decoration
narrow lightweight sidebar
few nested cards / borders / shadows
calm healthy / Ready states
stronger state color only when attention/action is needed
one visually obvious primary action per normal workflow
useful content gets the largest share of space
no generic AI gradients, glow, glassmorphism, or decorative dashboard grids
```

Current Meeting / Text / Settings source has actual dependency, typecheck, production-build, and browser-render evidence. Latest visual proof remains GitHub Actions run `31518906505` with simulated Tauri Ready/device data only.

```text
startup source contract validator -> PASS
svelte-check                      -> PASS: 0 errors, 4 existing FirstSetup warnings
Vite production build             -> PASS
Meeting / Text / Settings render  -> PASS
Text translated-state interaction -> PASS with simulated response
```

The four Svelte warnings are still `state_referenced_locally` warnings in `src/pages/FirstSetup.svelte`; they are not compile errors and were not part of the approved visual redesign.

## Windows Rust/Tauri Compile Baseline

The first Windows compile proof exposed real command-boundary errors instead of being treated as a source-only success:

```text
runtime::start_helper_bridge
+ helper_bridge::start_helper_bridge
-> duplicate #[tauri::command] generated symbol

runtime::start_meeting_translation
+ meeting_session::start_meeting_translation
-> duplicate #[tauri::command] generated symbol

runtime.rs
-> HelperBridgeActionResult imported through the wrong module visibility boundary
```

The correction kept the existing architecture:

- `commands/runtime.rs` remains the public guarded Tauri command owner for `start_helper_bridge` and `start_meeting_translation`;
- the helper and Meeting implementations remain ordinary internal Rust functions called by those wrappers;
- `HelperBridgeActionResult` is imported from its actual public owner `helper_bridge_runtime`;
- no command alias, second registry, fallback, or parallel runtime path was added.

After that bounded maintenance correction, Windows proof run `31520306515` passed:

```text
Windows Server 2025 / MSVC target
npm dependency materialization -> PASS
svelte-check                    -> PASS: 0 errors / 4 existing FirstSetup warnings
Vite production build           -> PASS
Rust manifest preflight         -> PASS
cargo check / Tauri Rust source -> PASS
```

`cargo check` completed successfully with warnings. The warning set includes existing dead-code/internal-helper warnings plus one unused local binding in incoming helper recovery. They are evidence for later cleanup/review, not a reason to claim runtime failure or to perform broad speculative deletion now.

Temporary proof/maintenance GitHub Actions workflows were removed after use; no permanent CI owner was added.

## Priority Map

### P0 — Core source correctness — SOURCE CLOSED / RUNTIME PROOF REQUIRED

1. Optional Incoming Failure Isolation
2. Active Meeting Settings / Recovery Isolation
3. Meeting Route Pair / Identity / Session Truth
4. Meeting Route Provider Preflight Hang Containment
5. Sleep / Hibernate Authority Invalidation

All still require real target-runtime/device acceptance where applicable.

### P1 — Core hardening after executable evidence

- **P1.1 Functional Setup Readiness Alignment**
- **P1.2 Helper Scheduler Admission Bounds**
- **P1.3 Helper stderr Privacy / Disk Bounds**
- **P1.4 Product-Release vs Meeting-Required Asset Semantics**

Do not resume P1 merely because source edits are possible. Use measured/native evidence first.

### P2 — Release-blocking proof/materialization

#### P2.1 Frontend — PARTIAL PROOF OBTAINED

Obtained:

```text
dependency materialization in proof runners
source validator
svelte-check
Vite production build
actual Meeting / Text / Settings browser render
basic Text translated-state interaction
approved clean visual baseline
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

#### P2.2 Rust / Tauri executable proof — PARTIAL PROOF OBTAINED

Obtained:

```text
Windows MSVC Rust toolchain
Rust manifest preflight
cargo check of the Tauri binary source
public command-boundary compile correction
```

Still required:

```text
native Windows link/build baseline
application launch / main-window bootstrap
native WebView frontend presentation
Start / Stop / safe-close lifecycle
Windows power lifecycle
active-session Settings guards
matched route preparation/binding
provider-preflight termination
resource cleanup and relevant fault paths
```

#### P2.3 Python / model proof — NOT YET EXECUTED

Real ASR, ID->EN, EN->ID, English TTS, CUDA-preferred behavior, and CPU fallback remain unproved.

#### P2.4 Windows Meeting audio acceptance — NOT YET EXECUTED

Physical mic, actual Meeting route, meeting-app reception, optional incoming, own-TTS suppression, Stop/Close/sleep/wake, and hardened audio fault cases remain unproved.

#### P2.5 Latency / stability / long-session — NOT YET EXECUTED

Target-hardware latency and long-session resource behavior remain unmeasured.

#### P2.6 Installer / clean-machine — NOT YET EXECUTED

Private PythonRuntime, models/assets, supported Meeting route, NSIS staging/install, installed execution, and clean-machine acceptance remain required.

### P3 — Cleanup after core acceptance

Compiler dead-code warnings, README/runtime documentation drift, stale internal terminology, and permanent CI may be reconciled after the core acceptance path shows which code is genuinely obsolete. Deferred product features remain outside initial scope.

## Sequencing Rule

```text
P0 source correctness CLOSED
-> frontend visual baseline APPROVED + rendered proof
-> Windows cargo-check baseline PASS
-> native Windows link/build proof
-> native launch/lifecycle proof
-> Python/model + Windows-audio proof
-> fix measured failures
-> finish only still-relevant P1
-> packaging + clean-machine acceptance
```

## Current Mode

**Proof / Maintenance** — the first Windows compile failure was corrected at its command-ownership root cause and `cargo check` now passes. Do not broaden into model/audio testing inside the same slice.

## Next Step — P2.2 Windows Native Link / Build Baseline

Build the current Tauri application as a Windows native executable without yet exercising Python/model or real audio. Prove that the current app bootstrap, Tauri context, native Windows power-hook linkage, and frontend resource integration survive the linker/build boundary. If the native build fails, fix only the concrete build/link/config error before attempting application launch.
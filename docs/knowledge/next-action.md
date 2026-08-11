# TranslateIT — Next Action

## Current Status

The approved Meeting / Text / Settings redesign remains the TranslateIT visual baseline. Future visual work must preserve the clean desktop-utility language through the existing `desktop-ui-design-development` owner unless the user explicitly changes direction.

The user does **not** want testing on their local PC yet. Proof has therefore advanced only through remote GitHub-hosted Windows runners. Python/model execution, real Windows audio/device proof, installer/clean-machine proof, and performance measurement remain outside the current proof scope.

P2.2 has now crossed two executable boundaries remotely:

```text
Windows cargo check            -> PASS
Windows native release linking -> PASS
```

No local-PC execution occurred.

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

Current Meeting / Text / Settings source has dependency, typecheck, production-build, and actual browser-render evidence. Latest visual proof remains GitHub Actions run `31518906505` with simulated Tauri Ready/device data only.

```text
startup source contract validator -> PASS
svelte-check                      -> PASS: 0 errors, 4 existing FirstSetup warnings
Vite production build             -> PASS
Meeting / Text / Settings render  -> PASS
Text translated-state interaction -> PASS with simulated response
```

The four Svelte warnings remain `state_referenced_locally` warnings in `src/pages/FirstSetup.svelte`; they are not compile errors and were not introduced by the approved redesign.

## Windows Rust/Tauri Compile Baseline

The first remote Windows compile proof exposed concrete command-boundary errors:

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

The bounded correction preserved the architecture:

- `commands/runtime.rs` remains the public guarded Tauri command owner for `start_helper_bridge` and `start_meeting_translation`;
- helper and Meeting implementations remain ordinary internal Rust functions called by those wrappers;
- `HelperBridgeActionResult` is imported from its actual public owner `helper_bridge_runtime`;
- no alias command, second registry, fallback, or parallel runtime path was added.

Remote Windows proof run `31520306515` then passed:

```text
Windows Server 2025 / MSVC target
npm dependency materialization -> PASS
svelte-check                    -> PASS: 0 errors / 4 existing FirstSetup warnings
Vite production build           -> PASS
Rust manifest preflight         -> PASS
cargo check / Tauri Rust source -> PASS
```

## Windows Native Link / Build Baseline

The next bounded remote proof used:

```text
npx tauri build --no-bundle
```

This command intentionally exercises the Tauri release/link boundary and the configured frontend `beforeBuildCommand` while skipping NSIS/installer generation.

The first attempt stopped before native build because `preflight:tauri-package` falsely matched the approved worker line:

```text
SCRIPT_ROOT = Path(__file__).resolve().parents[4]
```

against the old forbidden substring:

```text
ROOT = Path(__file__).resolve().parents[4]
```

The worker path architecture was already correct: `SCRIPT_ROOT` is the development fallback, while packaged runtime and writable user-data roots are provided through the absolute Tauri-owned environment contract. Only the validator marker was narrowed so a standalone legacy `ROOT = ...` assignment remains forbidden without treating `SCRIPT_ROOT` as that legacy variable. No Python worker behavior or packaged-path semantics changed.

After that bounded validator correction, remote Windows proof run `31523183206` passed:

```text
Windows Server 2025 / MSVC target
Node 22.16.0
Rust 1.97.1
npm dependency materialization -> PASS
svelte-check                    -> PASS: 0 errors / 4 existing FirstSetup warnings
package source preflight        -> PASS
Tauri beforeBuildCommand/Vite   -> PASS
native optimized release build -> PASS
native executable verification -> PASS
```

Produced on the GitHub-hosted runner:

```text
src-tauri/target/release/translateit.exe
size: 9,695,232 bytes
```

The native release build completed with compiler warnings but no link/build error. The warning set remains mainly existing dead/internal code plus one unused incoming-recovery binding. Do not mass-delete those paths merely to silence warnings before runtime evidence establishes which code is genuinely obsolete.

This proof establishes that the current Tauri context, compiled Windows power-hook linkage, frontend build/resource integration, and Rust binary can survive the native Windows release linker/build boundary. It does **not** establish that the executable successfully launches its main window or that any runtime/model/audio capability works.

Temporary proof workflows are removed after evidence is recorded; no permanent CI owner is introduced by these proof slices.

## Priority Map

### P0 — Core source correctness — SOURCE CLOSED / RUNTIME PROOF REQUIRED

1. Optional Incoming Failure Isolation
2. Active Meeting Settings / Recovery Isolation
3. Meeting Route Pair / Identity / Session Truth
4. Meeting Route Provider Preflight Hang Containment
5. Sleep / Hibernate Authority Invalidation

All still require target-runtime/device acceptance where applicable.

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

Obtained remotely:

```text
Windows MSVC Rust toolchain
Rust manifest preflight
cargo check of the Tauri binary source
public command-boundary compile correction
package source preflight
optimized native Windows release link/build
verified translateit.exe output
```

Still required:

```text
remote/native application process launch baseline
main-window bootstrap survival
native WebView frontend presentation where the execution environment can prove it
Start / Stop / safe-close lifecycle
Windows power lifecycle behavior
active-session Settings guards
matched route preparation/binding
provider-preflight termination
resource cleanup and relevant fault paths
```

None of the remaining items should be silently substituted with user-local-PC testing while that is not approved.

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
-> Windows native release link/build PASS
-> remote native launch/bootstrap proof
-> later explicit approval for local/model/audio proof
-> fix measured failures
-> finish only still-relevant P1
-> packaging + clean-machine acceptance
```

## Current Mode

**Proof / Maintenance** — remote native Windows build/link is now proven. The package-preflight false positive was corrected at the validator boundary only. No user-local-PC, Python/model, or real audio execution occurred.

## Next Step — P2.2 Remote Windows Native Launch / Bootstrap Baseline

Attempt the built application on a GitHub-hosted Windows environment only, without using the user's local PC and without exercising Python/model/audio capabilities. Prove the process can cross application startup and main-window bootstrap far enough to remain healthy instead of immediately failing. If the hosted runner cannot provide meaningful GUI/WebView evidence, record that execution-environment limit explicitly and stop at that boundary rather than substituting local-PC testing.
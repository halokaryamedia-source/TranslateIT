# TranslateIT — Next Action

## Current Status

The approved Meeting / Text / Settings redesign remains the TranslateIT visual baseline. Future visual work must preserve the clean desktop-utility language through the existing `desktop-ui-design-development` owner unless the user explicitly changes direction.

The user does **not** want testing on their local PC yet. Proof therefore remains limited to remote GitHub-hosted Windows execution. Python/model execution, real Windows audio/device acceptance, installer/clean-machine proof, and performance measurement remain outside the current proof scope.

The current remote executable/presentation chain is now:

```text
Windows cargo check                 -> PASS
Windows native release link/build   -> PASS
Windows native launch/bootstrap     -> PASS
Native Tauri/WebView pixel render   -> PASS
```

No user-local-PC execution occurred.

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

Meeting / Text / Settings already have actual dependency, typecheck, production-build, and browser-render evidence. Browser proof run `31518906505` used simulated Tauri Ready/device responses only.

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

The bounded correction preserved the existing architecture:

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

The bounded remote link proof used:

```text
npx tauri build --no-bundle
```

This exercises the Tauri release/link boundary and configured frontend `beforeBuildCommand` while skipping NSIS/installer generation.

The first attempt stopped before native build because `preflight:tauri-package` falsely matched the approved worker line:

```text
SCRIPT_ROOT = Path(__file__).resolve().parents[4]
```

against the old forbidden substring:

```text
ROOT = Path(__file__).resolve().parents[4]
```

The worker path architecture was already correct: `SCRIPT_ROOT` is the development fallback, while packaged runtime and writable user-data roots are provided through the absolute Tauri-owned environment contract. Only the validator marker was narrowed; no Python worker behavior or packaged-path semantics changed.

Remote Windows proof run `31523183206` then passed:

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

## Windows Native Launch / Bootstrap Baseline

Remote proof run `31524375643` built the release executable and launched it on a fresh isolated Windows profile. The harness replaced `LOCALAPPDATA` and `APPDATA` with empty runner-temp directories so TranslateIT could not inherit previous setup state.

Fresh settings intentionally resolve to:

```text
meeting_setup_state = new
```

and the frontend boot path only loads settings before presenting First Setup. `loadProductRuntimeSnapshot()` is not entered while setup remains `new`, so this launch slice does not intentionally start the helper, query worker capability status, begin model inference, or start audio capture.

Observed after a 15-second bootstrap window:

```text
TranslateIT process alive       -> true
Windows process Responding      -> true
MainWindowHandle                -> non-zero
MainWindowTitle                 -> TranslateIT
Python child process count      -> 0
translateit.exe size            -> 9,695,232 bytes
```

This established native Tauri startup, packaged-path initialization, main-window creation, Windows power-hook installation, and event-loop survival. Harness `Stop-Process -Force` was cleanup only and is **not** safe-close evidence.

## Native Tauri / WebView Presentation Baseline

Remote native presentation proof used the same fresh-profile startup boundary so First Setup was shown without intentionally entering Python/model/audio capability paths.

The first capture attempt correctly refused to claim success because a coarse `PrintWindow` sample saw only seven colors, which was insufficient to distinguish a valid minimal dark UI from an incomplete WebView capture.

The second proof run `31526188646` kept the native process/window requirements and uploaded the capture for direct visual inspection. Observed data:

```text
Windows Server 2025
TranslateIT process Responding    -> true
MainWindowHandle                  -> 131416 (non-zero)
MainWindowTitle                   -> TranslateIT
native window bounds              -> 1616 x 979
PrintWindow capture               -> produced PNG
dense sampled unique RGB values   -> 36
PNG size                           -> 41,049 bytes
Python child process count        -> 0
```

Artifact:

```text
translateit-native-webview-proof
artifact id: 9115236210
file: TranslateIT-FirstSetup-Native-WebView.png
```

The uploaded PNG was downloaded and visually inspected after the workflow. It contains the actual native Windows title bar plus rendered TranslateIT First Setup WebView content, including:

```text
TranslateIT / Meeting setup
Step 1 of 5 / 20%
Set up meeting translation
You speak: Indonesian -> English voice
You read: English -> Indonesian text / Optional
Set Up Later
Continue
```

This is therefore valid **native Tauri/WebView pixel evidence**, not a browser-only harness and not a generated image. The composition is coherent at the canonical startup size and follows the approved clean desktop-utility language.

The hosted runner positioned the centered window partly outside its virtual desktop coordinate origin (`-296,-126`), but `PrintWindow` captured the complete native window at `1616 x 979`; this is a runner-desktop geometry detail, not an application layout failure.

The native release build still emits existing Rust warnings, mainly dead/internal paths plus one unused incoming-recovery binding. Do not mass-delete those paths merely to silence warnings before runtime evidence establishes which code is genuinely obsolete.

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
native First Setup Tauri/WebView pixel render
```

Still required before release:

```text
review/fix relevant FirstSetup warnings
adopt/review canonical dependency lockfile
native resize smoke
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
fresh-profile native process launch
bootstrap survival
responding native TranslateIT top-level window
native First Setup WebView pixel presentation
no Python child process during fresh First Setup proof
```

Still required:

```text
safe-close lifecycle
Start / Stop lifecycle
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
-> frontend visual baseline APPROVED + browser-render proof
-> Windows cargo-check baseline PASS
-> Windows native release link/build PASS
-> Windows native launch/bootstrap PASS
-> native Tauri/WebView presentation PASS
-> remote resize/focus proof
-> later explicit approval for local/model/audio proof
-> fix measured failures
-> finish only still-relevant P1
-> packaging + clean-machine acceptance
```

## Current Mode

**Proof** — native Tauri/WebView First Setup presentation is now visually proven on a fresh GitHub-hosted Windows profile. No user-local-PC, Python/model, or real audio execution occurred.

## Next Step — P2.1 Remote Native Resize / Keyboard / Focus Smoke

Use the same fresh-profile GitHub-hosted Windows application only. Exercise the real native Tauri window across a small bounded resize set and basic keyboard/focus traversal on First Setup, confirming the WebView stays coherent and the primary setup controls remain reachable. Keep `meeting_setup_state = new` so Python/model/audio paths are not intentionally entered. Do not substitute the user's local PC if the hosted runner cannot provide meaningful input/focus evidence.
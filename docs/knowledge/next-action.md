# TranslateIT — Next Action

## Current Status

The approved Meeting / Text / Settings redesign remains the TranslateIT visual baseline. Future visual work must preserve the clean desktop-utility language through the existing `desktop-ui-design-development` owner unless the user explicitly changes direction.

The user does **not** want testing on their local PC yet. The user has now approved **Python/model execution as the next deferred runtime scope**, but requested a full active-backend audit before P2.3. That audit found bounded hardening issues that should be corrected first. Real Windows audio/device acceptance, installer/clean-machine proof, and performance measurement remain outside the current scope.

The current remote executable/presentation chain is now:

```text
Windows cargo check                 -> PASS
Windows native release link/build   -> PASS
Windows native launch/bootstrap     -> PASS
Native Tauri/WebView pixel render   -> PASS
Native resize / keyboard focus      -> PASS
FirstSetup Svelte diagnostics       -> PASS: 0 errors / 0 warnings
Canonical frontend package lock     -> PASS: strict npm ci
Remote Text clipboard interaction   -> PASS
Real fresh Rust state projection    -> PASS: First Setup safe boundary
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

Meeting / Text / Settings already have actual dependency, typecheck, production-build, and browser-render evidence. Browser proof run `31518906505` used simulated Tauri Ready/device responses only. The later First Setup cleanup proof supersedes the old four-warning diagnostic baseline.

```text
startup source contract validator -> PASS
svelte-check                      -> PASS: 0 errors / 0 warnings
Vite production build             -> PASS
Meeting / Text / Settings render  -> PASS
Text translated-state interaction -> PASS with simulated response
native First Setup render         -> PASS
```

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
Svelte/Vite frontend baseline  -> PASS
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

## Native Resize / Keyboard / Focus Baseline

Remote proof remained on the fresh Step 1 First Setup boundary. No setup action was activated, because `Continue` would enter Step 2 readiness/device work; keyboard proof therefore tested focus traversal only.

The first run `31527673421` already proved all three resize states render coherently and that both footer buttons are keyboard reachable, but the harness incorrectly assumed the observation must begin before `Set Up Later`. WebView2 UI Automation exposed internal `Pane` boundaries and the initial focused element had not been recorded, so that run was correctly not accepted as the final focus-order proof.

The refined proof run `31528521406` recorded the starting focused element before sending any key and passed:

```text
native release build                  -> PASS
resize startup outer window           -> 1616 x 979 / coherent
resize medium outer window            -> 1456 x 879 / coherent
resize near configured minimum        -> 1296 x 799 / coherent
initial UIA focus                      -> TranslateIT / ControlType.Document
TAB 1                                  -> Set Up Later / ControlType.Button
TAB 2                                  -> Continue / ControlType.Button
keyboard button reachability          -> PASS
Python child process count            -> 0
```

Capture diagnostics:

```text
resize-startup   sampled RGB=36 / 41,049 bytes
resize-medium    sampled RGB=49 / 38,869 bytes
resize-minimum   sampled RGB=34 / 37,179 bytes
focus initial    sampled RGB=36 / 41,049 bytes
focus TAB 1      sampled RGB=36 / 42,134 bytes
focus TAB 2      sampled RGB=37 / 42,008 bytes
```

Artifact:

```text
translateit-native-resize-focus-proof
artifact id: 9116153136
```

The PNGs were downloaded and visually inspected. At the near-minimum native window size, the First Setup panel, heading, direction cards, separator, and both footer actions remain visible without overlap or clipping. `focus-tab-1.png` shows a clear focus outline on `Set Up Later`; `focus-tab-2.png` shows the focus outline moving to `Continue`. This establishes meaningful native keyboard/focus presentation at Step 1 rather than relying on UI Automation names alone.

## FirstSetup Svelte Warning Cleanup

The four reproducible `state_referenced_locally` warnings came from values that were intentionally one-time setup snapshots but were written in a form Svelte treated as potentially accidental initial-value capture.

The bounded correction in `src/pages/FirstSetup.svelte` keeps the same values and lifecycle semantics while making the one-time snapshot intent explicit. It does **not** add `$effect`, `$derived`, a second store, prop synchronization, or new runtime ownership. Existing explicit runtime refresh/save actions remain the only later updates to those local setup values.

Remote proof run `31530370950` passed:

```text
official @sveltejs/mcp svelte-autofixer
  issues                              -> []
  suggestions                         -> []
  require_another_tool_call_after_fixing -> false
svelte-check                           -> 0 errors / 0 warnings
Vite production build                  -> PASS
native Tauri release build             -> PASS
fresh native First Setup               -> 1616 x 979 / coherent
native capture sampled RGB             -> 36
native capture bytes                   -> 41,049
Python child process count             -> 0
```

Artifact:

```text
translateit-firstsetup-warning-proof
artifact id: 9116984528
file: TranslateIT-FirstSetup-Warning-Clean.png
```

The PNG was downloaded and visually inspected. The approved First Setup composition remains unchanged at the startup presentation boundary: progress header, setup explanation, both translation-direction cards, `Set Up Later`, and `Continue` remain coherent. This closes the four frontend Svelte warnings without expanding product/runtime scope.

The native release build still emits existing Rust warnings, mainly dead/internal paths plus one unused incoming-recovery binding. Do not mass-delete those paths merely to silence warnings before runtime evidence establishes which code is genuinely obsolete.

Temporary proof workflows are removed after evidence is recorded; no permanent CI owner is introduced by these proof slices.

## Canonical Frontend Dependency Lockfile Baseline

`EngineData/Frontend/RustApp/package-lock.json` is now the canonical npm lockfile for the current frontend dependency graph. It adds no second package manager or frontend toolchain; its root runtime and development dependency keys match the existing `package.json` owners exactly.

Candidate generation/review run `31561918268` used Windows Server 2025 with Node 22.16.0 / npm 10.9.2 and established:

```text
lockfileVersion                         -> 3
locked package entries                  -> 163
root runtime dependency keys            -> exact package.json match
root development dependency keys        -> exact package.json match
clean npm ci                            -> PASS
svelte-check                            -> 0 errors / 0 warnings
Vite production build                   -> PASS
```

The reviewed candidate was adopted in commit `a771ad8ef3c74112b8c838958f528f2e3d5c6b73`. A separate strict repository-checkout proof then deliberately refused to generate a replacement lockfile and required the committed file to exist. Remote run `31562191693` passed:

```text
canonical repository package-lock.json -> present
lockfile root contract                  -> PASS
clean npm ci from committed lockfile    -> PASS
svelte-check                            -> 0 errors / 0 warnings
Vite production build                   -> PASS
```

This closes frontend dependency determinism at the current dependency graph. Future dependency changes must update `package.json` and the canonical lockfile together rather than relying on floating proof-run installs.

## Remote Text Clipboard Interaction Baseline

The current `src/pages/Text.svelte` Copy path writes the visible translated result through `navigator.clipboard.writeText`, promotes the control to `Copied` only after the write resolves, and reports `Couldn't copy the translation. Try again.` when clipboard writing fails.

Remote accepted proof run `31567031148` used GitHub-hosted Windows Server 2022 with Node 22.16.0 / npm 10.9.2. The production dependency/type/build baseline remained clean, and the targeted browser proof mounted the current `Text.svelte` component rather than a rewritten copy. The translation response was simulated only at the existing Tauri `translate_text` command boundary so this slice did not start Python/model/audio work.

```text
canonical npm ci                         -> PASS
svelte-check                             -> 0 errors / 0 warnings
Vite production build                    -> PASS
Text translated result                   -> current product state reached
Tauri proof commands                     -> translate_text only
real navigator.clipboard.writeText       -> PASS
clipboard read-back equals target text   -> PASS
Copy button                              -> Copied after successful write
product notice                           -> Translation copied.
injected writeText rejection             -> handled
button after rejected write              -> Copy
failure notice                           -> Couldn't copy the translation. Try again.
clipboard after rejected write           -> previous successful value preserved
```

Two earlier workflow attempts are retained only as harness evidence: one had proof dependency resolution wrong and one let the temporary Vite child process end between Actions steps. Neither reached a contradictory product result; the accepted run kept the proof server and browser interaction in the same step and passed the current Copy behavior.

This closes the current remote frontend clipboard interaction baseline. It does not claim native Tauri/WebView clipboard acceptance, real model translation, or user-local-PC behavior.

## Remote Real Runtime-State Projection Boundary

The accepted remote proof establishes the last normal product-state projection that can be exercised without crossing the currently deferred Python/model/audio/device boundary.

Fresh isolated Windows settings resolve through the real Rust settings owner to schema-v6 defaults with `meeting_setup_state = new`. On this state, `App.svelte` loads settings and remains on First Setup instead of entering `loadProductRuntimeSnapshot()`.

Accepted GitHub-hosted Windows Server 2022 run `31568531685` passed:

```text
canonical npm ci                      -> PASS
svelte-check                          -> 0 errors / 0 warnings
native Tauri release build            -> PASS
native title                          -> TranslateIT
native window handle                  -> non-zero (196874)
native process Responding             -> true
UI Automation actions                 -> Set Up Later | Continue
Python descendant process count       -> 0
REAL_RUNTIME_STATE                    -> fresh_settings_new
NATIVE_PROJECTION                     -> first_setup
UNSAFE_CAPABILITY_ACTIONS             -> not_activated
```

The first attempt `31568092998` is retained only as harness timing evidence: the native window was already alive/responding, but UI Automation was sampled before WebView descendants were exposed. The accepted rerun waited for the WebView projection and passed without changing product source.

This proof does **not** extend to normal post-setup Ready/Blocked/Unavailable projection. Once `meeting_setup_state` is no longer `new`, `App.svelte` calls `loadProductRuntimeSnapshot()`, which requests Meeting status and input status. Meeting status builds preflight using input-device inspection, model inventory, helper status, and virtual-microphone route status; the input and route paths enumerate real Windows audio devices. Under the current proof restriction, that is the explicit stop boundary rather than a reason to substitute simulated state.

## Backend Audit Gate Before P2.3

A deep static audit of the active Rust/Tauri backend, audio ownership, helper bridge/scheduler, virtual route, settings/path owners, and Python WorkerRuntime found a good core architecture but also concrete correctness and slop debt. No product source was changed during the audit.

Strong existing foundations that should be preserved:

```text
one canonical application Meeting/session authority
one persistent AI worker
Meeting generation/output-authority gating
bounded finalized utterance queue
bounded rolling audio buffer
finalized-speech-only outbound promotion
translation input no-silent-truncation + EOS completion checks
bounded/redacted normal Rust JSONL logging
packaged/runtime path ownership separated from writable user data
CPAL 0.15.3 WASAPI render-endpoint input stream is a valid loopback mechanism
```

### Hardening findings that gate P2.3

1. **Runtime-state lock failure can fail open.** Lock poisoning may be projected as no active session, and some store/clear paths can report a state that was not actually persisted/cleared. This is unsafe for close/settings/audio ownership.
2. **Mic Test has a check-then-claim ownership race.** It checks for no session and later records its capture session non-atomically, so concurrent Meeting Start can be overwritten.
3. **Stop truth can diverge from resource cleanup.** Meeting Stop reports success after revoking/clearing authority even when capture/helper/thread cleanup can fail; Mic Test similarly clears session state even if capture Stop fails.
4. **Worker deadlines are not task-aware.** One 30-second outer deadline covers ping/status/preload/inference/TTS while worker probes and SAPI/model work can legitimately consume most or all of that budget, creating false transport failure and worker kills.
5. **Helper scheduler admission is unbounded.** Waiting callers have priority ordering but no queue/admission bound or wait deadline, so load can accumulate blocked callers and starve lower-priority work.
6. **Helper stderr bypasses the bounded/redacted logger.** It appends raw stderr with no rotation/size/privacy bound and uses a detached logger thread.
7. **Python dependency materialization is not deterministic yet.** WorkerRuntime has version ranges but no committed `uv.lock`; P2.3 would therefore prove one resolved environment rather than a reproducible canonical environment.
8. **Required-asset/readiness ownership is duplicated.** Rust manifest inventory and Python worker hardcoded policy already disagree on ASR fallback and product-vs-Meeting requirements. Meeting-required readiness and full-product release readiness need explicit separation.

### Important issues before Windows audio/device acceptance

- Meeting status polling is too expensive: the 1.2-second poll rebuilds preflight, enumerates native audio endpoints, and virtual-route status writes evidence to disk even for ordinary status reads.
- Outbound capture status is latched at Start rather than projected from current CPAL stream health; callback errors can therefore exist while Meeting still appears capture-active.
- CPAL callbacks perform duplicate conversion/downmix/allocation and substantial VAD/evidence work on the callback path.
- audio preferences/routes use display names as IDs; duplicate/renamed/localized Windows endpoints are fragile.
- Rust route selection uses CPAL names while the Python playback provider resolves exact names through sounddevice/PortAudio, creating a cross-library identity mismatch risk.
- the virtual route provider creates a separate Python process for each TTS delivery; this is measurable process/latency churn even though it is not a second AI engine.
- provider WAV decoding treats any non-16-bit sample width as uint8; unsupported 24/32-bit PCM is not rejected safely.
- failed TTS subprocess execution can leave a partial temporary WAV because some exception responses omit the requested output path.
- the Windows power window procedure performs the full blocking Meeting Stop path synchronously during `WM_POWERBROADCAST`; authority revocation should remain immediate, but potentially blocking cleanup should not own the window-message callback.

### Confirmed AI-slop / overdevelopment cleanup debt

```text
compiler-dead helper command wrappers and request types
compiler-dead virtual-route stub/evidence path
compiler-dead live-target-segment / older VAD decision system
stale RuntimeStage / EngineStatus / TranslationAdapterPending shell-era state
always-true generation/source-connected preflight booleans
large runtime_claim/source-proof strings carried through live runtime structs
stale Realtime/Quality compatibility aliases in Python/Rust worker status
stale voice_actor_marcel compatibility fields
hidden virtual_mic_route_preference.json compatibility owner with no current UI setter
migrated_python_helper_map.json historical migration artifact in active WorkerRuntime
compatibility/nonexistent ProjectPaths fields such as backend RuntimeContracts root
```

Do not mass-delete all dead code in one cleanup. Fix correctness/ownership first, prove the active path, then remove only code proven obsolete by the current registry/callers.

### Hardening order before P2.3

```text
Wave A1  runtime session state must fail closed + atomic owner claim
Wave A2  Stop/Mic Test cleanup truth must match actual resource release
Wave A3  task-aware helper deadlines + bounded status probing
Wave A4  bounded scheduler admission/wait
Wave A5  bounded/redacted helper stderr lifecycle
Wave A6  canonical worker readiness fields; remove Realtime/Quality compatibility from active bridge
Wave A7  commit/review canonical Python uv.lock and reconcile Meeting-required vs product-release asset semantics
```

After Wave A passes remote Rust/frontend/build proof, resume P2.3 Python/model execution. Audio callback/polling/route cleanup remains the next hardening boundary before real Windows audio/device acceptance.

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

The backend audit now provides concrete source evidence for bounded P1.2/P1.3/P1.4 hardening. Address only the audit-gated Wave A findings before P2.3; do not expand into generic cleanup.

### P2 — Release-blocking proof/materialization

#### P2.1 Frontend — REMOTE-SAFE PROOF BOUNDARY CLOSED

Obtained:

```text
dependency materialization in proof runners
source validator
official Svelte autofixer on First Setup
svelte-check -> 0 errors / 0 warnings
Vite production build
actual Meeting / Text / Settings browser render
basic Text translated-state interaction
approved clean visual baseline
native First Setup Tauri/WebView pixel render
native startup / medium / near-minimum resize render
native Step 1 keyboard focus reachability
visible native focus indicators on both Step 1 actions
clean First Setup native re-render after warning correction
canonical package-lock.json for current frontend dependency graph
strict clean npm ci from committed lockfile
remote Text Copy browser Clipboard API success + truthful failure feedback
real fresh Rust settings/default state -> native First Setup projection
```

Remaining runtime-state acceptance is not remote-safe under the current scope:

```text
post-setup normal product-state projection with real device/model evidence
```

The fresh/default Rust state projection is proven. Post-setup projection remains coupled to the deferred native device/model acceptance boundary and must not be replaced by simulated proof.

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
native resize / focus presentation smoke
no Python child process during fresh First Setup proofs
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
-> remote resize/focus proof PASS
-> FirstSetup Svelte warning cleanup PASS
-> canonical frontend dependency lockfile PASS
-> remote clipboard proof PASS
-> real fresh Rust state -> native First Setup projection PASS
-> remote-safe runtime-state boundary reached
-> backend static audit gate completed
-> Backend Hardening Wave A
-> P2.3 remote Python/model proof
-> later explicit approval for Windows audio/device proof
-> fix measured failures
-> finish only still-relevant P1
-> packaging + clean-machine acceptance
```

## Backend Hardening Wave A1 — CLOSED

Runtime/session authority is now fail-closed at the canonical Rust owner. `runtime_state.rs` uses one atomic claim primitive for Meeting and Mic Test; a competing claim returns the existing owner without overwriting it. Session-store lock failure is represented as potentially active/unverifiable (`has_active_session=true`, no snapshot, `runtime_session:state_lock_failed`) instead of being collapsed into idle/empty state. Clear/revoke also invalidate generation authority before returning an unverifiable state when storage cannot be confirmed.

Direct callers were reconciled only where the old snapshot-only interpretation could fail open: Mic Test Start/Stop, guarded helper/Meeting Start, Meeting Start/Stop authority checks, active-session audio-device Settings guard, and native exit verification. Stop cleanup-result truth itself remains Wave A2 and was not changed here.

Remote Windows proof for this slice passed:

```text
targeted runtime_state unit tests -> PASS
cargo check                       -> PASS
canonical npm ci                  -> PASS
Tauri release build --no-bundle   -> PASS
```

No Python/model execution, audio-route execution, user-local-PC testing, scheduler change, or dead-code cleanup occurred in Wave A1.

## Backend Hardening Wave A2 — CLOSED

Meeting Stop and Mic Test Stop now preserve the authority-first rule while making cleanup truth explicit. A Stop result is successful only after required capture/helper/consumer cleanup reports success and the canonical runtime-session owner confirms the **same generation** was cleared. If cleanup fails, output generation authority remains revoked but the owner is retained as `cleanup_incomplete`; new Start/device rebind remains blocked and Stop can be retried. A stale cleanup generation cannot clear a newer runtime owner, and Meeting Stop explicitly refuses to revoke Mic Test/non-Meeting ownership. Meeting outbound/incoming presentation is also moved out of Live/listening state while cleanup is incomplete.

Mic Test uses the same rule: its authority is revoked before capture cleanup, failed capture cleanup retains the Mic Test owner instead of claiming release, and the Settings/App caller keeps Stop Mic Test reachable for retry. An idempotent Mic Test Stop with no owned session no longer performs a global session clear. The product Meeting mapping presents retained application cleanup as `Stop Needed` rather than a healthy or generic active state.

Remote Windows proof for this slice passed:

```text
official Svelte autofixer (App + Settings) -> PASS
svelte-check                             -> PASS: 0 errors / 0 warnings
Vite production build                    -> PASS
runtime_state targeted tests             -> PASS
Meeting cleanup-truth targeted test       -> PASS
cargo check                               -> PASS
Tauri release build --no-bundle           -> PASS
```

No Python/model execution, physical audio-device proof, scheduler/deadline change, route redesign, or dead-code cleanup occurred in Wave A2. Real device/resource release still requires the later Windows audio acceptance wave; A2 closes the source/result ownership rule and deterministic cleanup-decision logic.

## Backend Hardening Wave A3 — CLOSED

The helper bridge no longer uses one 30-second response deadline for every worker command. The canonical Rust bridge selects a bounded task-cost class and **overwrites request deadline metadata from the host authority** before waiting with the same ceiling: ping/control 5s, status/TTS preflight 30s, model preload 120s, inference 90s, and synthesis 45s. Caller payload cannot extend or shorten that host-selected deadline. Unknown commands fail back to the bounded status ceiling rather than receiving an unbounded wait.

The Python worker now consumes the host deadline as a real request budget. Already-expired requests are rejected before handler execution. Nested `nvidia-smi`, Windows SAPI capability probing, Piper synthesis, and SAPI synthesis use a timeout capped by the request's remaining budget. GPU probe is capped at 3s and SAPI capability probe at 8s, so ordinary status cannot spend its whole host envelope inside nested subprocesses. A SAPI probe timeout is treated as transient and is not cached process-wide. Model loading/inference still remains under the outer task deadline; no watchdog/thread framework or second worker was added.

Remote Windows/source proof for this slice passed:

```text
Rust task-deadline policy tests       -> PASS
Python worker contract/deadline tests -> PASS
Python compileall                     -> PASS
cargo check                           -> PASS
Tauri release build --no-bundle       -> PASS
```

No real model inference, scheduler admission change, stderr/logging change, readiness compatibility cleanup, Python dependency locking, audio-device execution, or user-local-PC testing occurred in Wave A3.

## Backend Hardening Wave A4 — CLOSED

The existing single-worker scheduler now has bounded admission and bounded waiting instead of allowing callers to accumulate indefinitely. Total scheduler occupancy is capped at 8 active/waiting requests, with reserved headroom so lower-priority diagnostics/Text/incoming work cannot consume the last admission slots needed by higher-priority work. Execution order remains `Meeting outbound > Meeting incoming > Text > diagnostics`.

Scheduler wait is also priority-bounded: Meeting outbound 120s, optional Meeting incoming 30s, Text 15s, and diagnostics 5s. A request rejected at its admission limit returns `helper_scheduler:admission_capacity_exceeded:*`; a caller that cannot obtain the worker before its wait ceiling returns `helper_scheduler:wait_deadline_exceeded:*`. Timeout cleanup removes that caller from the relevant waiting counter and wakes the scheduler so a departed higher-priority waiter cannot continue blocking lower-priority work. No second worker, retry loop, watchdog, or parallel scheduler owner was added.

Remote Windows/source proof for this slice passed:

```text
Rust scheduler policy/admission/wait tests -> PASS
cargo check                                -> PASS
canonical npm ci                           -> PASS
Tauri release build --no-bundle            -> PASS
```

No helper stderr lifecycle change, readiness compatibility cleanup, Python dependency locking/assets work, model execution, audio-route execution, or user-local-PC testing occurred in Wave A4.

## Backend Hardening Wave A5 — CLOSED

Helper worker stderr now uses the existing bounded/redacted Rust JSONL logging policy instead of a raw append-only side channel. All helper stderr lines pass through `RuntimeLogEvent` compaction/redaction, and the helper uses one canonical `helper_bridge_stderr.jsonl` file with the existing 1 MB rotation policy plus one `.previous.jsonl` file rather than creating an unbounded new raw log for every worker generation.

The stderr reader is also owned by the helper runtime lifecycle. Its `JoinHandle` is stored with the canonical helper runtime, `stop_child` joins it after the owned worker is terminated, startup-handshake failures release it, and natural child-exit status reconciliation uses the same stop owner. No second logger owner, background log service, process-tree framework, or new logging dependency was added.

Remote Windows/source proof for this slice passed:

```text
Rust helper stderr redaction/rotation tests -> PASS
Rust stderr logger lifecycle ownership test -> PASS
cargo check                               -> PASS
canonical npm ci                          -> PASS
Tauri release build --no-bundle           -> PASS
```

No readiness compatibility cleanup, Python dependency locking/assets work, model execution, scheduler redesign, audio-route execution, or user-local-PC testing occurred in Wave A5.

## Backend Hardening Wave A6 — CLOSED

The active Rust/Python worker contract now uses one direction-based translation readiness vocabulary. Python status emits canonical `readiness.translation_id_en`, `readiness.translation_en_id`, and `readiness.translation_bidirectional` fields; stale `translation_realtime` / `translation_quality` readiness and model aliases plus the ambiguous top-level `translation_model_ready` / `quality_translation_model_ready` compatibility fields are removed. The Rust helper now derives required outbound provider readiness from `translation_id_en` directly.

Translation preload and inference responses also no longer echo `Realtime`, `Quality`, or `Canonical` mode labels. Current Text and Meeting callers already select translation by explicit source/target language pair, so no active caller requires mode-based routing or response compatibility. Extra unknown request fields remain harmless JSON input, but they no longer become product/runtime contract.

Remote Windows/source proof for this slice passed:

```text
Python worker canonical readiness/translation tests -> PASS
Python compileall                                  -> PASS
Rust canonical readiness contract tests            -> PASS
cargo check                                        -> PASS
canonical npm ci                                   -> PASS
Tauri release build --no-bundle                    -> PASS
```

No Python dependency locking/assets work, real model execution, stderr/scheduler redesign, audio-route execution, or user-local-PC testing occurred in Wave A6.

## Backend Hardening Wave A7 — CLOSED

WorkerRuntime dependency resolution is now canonical and reviewable: `pyproject.toml` remains the dependency-intent owner, a real resolver-generated `uv.lock` is committed as the resolved graph, and developer setup consumes it with `uv sync --frozen --no-dev` instead of silently resolving version ranges. The lock was generated on the Windows proof runner, checked with `uv lock --check`, and structurally verified to contain every current direct WorkerRuntime runtime dependency. This is dependency-resolution proof, not proof that every heavy AI package/model has executed successfully.

Asset/readiness ownership is also separated. `model_manifest.json` schema v2 and `runtime_inventory.rs` now describe **full-product-release asset presence only**. Full release inventory requires the primary ASR asset, ID→EN translation, EN→ID translation, and packaged Piper assets; the medium ASR fallback remains optional release inventory. Meeting Start no longer consumes `model_inventory.ok`. Current Meeting-required AI capability is owned by the live helper/worker provider status, so a worker-validated ASR fallback or Windows SAPI TTS path may satisfy Meeting runtime capability without falsely marking the full release asset inventory complete. Runtime recovery likewise no longer treats release-inventory blockers as Meeting setup blockers.

Remote Windows/source proof for this slice passed:

```text
uv lock generation + uv lock --check             -> PASS
canonical lock direct-dependency verification     -> PASS
release-vs-Meeting ownership verification         -> PASS
Python worker contract tests                      -> PASS
Rust A7 release/Meeting ownership tests           -> PASS
cargo check                                       -> PASS
canonical npm ci + frontend build                 -> PASS
Tauri release build --no-bundle                   -> PASS
```

No real ASR/translation/TTS model inference, CUDA-vs-CPU execution acceptance, audio-route/device execution, installer staging, scheduler/stderr redesign, or user-local-PC testing occurred in Wave A7.

## Current Mode

**Backend Hardening Wave A — SOURCE/REMOTE PROOF CLOSED (A1-A7).** Resume release-blocking executable proof without reopening closed hardening slices unless new evidence requires it.

## Next Step — P2.3: Real Python / Model Execution Proof

Execute the canonical locked WorkerRuntime against real installed assets and collect truthful evidence for ASR, ID→EN translation, EN→ID translation, English TTS, CUDA-preferred behavior, and explicit CPU fallback. Keep P2.3 focused on real AI runtime execution; do not mix the deferred Windows audio-route/device acceptance cleanup or broad P3 dead-code cleanup into the model proof.

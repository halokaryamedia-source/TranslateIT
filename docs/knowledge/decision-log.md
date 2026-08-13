# TranslateIT — Decision Log

This file keeps durable reasoning required to continue the current product. Superseded implementation detail remains in Git history rather than being repeated as active policy.

## D-001 — `New` Is Development Authority

**Decision**  
Branch `New` owns current development. `V1-Advance`, older branches, `DevelopingData`, and old reports are recovery evidence only.

**Reason**  
Historical implementation must not silently override current product/source owners.

## D-002 — One Desktop Product And One Local Worker

**Decision**  
Keep one Rust/Tauri desktop application and one Python worker path for ASR, translation, and TTS. Do not create a second launcher, translator engine, model-selection service, readiness service, or compatibility runtime.

**Reason**  
Parallel implementations add failure paths without improving the core translator.

## D-003 — Reliable Translation Core Supersedes Feature Breadth

**Decision**  
Initial product scope is Meeting / Text / Settings with required ID -> EN Meeting voice, optional EN -> ID incoming text, and explicit bidirectional Text translation.

Not initial core: Pause/Resume, PTT, Stop Voice, partial translated subtitles, Realtime/Quality user modes, tone/context controls, History/Saved, Audio Studio/custom voice, Documents, additional languages, incoming TTS, or automatic mid-session device rebind.

**Reason**  
Feature breadth had moved ahead of proven translation quality and created stale parallel paths.

## D-004 — Meeting Has One Application-Level Authority

**Decision**  
`commands/meeting_session.rs` + `engine/runtime_state.rs` own:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Navigation does not recreate/stop Meeting. Stop revokes output authority before cleanup. Safe application close delegates to the same Stop path. The committed-turn store is transient Live UI state, not History persistence or model context.

Optional incoming EN -> ID is a subordinate lane inside the same Meeting session and may degrade/disable without blocking healthy outbound.

**Reason**  
One authority prevents duplicate output, stale async promotion, and lifecycle races.

## D-005 — Direction-Based Local Translation

**Decision**  
Normal translation selects by language direction:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

Current utterance/text is model input. Do not silently truncate source text or promote known incomplete generation. Users do not select models.

**Reason**  
Direction is the approved product contract; mode/context layers added complexity without distinct approved behavior.

## D-006 — Controlled Windows Setup Uses Local Sidecar Payloads, Without Hash Framework

**Decision**  
Initial controlled distribution may deliver large local runtime/model payloads beside one user-run Setup for deterministic local placement.

Do not require a SHA-256/checksum/revision identity framework, artifact registry, first-run downloader, in-app package manager, manual Python/model setup, cloud fallback, or NLLB fallback for the initial release.

**Reason**  
Hash/revision metadata does not prove load, inference, translation quality, or audio delivery. Approved prepared payload + deterministic placement + real execution is the useful initial acceptance boundary.

## D-007 — Runtime Resources And Writable User Data Have Separate Owners

**Decision**  
`engine/paths.rs` owns path semantics. Packaged runtime resources come from the Tauri resource root; writable cache/log/user state comes from app-local data. Repository probing is development-only.

**Reason**  
Installed builds cannot safely treat repository-relative resources as writable application state.

## D-008 — Validation Must Be Proportional To The Current Product

**Decision**  
Keep a small source/preflight set plus real compile/type/runtime/device/package proof when the claim requires it. Do not maintain dead feature matrices, report generators, or source-marker test museums.

**Reason**  
Proof quality comes from evidence matched to the exact claim, not validator count.

## D-009 — One Active Frontend Entry And Bounded Diagnostics

**Decision**  
`src/main.ts` is the only normal frontend module entry. Normal readiness requests only current product facts; heavy technical checks stay behind setup/Diagnostics actions.

**Reason**  
Parallel entrypoints and broad repeated polling waste resources and keep retired architecture alive.

## D-010 — Installed Worker Uses One Private Embedded Python Runtime

**Decision**  
The installed Windows build keeps the existing Python scripts and runs them with one application-local embedded CPython runtime:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
└─ PythonRuntime/
   └─ python.exe
```

Persistent worker and Meeting Microphone provider use that same interpreter. Env overrides, worker `.venv`, system `python`/`python3`, Windows `py`, and the old route Python override are development conveniences only.

Do not freeze the initial worker with PyInstaller/Nuitka, copy a `.venv`, or install pip/uv/packages on the user's machine. Models stay under `RuntimeAssets`.

**Reason**  
A private interpreter preserves the existing worker/model behavior while avoiding another freeze/launcher architecture.

## D-011 — Frontend Uses A Small Svelte 5 Architecture

**Decision**  
TranslateIT frontend source is migrated from manual DOM/template-string ownership to a plain Svelte 5 SPA inside Tauri 2.

Approved stack:

```text
Tauri 2
+ Svelte 5
+ Vite
+ TypeScript
+ Tailwind CSS 4
+ CSS custom-property design tokens
+ selective Bits UI
+ Lucide Svelte
```

Application structure/state/bridge migration is owned by `desktop-runtime-development`; visual system/component craft is owned by `desktop-ui-design-development`. Official Svelte AI/MCP guidance is conditional technical tooling, not a new project specialist.

Default exclusions:

```text
no SvelteKit
no frontend router
no Redux-like state library
no second runtime/product truth store
no heavy UI framework
no full shadcn-svelte dump
no CSS-in-JS
no general animation framework
no permanent vanilla/Svelte dual shell
```

`runtimeApi.ts` and `runtimeProductFacade.ts` remain the default runtime boundaries. Svelte owns declarative presentation/application state only. Bits UI is used selectively when accessible interaction complexity earns it; Lucide Svelte is the normal icon family.

The old vanilla controller/template/First Setup/icon/CSS ownership is removed from the active source graph after replacement rather than retained as compatibility architecture.

**Reason**  
Meeting lifecycle states, live transcript presentation, Text, First Setup, Settings, Diagnostics, and future UI growth are easier to maintain with declarative components and bounded state than manual DOM mutation. Svelte provides that structure without requiring a web meta-framework. Tailwind + semantic tokens keeps visual iteration fast while preserving one maintainable visual owner.

**Proof status**  
The source migration is established on `New`, but dependency installation, Svelte autofix/typecheck/build, Tauri launch, and rendered visual acceptance are intentionally deferred while the user completes major frontend work. Those proofs remain required before release.

## D-012 — Live Helper Recovery Is Transport-Only And Stage-Bounded

**Decision**  
During an authoritative Live Meeting, automatic helper recovery is limited to proven helper transport/lifecycle failures represented by the existing worker bridge `*_write_failed:*` or `*_read_failed:*` blockers.

Recovery keeps one canonical helper worker and must run under `MeetingOutbound` scheduler priority with the current Meeting generation rechecked before retry. The current safe retry boundary is:

```text
transcribe -> retry at most once
translate  -> retry at most once
synthesize -> restart helper for later utterances, do not retry current synthesis
```

Normal ASR/content/model/translation/TTS failure, incoming work, Text work, explicit helper cancellation, Meeting Stop cancellation, and stale generations do not enter this automatic recovery path. A failed retry does not create another retry/restart loop.

**Reason**  
ASR and translation can be re-executed before any Meeting playback side effect. Synthesis may have uncertain child-process or temporary-file state after a transport break, so replaying that current stage adds avoidable side-effect ambiguity. This boundary allows the Live Meeting to self-heal from a transient worker transport failure without introducing a second worker, generic retry framework, or duplicate spoken output risk.

**Proof status**  
The source ownership and one-retry/no-synthesis-retry contract are established on `New`. Forced helper write/read/deadline failures and recovery behavior still require deferred local/runtime proof.

## D-013 — Optional Incoming Yields Freshness And Cannot Strand The Shared Helper

**Decision**  
Optional incoming Meeting Sound is freshness assistance, not work that must survive required-outbound contention. An explicit `helper_scheduler:incoming_deferred_for_outbound` result is therefore a healthy stale-event drop: the old incoming event is discarded and the lane returns to fresh listening without a degraded/error claim.

If an executing incoming helper request instead suffers a proven helper transport failure (`*_write_failed:*` or `*_read_failed:*`), the failed incoming request is **not retried**. While that `MeetingIncoming` scheduler request still owns its permit, TranslateIT may restart the same canonical helper worker so a waiting required outbound request cannot inherit a deliberately stopped shared worker. Internal Live recovery must preserve any current outbound pipeline claim; the public/manual helper-start path keeps its existing full reset semantics.

A failed incoming recovery remains a real degraded runtime condition. Normal incoming ASR/translation/model/content failures also remain ordinary incoming failures and do not gain a retry loop.

**Reason**  
Required outbound must not be damaged by an optional lane, but replaying old incoming comprehension after contention would also violate incoming freshness. Restoring shared infrastructure before incoming scheduler ownership is released addresses the worker-stranding race without a second worker, an incoming retry queue, or stale subtitle replay.

**Proof status**  
The source contract is established on `New`: exact deferral is distinguished from failure, incoming transport recovery is same-worker and no-retry, and Live internal helper restart preserves outbound pipeline ownership. Forced incoming write/read failure with outbound waiting still requires deferred local/runtime proof.

## D-014 — Active Runtime Sessions Freeze Audio Mutation And Public Helper Restart

**Decision**  
An active runtime session owns its currently opened resources until the canonical Stop path releases that session. During that window:

```text
microphone / Meeting Sound preference change -> reject and preserve current settings
public/manual helper restart               -> defer until session Stop
Settings Check Setup                       -> unavailable until session Stop
```

The public Tauri `start_helper_bridge` command is routed through a runtime-session guard. Internal Meeting recovery remains on the existing direct helper lifecycle path so bounded recovery can still restore the same worker while Meeting owns authority. Standalone Text may share a healthy helper during Meeting, but if the helper is stopped it uses the guarded public start path and does not restart the worker underneath an active Meeting/Mic Test.

Settings keeps non-mutating status/device discovery available, but disables microphone/Meeting Sound mutation, Mic Test start, and setup repair while a runtime session exists. No pending next-session setting store or mid-session device rebind is introduced; the user changes settings after Stop.

**Reason**  
Persisting a new device while capture still owns the previous endpoint makes product settings disagree with the live session. Restarting the shared helper from setup/Text can also invalidate work owned by Meeting. Freezing these mutations until canonical Stop is smaller and safer than hot-rebinding devices or creating another helper lifecycle owner.

**Proof status**  
The source guard and Settings interaction boundary are established on `New`. Rust/Tauri compile, rendered disabled-state behavior, and live Start -> navigate Settings -> attempted mutation/recovery -> Stop -> mutation-allowed behavior still require deferred local/runtime proof.

## D-015 — Meeting Route Readiness Requires One Matched Pair And Stable Session Identity

**Decision**  
Meeting route readiness is a **pair contract**, not two independent device-discovery successes. TranslateIT may call the route ready only when the Windows playback endpoint used for translated TTS and the Windows recording endpoint selected by the meeting application form the same recognized virtual-cable pair.

Current source uses conservative directional pair identity: the playback-side virtual endpoint must identify as the pair's `Input`, the recording-side endpoint as its `Output`, and both must reduce to the same normalized provider/pair identity. A persisted explicit output+input preference must satisfy the same match. Without an explicit preference, one canonical base VB-CABLE pair is preferred when uniquely present; otherwise exactly one matched pair may be selected. Missing or ambiguous matched pairs remain blocked instead of combining unrelated virtual-looking endpoints.

Before a new Meeting Start, the current matched pair is prepared and provider-checked. Once application Meeting authority exists, that exact pair is bound to the Meeting generation. During the active session, disappearance or mismatch of either endpoint makes the route unavailable; TranslateIT does **not** silently discover and switch to another virtual route.

`TranslateIT Meeting Microphone` remains the product-level concept required by the foundation. It is not an invented Windows device name. Normal Meeting, Settings, and First Setup surfaces show the actual selected Windows recording/input endpoint that the user must choose in Zoom, Meet, Teams, or another standard meeting application.

This decision does not make VB-Audio, Voicemeeter, or any provider name permanent product identity. It also does not add a custom driver, audio daemon, second route owner, or mid-session rebind mechanism. Release packaging may later provide a different functionally equivalent endpoint if target-Windows proof supports it, while preserving the same pair/readiness/session-stability contract.

**Reason**  
Independent keyword discovery could report `Ready` for unrelated virtual endpoints and the old UI could claim a custom Windows microphone identity that the product did not actually install. Binding one verified pair to one Meeting generation makes route truth and user instructions agree without expanding the audio architecture.

**Proof status**  
The matched-pair selection, generation-bound source contract, provider handoff, and truthful endpoint presentation are established on `New`. Actual Windows endpoint names, real cable pairing, meeting-application reception, endpoint-removal behavior, and multi-cable ambiguity still require deferred target-Windows proof.

## D-016 — Meeting Route Provider Preflight Has A Pre-Authority Safety Ceiling

**Decision**  
Meeting route provider preflight must never hold Start indefinitely before application Meeting authority exists. The current Rust audio-route owner therefore spawns the existing provider preflight process, polls its lifecycle, and enforces a 30-second pre-authority safety ceiling. If the provider has not exited by that ceiling, Rust terminates and waits for the child before returning `virtual_audio_route:provider_preflight_deadline_exceeded`.

The 30-second value is a hang-containment ceiling, not a product latency target or a playback SLA. It intentionally matches the existing local-worker response safety envelope so cold Python startup/import/device enumeration has substantial room while an actual hang remains bounded. Successful preflight still records its measured elapsed time; that measured value continues to ground the separate duration-based per-utterance playback deadline.

The preflight continues to consume the matched route pair prepared by D-015 and still runs before Meeting authority. No persistent route daemon, generic timeout framework, alternate provider path, or reuse of the playback-duration formula is introduced.

**Reason**  
A synchronous unbounded provider wait could leave Start stuck forever on dependency import or Windows device enumeration even though no Meeting authority had been committed. Bounding the child lifecycle preserves transactional Start semantics without changing the delivery architecture.

**Proof status**  
The spawn/poll/kill/wait source contract and explicit timeout blocker are established on `New`. Forced provider-preflight hang, actual child termination, resource cleanup, and acceptable cold-start timing still require deferred local/target-Windows proof.

## D-017 — Windows Power Transitions Converge Through Canonical Meeting Stop

**Decision**  
Windows sleep/hibernate lifecycle is attached to the existing Tauri main-window owner, not to a second Meeting or audio lifecycle. The Windows main window receives native power-management messages and handles suspend plus the first automatic/critical resume boundary by checking whether the application Meeting still owns a runtime session. If it does, TranslateIT calls the existing `stop_meeting_translation()` path.

The canonical Stop path remains authority-first: it revokes the active Meeting generation before provider/helper/consumer/capture cleanup. A resume-side call is cleanup convergence only for a session that somehow remains after the low-power transition; it never starts, resumes, or replays a Meeting. A normal suspend/resume with no application Meeting is a no-op.

The hook is installed during main-window bootstrap and failure to install it on Windows fails bootstrap rather than silently launching without the required lifecycle safety boundary. The implementation uses the native window message ABI directly and adds no second dependency/runtime owner, Pause/Resume feature, automatic wake restart, or sleep-specific audio cleanup stack.

**Reason**  
Sleep/hibernate can interrupt capture, provider, helper, and device ownership while old output work is still in flight. Reusing canonical Stop preserves the same generation invalidation and cleanup ordering already used by user Stop and safe close, while a resume convergence check prevents stale authority from surviving a power transition.

**Proof status**  
The source wiring from Windows power notification to canonical Stop is established on `New`. Rust/Tauri compile, real Windows sleep/hibernate notification delivery, authority invalidation timing, interrupted-cleanup convergence, device/resource release, and no-auto-resume behavior still require deferred target-Windows proof.

## D-018 — Clean Desktop Utility Is The Approved Visual Baseline

**Decision**
The user approved the current rendered Meeting / Text / Settings redesign as the ongoing TranslateIT visual baseline. Future visual work uses the existing `desktop-ui-design-development` owner and normally operates in ALIGN mode unless an explicit new product decision replaces this direction.

Preserve the following visual rules:

```text
compact dark desktop utility
clear task/state hierarchy before decoration
narrow lightweight sidebar
few nested cards / borders / shadows
calm healthy / Ready states
stronger state color only when attention or action is required
one obvious primary action per normal workflow
useful task content receives the largest share of space
no generic AI gradients, glow, glassmorphism, or decorative dashboard grids
```

Visual work must not redefine Meeting lifecycle, readiness truth, translation behavior, settings ownership, or runtime/audio/model semantics. Material visual acceptance requires rendered evidence rather than source intent alone.

**Reason**
The first real Svelte render proved the product structure but also exposed excessive empty space, visual weight, nested panels, and weak action hierarchy. The approved redesign corrected those issues without changing product behavior. Recording the accepted direction prevents later work from drifting back toward generic dashboard or AI-styled decoration and gives the project UI specialist a stable alignment target.

**Proof status**
The approved Meeting / Text / Settings baseline has Svelte typecheck, Vite production build, and actual browser-render evidence from the current source graph. The render harness used simulated Tauri Ready/device data, so native Tauri/WebView, real runtime state, and Windows device behavior remain separate proof boundaries.

## D-019 — One Windows CUDA Matrix And Capability-Only CPU Fallback

**Decision**
The current Windows WorkerRuntime development/runtime baseline is CPython 3.12.10 with PyTorch 2.13.0 from the official CUDA 12.6 wheel index and CTranslate2 4.8.1. The WorkerRuntime keeps one locked environment; CPU degraded execution uses that same environment rather than a second CPU dependency project or reinstall script.

CUDA is preferred but optional. CPU fallback is chosen only when the canonical PyTorch/CTranslate2 CUDA probes complete successfully and report CUDA unavailable. If a CUDA probe itself fails, or CUDA was selected and ASR/model loading or translation device transfer then fails, TranslateIT preserves that failure as a blocker instead of retrying the same operation on CPU.

**Reason**
The previous floating Python/package baseline could resolve materially different Windows stacks over time, and broad exception fallback could convert dependency/model/config/runtime failures into apparently healthy CPU degradation. One reviewed matrix plus pre-load capability selection keeps dependency truth reproducible while preserving the approved CPU fallback only for known capability absence.

**Proof status**
GitHub-hosted Windows proof may establish exact Python/package resolution, CUDA-enabled PyTorch wheel identity, CTranslate2 import/probe behavior on a no-GPU runner, deterministic CPU fallback selection, and fail-closed CUDA-load error handling. Real CUDA inference still requires a GPU-capable Windows target and is not implied by dependency/import proof.

## D-020 — VoiceLab Uses One Trained GPT-SoVITS V2ProPlus Voice Actor

**Decision**  
The user explicitly reopened custom voice as a required capability **before** target-Windows validation. This supersedes only the `Audio Studio/custom voice` deferred portion of D-003; the other feature-breadth exclusions remain in force.

The product-facing capability is renamed **VoiceLab** and has one normal purpose: create one high-fidelity English Voice Actor from the user's own authorized voice, train it once, approve it, and reuse it during daily Meeting inference without retraining.

The adopted engine direction is:

```text
GPT-SoVITS V2ProPlus
```

VoiceLab deliberately does not create provider/engine branches. The first implementation excludes OpenVoice, Qwen zero-shot cloning, Piper, Windows SAPI, MeloTTS, RVC postprocessing, cloud TTS, quick-clone mode, imported-audio mode, professional/broadcast tiers, and user-visible engine/model selection from the final custom-TTS path.

The first creation workflow is:

```text
voice ownership confirmation
-> guided English recording
-> replay / accept / retry
-> quality-controlled exact-text dataset
-> GPT-SoVITS V2ProPlus fine-tuning
-> held-out generated evaluation
-> speaker-similarity ranking when useful
-> user listening approval
-> atomic promotion to My Voice
```

Recording duration, wall-clock training duration, epoch count, and similarity score are not product-quality constants. More data/training is not automatically better; the build should preserve useful checkpoints and choose from actual unseen generated output. Final Voice Actor approval remains user-listening evidence rather than a metric-only promotion.

The initial Voice Actor runtime format remains the engine-native trained GPT/SoVITS weights plus one canonical 3-10 second English reference recording and exact text. ONNX/TorchScript/quantization/export optimization is deferred until native inference establishes the quality baseline and an optimized representation proves useful speed/resource improvement without unacceptable speaker-fidelity regression.

Daily Meeting inference remains owned by the existing canonical Python local worker. VoiceLab training is a long-running build operation, not a second daily inference engine. Training and an active Meeting are mutually exclusive in the first implementation; do not add background training, GPU arbitration, automatic training pause/resume, or a second worker merely to run both simultaneously.

The existing one-private-PythonRuntime architecture remains preferred. Full upstream GPT-SoVITS requirements must **not** be installed wholesale: WebUI, Gradio, FunASR, FastAPI, ModelScope, broadcast/audio-separation tools, and other upstream conveniences are not automatically product dependencies. First prove the smallest training + English inference dependency set can coexist with the current WorkerRuntime matrix. A second packaged Python environment is not pre-authorized; if exact compatibility evidence later proves the one-runtime approach impossible, that becomes a new architecture decision rather than an automatic workaround.

For reproducible evaluation, do not float against upstream `main`. The initial compatibility investigation is pinned to audited upstream commit:

```text
RVC-Boss/GPT-SoVITS
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

This commit pin is the current engineering baseline, not a permanent user-facing product version and not proof of local quality/performance.

Persistent ownership is:

```text
UserData/CacheData/VoiceLab
-> recordings / prepared dataset / candidate checkpoints / evaluation artifacts

UserData/SavedProject/VoiceLab
-> explicitly approved Voice Actor only
```

A rebuild cannot destroy the currently approved Voice Actor before the new candidate has successfully trained, been evaluated, and been explicitly approved.

**Reason**  
The required product outcome is speaker fidelity with practical daily Meeting latency, not instant cloning or provider breadth. Doing expensive speaker adaptation once and keeping daily inference warm avoids repeated cloning/training work while preserving the one-engine product contract. Keeping the initial dependency and UI boundary narrow prevents historical Audio Studio scope, upstream WebUI tooling, and speculative optimization formats from turning VoiceLab into a second product.

**Proof status**  
The product decision and source ownership direction are approved. GPT-SoVITS V2ProPlus source supports few-shot fine-tuning, English inference, native V2ProPlus configuration, speaker-verification support, and reusable trained weight paths at the audited upstream revision. TranslateIT dependency compatibility, actual model training, speaker similarity, native inference latency, CUDA memory behavior, Meeting integration, and target audio delivery are not yet proven and must not be claimed from this decision alone.

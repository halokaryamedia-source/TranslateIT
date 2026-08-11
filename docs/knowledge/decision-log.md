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

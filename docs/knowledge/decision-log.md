# TranslateIT — Decision Log

This file keeps only durable reasoning needed to continue the current product. Superseded detail remains available in Git history; it is not repeated here because old feature decisions must not consume normal task context or appear to authorize retired behavior.

## D-001 — `New` Is Development Authority

**Decision**  
Branch `New` owns current development. `V1-Advance`, older branches, `DevelopingData`, and old reports are recovery evidence only.

**Reason**  
Current product policy and source have been reconciled on `New`. Historical implementation must not silently override current owners.

## D-002 — One Desktop Product And One Local Worker

**Decision**  
Keep one Rust/Tauri desktop application and one existing Python helper/worker path for ASR, translation, and TTS. Do not create a second launcher, translator engine, model-selection service, readiness service, or compatibility runtime to avoid repairing the current owner.

**Reason**  
The repository already contains valid semantic owners. Parallel implementations add failure paths without improving the core translator.

## D-003 — Reliable Translation Core Supersedes Feature Breadth

**Decision**  
The initial product is intentionally limited to:

```text
Meeting
├─ Start Translation
├─ final ID speech -> EN translation -> EN TTS
├─ translated voice -> TranslateIT Meeting Microphone
├─ optional EN Meeting Sound -> ID text
└─ Stop Translation

Text
├─ ID <-> EN
├─ Translate
└─ Copy

Settings
├─ Meeting
└─ Advanced / Diagnostics
```

Not initial core: Pause/Resume, Push to Talk, Stop Voice, Speak Now/Cancel, partial translated subtitles, Realtime/Quality user modes, tone/context controls, History/Saved, Audio Studio/custom voice, Documents, additional languages, incoming TTS, or automatic mid-session Meeting Sound default-device rebind.

**Reason**  
Feature breadth had moved ahead of proven translation quality and created multiple stale product/runtime paths. A small translator that works reliably is the acceptance target.

This decision supersedes older product/UI decisions wherever they describe a removed initial feature. Git history preserves their provenance.

## D-004 — Meeting Has One Application-Level Authority

**Decision**  
`commands/meeting_session.rs` and `engine/runtime_state.rs` own the normal Meeting lifecycle:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Navigation/minimize does not create or stop another Meeting session. Stop revokes output authority before cleanup. Safe application close delegates to the same Stop owner.

Finalized stable speech is product truth. The bounded committed-turn store is transient current-session data used by the Live transcript; it is not History persistence or model context.

Optional incoming English -> Indonesian assistance is a second audio lane inside the same Meeting session, not a second session runtime. If incoming capture/suppression/reverse translation is unsafe or unavailable, incoming degrades/disables while healthy required outbound continues.

**Reason**  
One authority prevents duplicate audio output, stale async promotion, lifecycle races, and persistence coupling. Optional assistance must not make the primary translation path less reliable.

## D-005 — Direction-Based Local Translation

**Decision**  
Normal Meeting/Text translation selects behavior by language direction, not by user-facing mode:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

Current utterance/text is the model input. Do not silently truncate source text or promote known incomplete generation. Model/provider implementation may change later if target-machine evidence shows a better option, but users do not select models.

**Reason**  
Direction is the real product contract. Realtime/Quality and context/tone layers created complexity without a distinct approved product behavior.

## D-006 — Controlled Windows Setup Uses Local Sidecar Payloads, Without Hash Framework

**Decision**  
Initial controlled Windows distribution keeps one user-run Setup experience and may distribute large local runtime/model payloads beside Setup for local placement into the canonical runtime layout.

The initial release does **not** require a SHA-256/checksum/revision identity framework, artifact registry, payload identity controller, first-run network downloader, in-app package manager, manual Python/model setup, cloud fallback, or NLLB fallback.

For the initial controlled release, the approved prepared payload, deterministic placement, and real post-install worker/runtime execution are the useful acceptance boundary. Source/revision/checksum metadata may be reconsidered only if a concrete release problem later proves it necessary.

**Reason**  
Hash/revision metadata does not prove model load, inference, audio delivery, or translation quality. Building a second release-identity subsystem before those fundamentals are proven is disproportionate maintenance work.

This decision retains the useful local-sidecar topology from the older release decision while superseding its hash/revision sub-plan.

## D-007 — Runtime Resources And Writable User Data Have Separate Owners

**Decision**  
`engine/paths.rs` is the semantic path owner. Packaged runtime resources come from the Tauri resource root; writable cache/log/user state comes from app-local data. Repository probing is debug-development fallback only.

`EngineData` is product implementation/runtime metadata. `UserData` is runtime/user-owned output. `DevelopingData` is historical/recovery evidence.

**Reason**  
Installed builds cannot safely treat repository-relative paths or immutable resources as writable application state.

## D-008 — Validation Must Be Proportional To The Current Product

**Decision**  
Keep a small validation set that protects the current source boundary plus real compile/type/runtime proof where the claim requires it. Do not maintain deterministic test museums, report generators, branch-era matrices, dead feature validators, or source markers merely to produce more PASS output.

ChatGPT -> GitHub can establish source ownership/wiring. Rust/TypeScript compile, Tauri launch, model execution, Windows audio, rendered UI, latency, installer, and clean-machine claims require the appropriate local environment.

**Reason**  
Large static validation systems were consuming maintenance effort while protecting features already removed from the product. Proof quality comes from matching evidence to the exact claim, not from validator count.

## D-009 — One Active Frontend Entry And Bounded Diagnostics

**Decision**  
`src/main.ts` is the only normal frontend module entry. Retired Audio Studio/History/dev-pipeline entrypoints must not poll or bind in parallel.

Normal readiness reads only the current product facts needed to present Meeting/Text state. Heavy or technical checks stay behind explicit setup/Diagnostics actions. Diagnostics is troubleshooting presentation, not a manual control plane for old helper preload/pipeline/professional-readiness experiments.

**Reason**  
Parallel entrypoints, repeated polling, and broad readiness snapshots waste resources and keep removed architecture alive. The desktop should request the smallest current capability projection.

## D-010 — Installed Worker Uses One Private Embedded Python Runtime

**Decision**  
The initial installed Windows build will keep the existing Python worker scripts and run them with one application-local embedded CPython runtime distributed in the approved local payload.

Canonical installed layout:

```text
<runtime root>/EngineData/Backend/LocalWorker/
├─ WorkerRuntime/
│  ├─ realtime_local_worker.py
│  ├─ virtual_audio_route_provider.py
│  └─ model_manifest.json
└─ PythonRuntime/
   ├─ python.exe
   ├─ embedded CPython runtime files
   └─ vendored third-party packages
```

Installed execution uses only:

```text
EngineData/Backend/LocalWorker/PythonRuntime/python.exe
```

The same interpreter must be used by the persistent worker and the Meeting Microphone Python provider. `TRANSLATEIT_WORKER_PYTHON`, worker `.venv`, system `python`/`python3`, Windows `py`, and the separate `TRANSLATEIT_PYTHON` route override are development conveniences only and must not become packaged-release success paths.

Do not freeze the worker into a PyInstaller/Nuitka executable for the initial release. Do not copy a `.venv` as the release runtime. Do not install pip/uv or resolve packages on the user's machine. Third-party Python packages are prepared as part of the release payload and kept intact beside the private interpreter; models remain under `RuntimeAssets` rather than inside the Python runtime.

No dependency lock/hash framework is required for this initial slice. The approved prepared runtime payload is accepted through real local and clean-machine execution; tighter dependency pinning may be added only if release drift becomes a concrete problem.

**Reason**  
Python's embeddable distribution is intended to ship as part of another application, while Python virtual environments are explicitly not intended to be moved/copied. Keeping the existing scripts under a private interpreter preserves the current worker/model/debug behavior and avoids adding a freeze spec, hidden-import/binary collection layer, one-file extraction behavior, or a second worker architecture.

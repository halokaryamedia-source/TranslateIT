# TranslateIT — Decision Log

Durable choices and reasons that must survive chat/session boundaries. Exact implementation detail belongs in current source/foundation owners; active status belongs in `next-action.md`; historical run IDs and superseded proof detail remain in Git history.

## D-001 — `New` Is Development Authority

**Decision**  
`New` owns current development. `Developing` is the only retained historical/recovery branch and is not a silent fallback source or write target.

**Reason**  
Current work must not drift to a default or historical ref.

## D-002 — One Desktop Product And One Local Worker

**Decision**  
Keep one Rust/Tauri desktop application and one canonical Python worker path for normal ASR, translation, and TTS inference.

**Reason**  
Parallel launchers, workers, readiness services, or compatibility runtimes add failure paths without improving the approved translator.

## D-003 — Reliable Translation Core Supersedes Feature Breadth

**Decision**  
Prioritize reliable Meeting/Text translation over broad feature count. Initial top-level product is Meeting / Text / VoiceLab / Settings. VoiceLab was later explicitly reopened by D-020; other deferred feature-breadth exclusions remain unless a new product decision replaces them.

**Reason**  
Feature breadth previously moved ahead of proven translation quality and created stale parallel paths.

## D-004 — Meeting Has One Application-Level Authority

**Decision**  
`commands/meeting_session.rs` + `engine/runtime_state.rs` own the Meeting lifecycle:

```text
Ready → Starting → Live → Stopping → Ended
```

Navigation does not recreate/stop Meeting. Stop revokes output authority before cleanup. Optional incoming remains subordinate and may degrade without blocking safe required outbound.

**Reason**  
One authority prevents duplicate output, stale async promotion, and lifecycle races.

## D-005 — Direction-Based Local Translation

**Decision**  
Normal translation is selected by Indonesian ↔ English direction through the canonical local translation owner. Current source text/utterance is the input; it is not silently truncated or promoted when known incomplete.

**Reason**  
Direction is the approved product contract; user-facing engine/mode selection is unnecessary.

## D-006 — One Setup Experience May Use Colocated Offline Payloads

**Decision**  
Initial controlled distribution may place large local runtime/model payloads beside one user-run Setup so installation remains fully offline and deterministic. This is permission for the packaging shape, not automatic approval of a specific final file layout after R3. Do not add first-run download, package manager, manual Python/model setup, or a checksum/registry framework merely to solve distribution.

**Reason**  
One setup experience matters more than forcing all bytes into one physical executable. Exact packaging still must respect current evidence and an explicit release-boundary decision.

## D-007 — Runtime Resources And Writable User Data Have Separate Owners

**Decision**  
Packaged runtime resources resolve from the application resource/runtime root; writable cache/log/user state resolves from app-local data. Repository probing is development-only.

**Reason**  
Installed builds cannot safely treat repository-relative resources as writable state.

## D-008 — Validation Must Be Proportional To The Claim

**Decision**  
Use a small repeatable source/preflight set plus real compile/runtime/device/package proof when the claim requires it. Do not grow test/report machinery merely because another check is possible.

**Reason**  
Proof quality comes from evidence matched to the exact claim, not verifier count.

## D-009 — One Active Frontend Entry And Bounded Diagnostics

**Decision**  
`src/main.ts` is the only normal frontend entry. Normal product surfaces use product-facing states; heavy technical inspection stays in setup/Advanced/Diagnostics boundaries.

**Reason**  
Parallel entrypoints and broad diagnostic polling keep retired architecture alive and waste resources.

## D-010 — Installed Worker Uses One Private Embedded Python Runtime

**Decision**  
Installed Windows builds run WorkerRuntime through one application-local private CPython runtime. System Python, repository `.venv`, `py`, and environment overrides are development conveniences only.

**Reason**  
A private interpreter preserves one controlled worker/runtime architecture without freezing or duplicating the worker.

## D-011 — Frontend Uses A Small Svelte 5 Architecture

**Decision**  
Use one plain Svelte 5 SPA inside Tauri 2 with Vite, TypeScript, Tailwind CSS 4, semantic tokens, selective Bits UI, and Lucide Svelte. Svelte owns presentation/application state, not duplicate runtime truth.

**Reason**  
Declarative components improve maintainability without requiring SvelteKit, a frontend router, Redux-like state, or another heavy framework.

## D-012 — Live Helper Recovery Is Transport-Only And Stage-Bounded

**Decision**  
Automatic Live helper recovery handles proven helper transport/lifecycle failures only. ASR and translation may receive at most one safe retry before output side effects; current synthesis is not blindly replayed after uncertain transport failure.

**Reason**  
Recovery should restore one canonical worker without masking model/content failures or creating duplicate spoken output.

## D-013 — Optional Incoming Prioritizes Freshness And Cannot Strand Shared Infrastructure

**Decision**  
Optional incoming may drop stale work under outbound contention. A proven incoming transport failure is not replayed; bounded same-worker recovery may restore shared infrastructure before scheduler ownership is released.

**Reason**  
Required outbound must not inherit a deliberately stopped helper, while old incoming comprehension must not become a backlog.

## D-014 — Active Runtime Sessions Freeze Conflicting Audio/Helper Mutation

**Decision**  
While a runtime session owns current resources, conflicting device preference changes, Mic Test/setup repair, and public/manual helper restart are deferred/rejected until canonical Stop.

**Reason**  
Persisted settings or helper lifecycle must not diverge from resources owned by an active Meeting/Mic Test.

## D-015 — Meeting Route Requires One Matched Pair Bound To The Session

**Decision**  
Meeting route readiness requires one recognized playback/recording virtual-audio pair. The prepared pair is bound to the Meeting generation and is not silently replaced mid-session.

**Reason**  
Independent virtual-looking endpoints can create false readiness and misleading user instructions.

## D-016 — Provider Preflight Has A Bounded Pre-Authority Safety Ceiling

**Decision**  
The Meeting route provider preflight is bounded before Meeting authority commits; the current source safety ceiling exists to contain hangs, not to define a latency SLA.

**Reason**  
A provider/import/device-enumeration hang must not leave Start stuck forever before application authority exists.

## D-017 — Windows Power Transitions Converge Through Canonical Meeting Stop

**Decision**  
Sleep/hibernate handling reuses the canonical Meeting Stop owner. Wake does not automatically resume/replay old voice output.

**Reason**  
Power transitions can invalidate capture/device/helper ownership; one Stop path preserves authority-first cleanup.

## D-018 — Clean Desktop Utility Is The Approved Visual Baseline

**Decision**  
Preserve a compact dark desktop-utility visual direction: clear task/state hierarchy, narrow sidebar, restrained card/border use, calm healthy states, stronger emphasis only for action/attention, and one dominant normal action.

**Reason**  
Rendered review showed this direction improves usability without changing product/runtime semantics.

## D-019 — One Windows CUDA Matrix And Capability-Only CPU Fallback

**Decision**  
Keep one locked WorkerRuntime environment. CUDA is preferred when proven available; CPU fallback is selected only for known capability absence, not as a broad exception fallback after arbitrary CUDA/model/runtime failure.

**Reason**  
A single reviewed dependency matrix is reproducible and prevents real failures from being disguised as healthy CPU degradation.

## D-020 — VoiceLab Uses One Trained GPT-SoVITS V2ProPlus Voice Actor

**Decision**  
VoiceLab creates one approved trained `MyVoice` actor using GPT-SoVITS V2ProPlus from guided English recordings, held-out evaluation, and explicit user approval. Daily Meeting inference reuses that actor through the existing canonical worker and does not retrain per startup/utterance.

**Reason**  
The product requirement is speaker fidelity with practical daily use, not provider breadth or instant-clone modes.

## D-021 — Initial Meeting Audio Provider Uses Standard VB-CABLE

**Decision**  
The initial controlled Windows provider direction is the standard VB-Audio VB-CABLE package. Runtime pair detection/delivery remains Rust/CPAL ownership; provider distribution/installation is a release boundary.

**Reason**  
One standard pair fits the existing route without introducing a mixer, provider registry, or custom driver.

## D-022 — BuildIT-Style GitHub Governance Owns Repository Execution

**Decision**  
TranslateIT adopts the relevant BuildIT operating discipline for ChatGPT/GitHub work:

```text
PIN
→ READ MINIMUM
→ DIAGNOSE
→ TOOL FIT
→ WRITE ONCE
→ VERIFY MINIMUM
→ STOP
```

`GITHUB_RULES.md` is the canonical owner for branch/ref, tool-fit, atomic logical delivery, commit/history, CI/API/security, retry, hosted-proof, and STOP discipline. `AGENTS.md` owns boot/mode/continuity routing. Active continuation stays compact in `next-action.md`; ownership maps do not carry milestone status.

The normal repository budget is one logical commit and one ref update per coherent task, relevant CI only, no CI-trigger/proof-only commits, no temporary one-use workflows, maximum two same-cause attempts with new evidence, and no adjacent cleanup unless required.

**Reason**  
Previous hosted proof work could produce temporary workflow churn, repeated proof commits, and oversized/stale active-state documents. Separating GitHub mechanics from product routing and enforcing a small static repository gate reduces branch mistakes, commit spam, evidence inflation, stale continuity, and CI-as-remote-shell behavior without changing TranslateIT product architecture.

**Boundary**  
This governance decision does not change Meeting, Text, VoiceLab, models, Windows audio, installer implementation, or the deferred target-Windows acceptance boundary.

# TranslateIT — Decision Log

Durable choices and reasons that must survive chat/session boundaries. Exact implementation detail belongs in current source/foundation owners; active status belongs in `next-action.md`; historical run IDs and superseded proof detail remain in Git history.

## D-001 — `Local` Is Development Authority

**Decision**  
`Local` owns current development. `Developing` remains the GitHub default branch and is the only retained historical/recovery branch; it is not a silent fallback source or write target.

**Reason**  
Current work must not drift to the default or historical branch when `Local` is the explicit development authority.

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

`GITHUB_RULES.md` is the canonical owner for branch/ref, tool-fit, atomic delivery, history, CI, retry, and STOP discipline. `AGENTS.md` owns boot/mode/continuity routing. Active continuation stays compact in `next-action.md`; ownership maps do not carry milestone status.

The normal repository budget is one logical commit and one ref update per coherent task, relevant CI only, no CI-trigger/proof-only commits, no temporary one-use workflows, maximum two same-cause attempts with new evidence, and no adjacent cleanup unless required.

**Reason**  
Separating GitHub mechanics from product routing and enforcing a small static repository gate reduces branch mistakes, commit spam, evidence inflation, stale continuity, and CI-as-remote-shell behavior without changing TranslateIT product architecture.

**Boundary**  
This governance decision does not change Meeting, Text, VoiceLab, models, Windows audio, installer implementation, or the target-Windows acceptance boundary.

## D-023 — One Fully Offline Setup With Colocated External Payload Is Approved

**Decision**  
The release boundary is one user-facing automatic offline Setup plus colocated external payload file(s). Users launch `TranslateIT-Setup.exe`; Setup owns locating, validating, and extracting/installing its colocated payload automatically. Users are not asked to install Python, run pip, download core models, manually extract archives, or run a second installer.

R3.2 establishes `7z/LZMA2` as the current size-first compression candidate because the then-current exact resource set compressed materially smaller than ZIP while preserving byte-identical extracted content. This is evidence for payload representation, not permission to introduce an unrelated user-facing 7-Zip product/runtime.

**Reason**  
The classic single-EXE NSIS boundary is structurally unsuitable for the large offline payload, while the user experience requirement is one automatic offline setup—not one physical file.

**Boundary**  
Do not turn this into a bootstrap download system, package manager, general artifact registry, manual extraction workflow, second setup, or model-quality reduction. Target-Windows installation/clean-machine proof remains separate acceptance evidence.

## D-024 — Canonical Translation Moves To M2M100 With Standalone Semantic Segmentation

**Decision**  
Replace the two Marian production translation models with one pinned `facebook/m2m100_418M` bidirectional model at revision `55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636`. Keep one canonical local translation runtime; do not retain Marian as a normal fallback or add a provider router.

Standalone Text preserves blank-line paragraphs and translates conservative semantic/sentence units independently before ordered reassembly. A single oversized semantic unit may use the existing token-safe fallback. Every required unit must complete before any Text result is promoted. Meeting remains one finalized utterance at a time and receives its own later target acceptance.

The runtime uses the pinned model generation profile rather than overriding it with greedy `num_beams=1`. Translation completion must recognize a valid EOS followed only by model padding as complete; padding must not create a false incomplete result, while output with no verifiable EOS remains blocked.

**Reason**  
Target-Windows RTX 3070 evidence showed recurring Marian correctness/quality failures: multi-sentence omission, duplicated dates, numeric corruption (`2100`→`200`), technical-fact loss, and name/version corruption. Restoring Marian's model-default beams fixed one omission but did not make the model reliable.

The same target evaluation showed M2M100 materially stronger in both directions for dates, names, numbers, versions, IP addresses, URLs, CUDA terminology, and the original omission case. Whole-text M2M100 still omitted a second EN→ID question in one fixture; semantic segmentation restored it. Across the final whole-vs-segmented fixture set, segmented M2M100 preserved all monitored literals in both directions with warm per-request totals roughly in the 0.25–0.52 s range on the tested RTX 3070. Natural-language wording findings remained unresolved quality observations.

**Boundary**  
D-024 records the current implementation direction, not permanent quality acceptance. Do not add generic date/number correction, glossary, back-translation, semantic verifier, cloud fallback, multi-model fallback, or user-facing translation modes merely to mask model defects.

## D-025 — Translation Quality Requires A General Benchmark Gate Before Further Runtime Change

**Decision**  
The current D-024 implementation remains the active translation path, but it is **not accepted as final translation quality** after target STEP 2C-B reproduced a meaning-changing EN → ID modality error (`must not` → `tidak harus`). No further production translation change may be made from one failing phrase, one known fixture, or one hand-written decoder experiment.

Before another model, decoder, segmentation, or output-handling change is implemented, the translation work must define and execute a general, reproducible quality gate containing all of the following:

```text
1. external/reference benchmark for both ID → EN and EN → ID
2. product-domain semantic stress suite covering grammar/meaning categories
3. unseen holdout material not used to choose/tune the implementation
4. MT quality metrics appropriate to reference translation
5. deterministic opaque-fact checks for names/numbers/dates/versions/IP/URL-like material where valid
6. human severity review for meaning-changing errors such as negation/modality/reference
7. naturalness/fluency review separate from correctness
8. target RTX 3070 cold-load, warm p50/p90 latency, and whole-device VRAM evidence
9. local/offline, Windows, licensing, and packaging constraints
```

The benchmark itself must not encode one exact expected phrasing as the product definition. Exact-output assertions remain limited to deterministic runtime contracts, not natural-language quality.

Candidate evaluation is bounded to the current baseline plus at most **two serious challengers per round**. A better candidate must replace the canonical model if adopted; do not create a normal production model router/fallback stack merely to win individual examples.

Phrase-specific corrections are explicitly rejected, including hard-coded rules such as `must not` → `tidak boleh`, date repair maps, hand-written grammar rewriting, fixture-targeted dictionaries, or post-processors whose success is defined by examples already seen during debugging.

**Reason**  
The previous migration correctly fixed severe Marian omissions and factual corruption, but target acceptance exposed a process weakness: completeness and literal preservation were used as stronger proxies for overall translation quality than they can support. Semantic segmentation can guarantee that planned source units are attempted; it cannot guarantee correct modality, negation, tense, reference, or natural target-language wording. The `must not` failure proves that a translation may be structurally complete and fact-preserving while still being semantically wrong.

A broad benchmark + holdout gate reduces fixture overfitting and lets quality improvements be evaluated against the required latency/VRAM envelope instead of accumulating targeted patches.

**Boundary**  
Do not resume microphone, VoiceLab, Meeting, installer, or additional translation development until the Translation Quality Improvement Plan built around this gate is researched, critiqued, and explicitly approved. D-025 does not itself choose the next model, decoder profile, benchmark tool, metric, or quantization method.

## D-026 — LMT-60-1.7B Is The Approved Translation Evaluation Target

**Decision**  
Use `NiuTrans/LMT-60-1.7B` as the sole preferred challenger and intended canonical target for the next translation-quality round. The current M2M100-418M implementation remains the active production baseline until LMT-60-1.7B passes the frozen D-025 benchmark/holdout and target-Windows quality, latency, VRAM, licensing, offline, and packaging gates.

Round 1 does not evaluate LMT-0.6B, LMT-4B, LMT-8B, MADLAD-400 3B, or another model in parallel. Those may be reopened only if LMT-60-1.7B materially fails the approved gate and new evidence justifies a second bounded round. Do not add LMT as a runtime fallback/router beside M2M100; if adopted, it replaces the canonical translation model.

**Reason**  
The approved model-family audit prioritizes translation quality and low latency, with model size secondary. Published Indonesian LMT scaling results show a material quality gain from 0.6B to 1.7B, followed by substantially smaller gains from 1.7B to 4B/8B. The 1.7B payload is materially more practical for the target RTX 3070 8 GB than the 4B/8B variants, while avoiding the larger quality sacrifice of the 0.6B model. LMT is translation-specialized, supports Indonesian, and uses an Apache-2.0 license suitable for the current product evaluation direction.

**Boundary**  
This is approval to evaluate LMT-60-1.7B, not permission to pre-promote it into `model_manifest.json`, RuntimeAssets, or the production worker. D-025 remains controlling: first freeze the general benchmark contract, then compare M2M100 and LMT-60-1.7B under the exact same unseen/holdout, quality, naturalness, latency, and VRAM procedure. Production changes occur only after that evidence passes.

## D-027 — LMT Uses One Approved Runtime Configuration

**Decision**  
If LMT-60-1.7B proceeds through evaluation and production migration, use one approved execution configuration rather than a family of quality/speed profiles:

```text
PyTorch / compatible Transformers 4.x
CUDA on the target Windows RTX 3070
BF16 weights/compute path
AutoModelForCausalLM
upstream LMT translation prompt + chat template
num_beams=5
do_sample=False
use_cache=True with DynamicCache
native PyTorch SDPA attention
resident model after preload
model.eval() + torch.inference_mode()
```

Do not maintain CTranslate2, external FlashAttention2, `torch.compile`, static full-context cache, FP16, INT8/INT4, beam-reduced, speculative-decoding, or other alternate translation runtime profiles as normal options. There is no user-facing Realtime/Quality selection. If the single approved configuration fails semantic quality, practical target latency, or stable 8 GB VRAM operation, stop and reassess the model/runtime decision rather than accumulating additional production profiles.

**Reason**  
The product needs one understandable, reproducible translation behavior. Dynamic KV cache removes repeated autoregressive key/value computation while keeping the selected model weights, BF16 precision, prompt, and beam policy. Native PyTorch SDPA provides optimized CUDA attention dispatch without adding an external Windows attention package. Keeping one backend and one numeric/generation policy minimizes dependency and packaging risk and makes failures attributable instead of creating a matrix of partially equivalent configurations.

**Boundary**  
D-027 does not pre-approve production migration. D-025 still controls quality/holdout evidence and target-Windows latency/VRAM proof. M2M100 remains only the sequential pre-migration benchmark reference until LMT is accepted; after accepted migration it is retired rather than retained as fallback.

## D-028 — MiLMMT-46-1B-v1.0 BF16 Is The Selected Translation Migration Target

**Decision**  
Select `xiaomi-research/MiLMMT-46-1B-v1.0` at revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995` as the translation migration target for TranslateIT, using CUDA BF16, the official Xiaomi translation prompt, and deterministic generation. MiLMMT-46-4B-v1.0 is comparison evidence only and is not an active migration candidate.

D-028 supersedes D-026 and D-027 as the active model/runtime-selection direction. D-026/D-027 remain historical records of the earlier LMT evaluation phase; they do not reopen LMT or its runtime profile.

Production remains unchanged until MiLMMT-1B integration and target end-to-end proof pass. If adopted, MiLMMT-1B replaces the canonical production translator rather than becoming a router/fallback beside M2M100.

Before migration, one bounded same-model latency-optimization pass is allowed. It must preserve the same checkpoint, BF16 precision, official prompt, deterministic translation semantics, and no output repair. Execution-only variants may be adopted only when target-Windows evidence shows repeatable useful latency improvement without translation-quality regression. Exact output equality is preferred; any changed output requires semantic/factual/naturalness review before acceptance.

**Reason**  
The representative 24-case Meeting/Text evaluation completed all cases for MiLMMT-1B and MiLMMT-4B. The 4B model showed stronger aggregate quality, but the clean RTX 3070 rerun measured approximately 4516 ms p50 / 7036 ms p90 and ~4826 MiB framework allocation for 4B INT8, versus approximately 689 ms p50 / 1139 ms p90 and ~1907 MiB framework allocation for 1B BF16. The user explicitly selected MiLMMT-1B for the realtime product boundary after this clean comparison.

**Boundary**  
Do not introduce another translator automatically, reopen MiLMMT-4B as the active candidate, quantize the selected 1B model merely for speed, add phrase-specific repair, or create multiple permanent translation runtime profiles. If the bounded optimization pass yields no worthwhile safe gain, keep the clean MiLMMT-1B BF16 baseline and proceed to canonical integration and end-to-end ASR → translation → GPT-SoVITS proof.

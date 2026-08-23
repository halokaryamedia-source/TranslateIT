# TranslateIT — Acceptance Scenarios

Owner of **what must be verified before a claim is allowed**, and in which order. This file never records run outcomes; results live in `docs/knowledge/next-action.md` continuity plus per-scenario evidence artifacts. Established by D-031 after the all-in-one R3 gate was retired for unclear scenario ownership.

## Principles

- One scenario proves one claim. Run one at a time, in criticality order; stop at the first failure and diagnose that owner before continuing.
- Every result carries an honest label: `dev-tree proof`, `installed-runtime proof`, or `target-PC observation`. A dev-tree pass never substitutes for an installed or clean-machine claim.
- Automated scenarios write one redacted JSON artifact under `UserData/LogData/RustAppValidation/`. Build-bound scenarios write under ignored `src-tauri/target/`. Missing evidence must not be fabricated.
- Nothing the retired mega-gate covered may vanish silently: every covered claim exists here or is explicitly deferred below.

## Retirement record

Removed: root `Run-Local-Test.ps1`, `scripts/run_local_test.ps1`, `scripts/run_target_pc_acceptance.ps1` (D-031). One opaque run mixed release building, installation, and ~12 unrelated claims, so failures had unclear ownership and expensive feedback. `build_release.ps1` remains the controlled release entry and is used directly by deferred Group E. Staging (`stage_release_inputs*.ps1`) remains owned by CI and Group E.

## Group A — Core AI runtime (headless)

Run first. Uses `WorkerRuntime/run_realtime_worker_smoke.ps1` with `-IncludeOverLengthProbe` for A6 (A1–A5 and A6 green on CUDA BF16, 2026-08-23).

| ID | Claim | Mode | Precondition | Pass criteria |
|---|---|---|---|---|
| A1 | Worker starts; pinned dependencies resolve | auto | staged `.venv`, markers | `status.ok`; blockers empty |
| A2 | CUDA BF16 execution truth | auto | NVIDIA GPU | `device=cuda`, `precision=bf16` on translate |
| A3 | ASR turbo preload | auto | RuntimeAssets marker | `asr_preload.ok` on cuda |
| A4 | Translation ID→EN canonical contract | auto | A2, A3 | ok + `canonical_bidirectional_id_en` + `complete` + `finished_with_eos` |
| A5 | Translation EN→ID canonical contract | auto | A2, A3 | same, direction `en->id` |
| A6 | Over-length input rejected before any truncation/compaction | auto | A4 | >2000-char translate returns `ok:false`, blocker `translation:text_too_large`, `max_chars:2000` |
| A7 | Incomplete generation rejected with named cause | auto | A4 | real `_continuation` fixture `test_milmmt_continuation_rejects_token_ceiling_without_eos` asserts blocker `translation:output_hit_token_ceiling_without_eos`; the ended-without-EOS branch lives in the same validator |
| A8 | My Voice build→evaluate→approve→bind | manual-app | GPT-SoVITS assets | approved profile exists; readiness reports it |
| A9 | Actor-token swap fails closed | manual-app | A8 | synthesis refuses on token mismatch |

A8/A9 run through the My Voice app workflow.

## Group B — Windows audio (physical microphone)

| ID | Claim | Mode | Pass criteria |
|---|---|---|---|
| B1 | Mic discovery + functional probe | auto+device | `callback_frames_observed > 0` |
| B2 | Session Listening finalizes segments continuously | manual-device | natural pauses produce finalized segments until Stop |
| B3 | PTT shares one canonical capture path | manual-device | no second stream; same runtime owner |
| B4 | VAD edge losses are observable | manual-device | >60 s speech drop and eviction increment visible counters |
| B5 | Device change locked during session | manual-device | selection blocked with clear message while active |
| B6 | Virtual route truth is labeled | auto+device | matched pair reported with explicit non-delivery-proof labeling |

## Group C — Meeting end-to-end (dev-mode app)

Requires green A-group and the relevant B scenarios.

| ID | Claim | Mode | Pass criteria |
|---|---|---|---|
| C1 | Start→ASR→translate→TTS→delivery with stage timing | manual-device | Live reached; outbound stage timings recorded |
| C2 | Incoming lane isolation | manual-device | EN sound→ID text works; incoming failure does not break outbound |
| C3 | Stop lifecycle cleanliness | manual-device | full rollback; helper recovery when needed; no dangling handles |
| C4 | Close-window guard ladders | manual-app | each branch (voice block/unavailable/foreign/stopping) behaves as designed |
| C5 | Repeated start/stop ×3 stability | manual-device | third cycle stable; counters sane |

## Group D — Desktop product surfaces

| ID | Claim | Mode | Pass criteria |
|---|---|---|---|
| D1 | FirstSetup checkpoints persist | manual-app | state survives relaunch (settings v6) |
| D2 | Settings sanitize + atomic write | auto | existing cargo tests; manual save during C |
| D3 | Readiness truth gates Start | manual-app | without approved My Voice, Start disabled with Setup Needed vocabulary |
| D4 | Diagnostics redaction | manual-app | error ring shows no absolute user paths |

## Group E — R3 distribution (deferred, opt-in)

Run only when distribution readiness is decided. Each is its own scenario, not a combined gate.

| ID | Claim | Mode | Pass criteria |
|---|---|---|---|
| E1 | Version/hash-bound Setup+Payload pair builds | auto-build | clean tracked tree; evidence records commit + both SHA-256 |
| E2 | Fresh install on target PC | manual-UAC | installed manifest written; app launches from installed root |
| E3 | Installed-worker fixtures | auto-installed | ID↔EN through installed private runtime |
| E4 | Uninstall preserves user data + driver | manual | payload roots removed; SavedProject and VB-CABLE remain |

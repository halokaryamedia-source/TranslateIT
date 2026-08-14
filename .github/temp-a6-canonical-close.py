from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
NEXT = ROOT / "docs/knowledge/next-action.md"
OWNERS = ROOT / "docs/knowledge/source-ownership.md"
CONTEXT = ROOT / "CONTEXT.md"
DECISIONS = ROOT / "docs/knowledge/decision-log.md"
EXPECTED = sorted([
    "CONTEXT.md",
    "docs/knowledge/decision-log.md",
    "docs/knowledge/next-action.md",
    "docs/knowledge/source-ownership.md",
])


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


NEXT.write_text(
    """# TranslateIT — Next Action

## Current Mode

**Maintenance / VoiceLab Source Closed — WAITING FOR TARGET-WINDOWS AUTHORIZATION**

VoiceLab A1 through A6 are closed source-side. A6 completes the required Meeting custom-TTS integration without adding another Meeting lifecycle, worker, TTS authority, provider registry, or fallback voice path.

## A6 Result

The authoritative outbound Start transaction is now:

```text
refresh cheap worker capability truth
-> prepare exact matched Meeting output endpoint
-> Meeting generation owns Starting authority
-> open required microphone capture
-> preload ASR
-> run real Indonesian -> English translation fixture
-> voice_actor_preflight loads/warm-caches approved MyVoice
-> real bounded English voice_actor_synthesize fixture succeeds
-> generated voice is transcribed as a functional ASR check
-> approved actor identity is rechecked
-> bind that actor identity to this Meeting generation
-> prove native Meeting output callback on the prepared endpoint
-> create serialized outbound consumer
-> recheck final required readiness
-> same generation may commit Live
```

Live translated speech then uses only:

```text
finalized Indonesian speech
-> ASR
-> ID -> EN translation
-> voice_actor_synthesize(expected_actor_token = Start-proven MyVoice)
-> existing Rust/CPAL Meeting output route
```

If the approved actor disappears, changes, cannot load, cannot synthesize, or no longer matches the generation-bound actor token, outbound voice fails closed. Meeting does not silently select Piper, Windows SAPI, or another voice.

Diagnostic/First Setup functional readiness remains distinct from Live authority: it may prove the same local AI/MyVoice path without a Meeting generation, but only the generation-bound Start proof can supply the actor token consumed by Live Meeting synthesis.

## Accepted Source Proof

Final accepted hosted Windows proof:

```text
run 31773954105
exact checkout SHA d682f44d02ddd74a731b55bc1d0da6f738bf27f6
Windows Server 2022
A6 static authority guard -> PASS
frozen WorkerRuntime lock/import proof -> PASS
Python tests -> 28 PASS / 0 FAIL
startup + virtual-route + frontend source validators -> PASS
svelte-check -> 0 errors / 0 warnings
frontend production build -> PASS
cargo check --locked -> PASS
Rust tests -> 42 PASS / 0 FAIL
read-only git diff closure guard -> PASS
A6_FINAL_SOURCE_PROOF -> PASS
```

The proof is source/hosted evidence only. It does not claim execution with the user's real trained actor, target GPU, installed virtual-audio endpoint, or meeting application.

## Remaining Uncertainty — Target Windows Only

The remaining unresolved claims require the actual target Windows environment:

```text
packaged PythonRuntime + GPT-SoVITS source/pretrained asset placement
real approved MyVoice weights produced from user recordings
real MyVoice model load and bounded English synthesis
speaker fidelity / subjective listening acceptance
CUDA availability, VRAM practicality, and CPU fallback behavior on target hardware
real Meeting Start cold/warm timing and ongoing inference latency
physical VB-Cable / equivalent endpoint behavior
actual Zoom / Meet / Teams microphone reception
longer Meeting stability and Stop/resource cleanup on target
installer / clean-machine placement and startup behavior
```

No user-local-PC or target-Windows validation was performed while closing A6.

## Next Step

**Target Windows Validation (Requires Explicit Authorization)**

Do not start this step until the user explicitly authorizes target/local Windows testing. Until then, do not add speculative backend, provider, readiness, packaging, or tuning waves. If target evidence later exposes a concrete blocker, reopen only the owner required by that evidence.
""",
    encoding="utf-8",
    newline="\n",
)

owners = OWNERS.read_text(encoding="utf-8")
replacements = [
    (
        "| Continuation | `docs/knowledge/next-action.md` | ACTIVE / A6 NEXT |",
        "| Continuation | `docs/knowledge/next-action.md` | SOURCE CLOSED / TARGET VALIDATION NEXT |",
        "owners-continuation",
    ),
    (
        "| Meeting UI | `src/pages/Meeting.svelte`, `src/components/meeting/MeetingActivity.svelte` | ACTIVE / PRE-A6 TTS ROUTE |",
        "| Meeting UI | `src/pages/Meeting.svelte`, `src/components/meeting/MeetingActivity.svelte` | ACTIVE / A6 MYVOICE ROUTE SOURCE-CLOSED |",
        "owners-meeting-ui",
    ),
    (
        "| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / MEETING READINESS STILL PRE-A6 TTS |",
        "| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / A6 MYVOICE READINESS |",
        "owners-facade",
    ),
    (
        "| Trained Voice Actor worker commands | `realtime_local_worker.py::handle_voice_actor_preflight`, `handle_voice_actor_synthesize` | CLOSED A5 SOURCE-SIDE / NOT YET MEETING-AUTHORITATIVE |",
        "| Trained Voice Actor worker commands | `realtime_local_worker.py::handle_voice_actor_preflight`, `handle_voice_actor_synthesize` | CLOSED A6 SOURCE-SIDE / MEETING-AUTHORITATIVE |",
        "owners-worker-commands",
    ),
    (
        "| Meeting custom-TTS readiness | existing helper + Meeting Start transaction | NEXT A6 / NOT IMPLEMENTED |",
        "| Meeting custom-TTS readiness | existing helper + Meeting Start transaction | CLOSED A6 SOURCE-SIDE / GENERATION-BOUND MYVOICE |",
        "owners-a6",
    ),
    (
        "| Worker Python dependency graph | `WorkerRuntime/pyproject.toml` + `uv.lock` | ACTIVE A4+A5 / ONE FROZEN RUNTIME GRAPH |",
        "| Worker Python dependency graph | `WorkerRuntime/pyproject.toml` + `uv.lock` | ACTIVE A4-A6 / ONE FROZEN RUNTIME GRAPH |",
        "owners-worker-graph",
    ),
    (
        "| Target runtime proof | target Windows model/audio/device/package checks | DEFERRED UNTIL VOICELAB SOURCE CHAIN CLOSES |",
        "| Target runtime proof | target Windows model/audio/device/package checks | NEXT / REQUIRES EXPLICIT AUTHORIZATION |",
        "owners-target",
    ),
    (
        "VoiceLab creation through A4 and daily trained-actor inference through A5 are now source-closed. Meeting authority remains deliberately separate until A6.",
        "VoiceLab creation, daily trained-actor inference, and Meeting atomic MyVoice authority through A6 are now source-closed. Remaining acceptance is target-Windows evidence only.",
        "owners-boundary-intro",
    ),
    (
        """A6 next
-> existing helper/scheduler
-> generation-bound Meeting Start readiness
-> functional MyVoice synthesis fixture
-> existing native output callback
-> existing outbound consumer
-> same generation commits Live""",
        """A6 Meeting authority
-> existing helper/scheduler
-> generation-bound Meeting Start readiness
-> approved MyVoice preload + functional synthesis fixture
-> actor identity bound to the authoritative generation
-> existing native output callback
-> existing outbound consumer
-> same generation commits Live
-> Live synthesis requires the Start-proven actor identity""",
        "owners-a6-graph",
    ),
    (
        "Existing Meeting tasks `tts_preflight` and `synthesize` are not redirected in A5. That change belongs to A6 so Meeting activation remains atomic rather than partially migrated.",
        "A6 has now retired the pre-VoiceLab Meeting TTS authority from the required outbound path. Meeting Start and Live synthesis use `voice_actor_preflight` / `voice_actor_synthesize` through the same canonical worker while preserving the existing atomic Meeting lifecycle.",
        "owners-a5-transition",
    ),
    (
        "A5 fails closed for MyVoice synthesis. Missing/invalid actor files, source assets, model load, reference preparation, or synthesis do not invoke Piper/SAPI. Any stale destination WAV is removed on failure.",
        """A5 fails closed for MyVoice synthesis. Missing/invalid actor files, source assets, model load, reference preparation, or synthesis do not invoke Piper/SAPI. Any stale destination WAV is removed on failure.

## A6 Meeting MyVoice Authority

A6 extends the same canonical worker into the existing Meeting Start transaction. After the Meeting generation owns `Starting` authority and required microphone capture is open, the helper performs ASR preload, a real ID -> EN fixture, `voice_actor_preflight`, a real bounded MyVoice synthesis fixture, ASR over that generated voice, and a final actor-identity recheck. Only then can native output probing and the serialized outbound consumer complete before `Live`.

The readiness cache is bound to worker generation + Meeting generation + approved actor identity. Live `voice_actor_synthesize` must present the exact actor identity proven during Start. If the approved actor changes during the Meeting, synthesis fails closed and a new Start is required. Diagnostic readiness may use generation `0`, but generation `0` can never yield Live actor authority.""",
        "owners-a6-section",
    ),
    (
        "A5 canonical-worker trained-actor inference -> CLOSED SOURCE-SIDE",
        "A5 canonical-worker trained-actor inference -> CLOSED SOURCE-SIDE\nA6 Meeting atomic MyVoice readiness -> CLOSED SOURCE-SIDE",
        "owners-proof-list",
    ),
    (
        """7. Meeting atomic custom-TTS readiness -> NEXT A6
8. final source closure audit
9. target-Windows speaker-quality/latency/device/package acceptance""",
        """7. Meeting atomic custom-TTS readiness -> CLOSED A6 SOURCE-SIDE
8. final source closure proof -> CLOSED / run 31773954105
9. target-Windows speaker-quality/latency/device/package acceptance -> NEXT / EXPLICIT AUTHORIZATION""",
        "owners-proof-order",
    ),
    (
        "Hosted A5 proof does not prove real user actor weights, target GPT-SoVITS asset placement, target model load, speaker fidelity, CUDA/VRAM practicality, real inference latency, long-session stability, Meeting custom-TTS readiness, meeting-app audio reception, installer placement, or clean-machine execution. No user-local-PC testing occurred.",
        """Accepted A6 final hosted Windows proof is run `31773954105` at exact checkout SHA `d682f44d02ddd74a731b55bc1d0da6f738bf27f6`: static MyVoice authority guard PASS, frozen worker proof with 28 Python tests PASS, frontend validators/typecheck/build PASS, `cargo check --locked` PASS, 42 Rust tests PASS, and read-only closure guard PASS.

Hosted A6 proof does not prove real user actor weights, target GPT-SoVITS asset placement, real target model load, speaker fidelity, CUDA/VRAM practicality, real inference latency, physical meeting-app audio reception, installer placement, or clean-machine execution. No user-local-PC testing occurred.""",
        "owners-final-proof",
    ),
]
for old, new, label in replacements:
    owners = replace_once(owners, old, new, label)
OWNERS.write_text(owners, encoding="utf-8", newline="\n")

context = CONTEXT.read_text(encoding="utf-8")
context_replacements = [
    (
        """The active `New` source implements VoiceLab creation through A4 and canonical-worker trained-actor inference through A5. Guided recording, build/evaluation, explicit `MyVoice` approval/promotion, actor-package revalidation, cached GPT-SoVITS V2ProPlus runtime reuse, and bounded English `voice_actor_synthesize` are source-closed.

Meeting is intentionally **not migrated yet**. Existing Meeting `tts_preflight` / `synthesize` remain pre-VoiceLab until A6 replaces only that TTS portion inside the existing atomic Start transaction. Hosted source proof does not establish target speaker fidelity, CUDA/VRAM practicality, real inference latency, packaged asset placement, or physical meeting-audio delivery.""",
        """The active `New` source implements VoiceLab creation, canonical-worker trained-actor inference, and Meeting atomic MyVoice authority through A6. Guided recording, build/evaluation, explicit `MyVoice` approval/promotion, actor-package revalidation, cached GPT-SoVITS V2ProPlus runtime reuse, bounded English `voice_actor_synthesize`, generation-bound Start proof, and Live actor-token enforcement are source-closed.

Meeting is now migrated to MyVoice inside the existing atomic Start transaction. Hosted source proof still does not establish target speaker fidelity, CUDA/VRAM practicality, real inference latency, packaged asset placement, or physical meeting-audio delivery.""",
        "context-current-state",
    ),
    (
        """- Approved final outbound TTS target is the trained GPT-SoVITS V2ProPlus My Voice actor.
- A5 now implements approved `MyVoice` inference inside the canonical worker, but Meeting still invokes the pre-VoiceLab TTS tasks until A6 atomically replaces that TTS portion; this is an implementation gap, not an approved fallback policy.""",
        """- Approved and active required outbound TTS authority is the trained GPT-SoVITS V2ProPlus My Voice actor.
- A6 now binds the Start-proven MyVoice actor identity to the authoritative Meeting generation; Live synthesis requires that exact identity and fails closed if it changes or becomes unavailable. Piper/SAPI are not fallback authorities for required outbound Meeting voice.""",
        "context-translation-contract",
    ),
    (
        """Required outbound activation is transactional before `Live`: after the application Meeting generation owns `Starting` authority, the required microphone capture opens, the exact prepared virtual output endpoint must build/start a bounded silent CPAL stream and produce a native callback, and the serialized outbound consumer must be created. Only then may the same generation commit `Live`. Optional incoming Meeting Sound remains independent and starts after required outbound is Live. The silent callback probe proves native endpoint execution only; actual VB-Cable/meeting-app reception remains target-Windows evidence.

VoiceLab integration must extend this same Start authority rather than add another lifecycle. Final target behavior requires the trained actor to be loaded/warm, its canonical reference prepared/cached, and a bounded functional custom-TTS probe to succeed before `Live` can commit.""",
        """Required outbound activation is transactional before `Live`: after the application Meeting generation owns `Starting` authority, the required microphone capture opens, A6 performs generation-bound ASR/ID->EN/MyVoice functional proof and binds the approved actor identity, the exact prepared virtual output endpoint must build/start a bounded silent CPAL stream and produce a native callback, and the serialized outbound consumer must be created. A final readiness recheck must still pass before the same generation may commit `Live`. Optional incoming Meeting Sound remains independent and starts after required outbound is Live. The silent callback probe proves native endpoint execution only; actual VB-Cable/meeting-app reception remains target-Windows evidence.

VoiceLab extends this same Start authority without another lifecycle. Live synthesis uses the Start-proven MyVoice actor identity; actor disappearance/change/load/synthesis failure is fail-closed and requires a later Start rather than a silent fallback voice.""",
        "context-meeting-ownership",
    ),
    (
        "Required outbound AI Start readiness is generation-bound functional truth rather than preload-only truth. A5 provides `voice_actor_preflight` and `voice_actor_synthesize`, but Meeting still validates the pre-VoiceLab TTS task. A6 must replace only that TTS portion with approved `MyVoice` warm/cache + bounded functional synthesis while preserving generation-bound cache/invalidation semantics and the existing real ASR/translation checks.",
        "Required outbound AI Start readiness is generation-bound functional truth rather than preload-only truth. A6 uses `voice_actor_preflight` and `voice_actor_synthesize` for approved `MyVoice` warm/cache + bounded functional synthesis while preserving generation-bound cache/invalidation semantics and the existing real ASR/translation checks. Diagnostic generation `0` may prove functional setup readiness but cannot yield Live actor authority.",
        "context-runtime-readiness",
    ),
]
for old, new, label in context_replacements:
    context = replace_once(context, old, new, label)
CONTEXT.write_text(context, encoding="utf-8", newline="\n")

decisions = DECISIONS.read_text(encoding="utf-8")ndec_old = "The product decision and source ownership direction are approved. GPT-SoVITS V2ProPlus source supports few-shot fine-tuning, English inference, native V2ProPlus configuration, speaker-verification support, and reusable trained weight paths at the audited upstream revision. TranslateIT dependency compatibility, actual model training, speaker similarity, native inference latency, CUDA memory behavior, Meeting integration, and target audio delivery are not yet proven and must not be claimed from this decision alone."
dec_new = "VoiceLab source integration through A6 is now closed on `New`: one frozen WorkerRuntime graph owns GPT-SoVITS V2ProPlus build/inference, one approved `MyVoice` actor is promoted atomically, and Meeting Start/Live bind required outbound synthesis to the generation-proven actor identity without Piper/SAPI fallback. Final hosted Windows source proof is run `31773954105` at exact checkout SHA `d682f44d02ddd74a731b55bc1d0da6f738bf27f6`, with 28 Python tests, frontend validators/typecheck/build, `cargo check --locked`, 42 Rust tests, and read-only closure guard passing. Real model training from the user's recordings, speaker similarity/listening acceptance, target CUDA/VRAM behavior, real inference latency, packaged asset placement, and physical meeting-audio delivery remain target-Windows proof and must not be inferred from hosted source closure."
decisions = replace_once(decisions, dec_old, dec_new, "decision-d020-proof")
DECISIONS.write_text(decisions, encoding="utf-8", newline="\n")

subprocess.run(["git", "diff", "--check"], cwd=ROOT, check=True)
subprocess.run(["git", "add", "--", *EXPECTED], cwd=ROOT, check=True)
staged = sorted(subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines())
if staged != EXPECTED:
    raise RuntimeError(f"unexpected staged files: {staged!r}")
subprocess.run(["git", "config", "user.name", "TranslateIT Source Proof"], cwd=ROOT, check=True)
subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=ROOT, check=True)
subprocess.run(["git", "commit", "-m", "Close VoiceLab A6 source boundary"], cwd=ROOT, check=True)
subprocess.run(["git", "push", "origin", "HEAD:New"], cwd=ROOT, check=True)
print("A6_CANONICAL_CLOSE=PASS")

from pathlib import Path

root = Path(__file__).resolve().parents[1]
next_action = root / "docs/knowledge/next-action.md"
text = next_action.read_text(encoding="utf-8")
old = '''## Current Mode

**Developing / Pre-Local Readiness — C3 IMPLEMENTED, TARGET RUNTIME PROOF DEFERRED.** A1-A7, B1-B6, C1, and C2 remain closed at their proven boundaries. Required outbound Start now has generation-bound functional translation/TTS readiness rather than preload-only acceptance. The user still does not approve local-PC testing, so target device/CUDA/audio/latency evidence remains intentionally deferred.

## Next Step — Pre-Local Source Readiness Re-Audit

Perform one bounded source-only review against the current initial-core requirements and the post-C1/C2/C3 owners to confirm whether any non-hardware implementation gap still exists before target testing. Do not start local-PC testing, VAD tuning, installer staging, or speculative feature development during that review.'''
new = '''## Pre-Local Source Readiness Re-Audit — CLOSED / GAPS MAPPED

The bounded post-C1/C2/C3 source review found that the repository is substantially ready for target testing, but two non-hardware implementation waves remain before the source can truthfully be treated as pre-local complete.

**C4 — Functional Readiness Truth Closure.** PR-028 requires bounded functional validation of the actual ASR/translation/TTS path. C3 already executes real ID -> EN inference and real English TTS synthesis per helper generation, but its Start self-test still performs ASR model preload rather than ASR inference because no repository-owned speech fixture exists. The C3 success cache is also not part of the public helper/Meeting readiness projection: First Setup and returning Meeting can still label the required outbound path Ready from worker status/preload truth before the generation-bound functional self-test has succeeded, and a hard functional failure invalidates the cache without necessarily making that product readiness projection non-Ready. C4 must close both halves without adding a second readiness owner or running a full smoke on every status poll. Prefer reusing the already-generated bounded C3 TTS readiness WAV as the ASR inference fixture before deletion rather than adding an unrelated binary fixture, and keep quality/language-accuracy claims for target evidence.

**C5 — Atomic Outbound Activation Closure.** PR-053 requires Live only when the required outbound path is actually ready. Current native Meeting-output preparation resolves the exact virtual endpoint and validates its default output configuration, but it does not build/start a bounded native output stream before Live; the first actual stream build/start still occurs on the first synthesized utterance. In addition, the serialized Meeting outbound consumer is spawned only after `commit_application_meeting_session_live`, so a consumer spawn failure is rolled back after a transient Live commit rather than being part of the pre-Live transaction. C5 must add a silent/callback-only functional native output probe and move successful outbound-consumer creation before the Live commit while preserving authority-first rollback and at-most-once delivery.

The review did **not** promote device-name identity into another mandatory wave. Current audio preferences use sanitized CPAL device names as IDs and collapse duplicate display names; that is a determinism risk on systems exposing identical endpoint names, but the current product requirements do not require a Windows endpoint-GUID migration before the first controlled target test. Escalate it only if target hardware exposes an actual collision/rebind problem.

Everything else identified by the current requirements is either already implemented at source level or explicitly belongs to target/release evidence: physical microphone behavior, VB-Cable/meeting-app reception, optional incoming loopback/suppression, real NVIDIA CUDA execution, translation quality, CPU practicality, latency distribution, long-session stability, sleep/wake hardware behavior, private PythonRuntime/installer staging, and clean-machine acceptance. No VAD tuning or packaging work belongs in C4/C5.

## Current Mode

**Maintenance / Pre-Local Source Readiness — RE-AUDIT CLOSED, TWO IMPLEMENTATION WAVES REMAIN.** A1-A7, B1-B6, and C1-C3 remain closed at their proven boundaries. Local-PC testing is still deferred by user decision. C4 and C5 are source-level correctness closures, not target-hardware acceptance.

## Next Step — Pre-Local C4 Functional Readiness Truth Closure

Complete PR-028 at the existing helper/Meeting owners: make the generation-bound self-test execute real ASR inference as well as real ID -> EN inference and English TTS, and make product/Meeting readiness consume the functional cache truth so First Setup/returning Meeting cannot report functional Ready after an unverified or hard-failed generation. Keep Start eligibility usable without running the full self-test on routine polling, and do not change model quality/tuning, CUDA fallback policy, audio routing, installer staging, or local-PC proof.'''
if text.count(old) != 1:
    raise SystemExit(f"Expected one canonical C3 tail, found {text.count(old)}")
next_action.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")
print("Pre-local source re-audit state patched")

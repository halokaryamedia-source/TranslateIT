# TranslateIT — Next Action

## Current Mode

**Developing / VoiceLab A3 — Guided Recording + Accepted Take Persistence: CLOSED**

A1 single-runtime compatibility and A2 Voice Actor/build contracts remain closed. A3 now implements the first real VoiceLab user path without adding a second audio engine or starting GPT-SoVITS training work.

## A3 Result

The active source now provides one guided recording flow:

```text
backend-owned exact English line
-> voice-ownership confirmation
-> Record
-> existing Rust/CPAL microphone capture
-> mono capture sink
-> quality resampling to 32 kHz
-> PCM16 WAV review draft
-> Replay
-> Retry or Accept
-> CacheData/VoiceLab/Takes/take_<line-id>.wav
-> A2 dataset contract
```

VoiceLab is now present in the existing Svelte app/sidebar. Recording does not use browser `MediaRecorder`, `getUserMedia`, another CPAL stream, ASR labeling, imported-audio conversion, or another state framework. The optional guided sink is fed from the existing canonical microphone callbacks and is inert when no VoiceLab take is armed.

The first guided script currently contains 16 backend-owned English lines. This is an A3 capture/review corpus, **not** a claim that 16 lines are sufficient for high-fidelity Voice Actor training. A4 must decide/expand recording coverage from the real quality requirement instead of treating `16/16 accepted` as Voice Actor readiness.

Accepted take format remains the A2 contract:

```text
mono
PCM16
32,000 Hz
```

A hand-written linear resampler was rejected during A3 review because it was disproportionally weak for fidelity-first training data. A3 instead exact-pins `rubato = 0.16.2` and uses `FftFixedInOut` after capture. Rubato 0.16.2 was chosen because its MSRV remains compatible with the current Rust 1.77 project; newer Rubato generations would force unrelated Rust-version churn.

The Cargo lock was also reviewed critically. An initial broad `cargo generate-lockfile` result changed hundreds of unrelated dependency lines and was explicitly rejected. The final lock was restored to the accepted A2 baseline and resolved only the bounded Rubato dependency delta: 79 added lock lines / 0 removals relative to A2.

Recording lifecycle stays under the existing capture authority. Mic Test cannot start/stop a VoiceLab take, Meeting cannot claim the same microphone while capture ownership is active, navigation cannot leave VoiceLab while recording, and native process exit is fail-closed while a guided take is active.

Review semantics are intentionally small:

```text
Stop -> draft
Replay -> raw local WAV bytes through Tauri IPC
Retry -> delete draft only; previous accepted take survives
Accept -> replace the same line's accepted take with normal rollback on replacement failure
```

A3 only automatically blocks unmistakably silent/empty take evidence. It does not promote Mic Test heuristics, a clipping score, noise score, recording minutes, or an arbitrary quality number into Voice Actor policy. More nuanced training-data and speaker-quality acceptance belongs to A4 evaluation with real model/audio evidence.

A deadlock found during source review was fixed before closure: the pending-draft mutex is now released before a response rebuilds the VoiceLab state.

## Proof

Final hosted Windows source proof run `31711094448` completed successfully. The accepted log explicitly shows:

```text
npm ci -> PASS
svelte-check -> 0 errors / 0 warnings
Vite production build -> PASS
cargo check -> PASS
cargo test --no-run -> PASS
guided take deterministic tests -> 2 PASS / 0 FAIL
A3 ownership proof -> PASS
```

The guided tests prove a 48 kHz stereo fixture is downmixed and FFT-resampled to exactly 32,000 mono frames for one second, and that a silent fixture is marked unusable.

A prior run `31708868923` is **not** accepted as proof even though GitHub marked the job successful: its log contained Svelte type errors and the temporary workflow did not fail-fast between npm commands. A3 source was fixed and rerun; only `31711094448` is the accepted final A3 source proof.

Cargo-lock correction was separately established by run `31710755948`, which reported `A3_LOCK_DELTA_LINES=79` and produced the bounded corrected lock.

The temporary A3 lock workflow was deleted after use. Deleting the source-proof workflow was blocked by connector policy, so it was retired to a manual-only no-op instead of being bypassed with low-level Git mutation.

## Not Proven Yet

A3 source closure does **not** prove:

```text
physical microphone capture on the user's target PC
room / microphone recording quality
subjective replay quality
how much guided recording is actually required for high speaker fidelity
GPT-SoVITS pretrained asset loading
real fine-tuning / training cancellation
held-out generated speech
speaker similarity / voice fidelity
best-checkpoint selection
CUDA / VRAM practicality
trained-actor daily inference
Meeting custom-TTS latency / readiness
physical meeting-app audio delivery
installer / clean-machine behavior
```

No user-local-PC testing occurred.

One narrow bridge limitation remains: if the frontend cannot read VoiceLab state at all, the current lightweight bridge returns an empty display state. Active recording is still protected at native process-exit level. Do not build a generic frontend-state recovery framework solely for this edge; reconcile it when A4 adds the real long-running build/close lifecycle.

## Next Step

**VoiceLab A4 — GPT-SoVITS Voice Actor Build + Held-Out Evaluation**

Implement the smallest real build path that turns accepted guided recordings into a candidate Voice Actor using the pinned GPT-SoVITS V2ProPlus direction. Start by defining/expanding the guided English corpus needed for fidelity-first training; do not assume the current 16 A3 lines are sufficient.

A4 should then own only the responsibilities required to produce and judge a real candidate: exact English dataset preparation, earned GPT-SoVITS dependencies/assets, real cancellable build child lifecycle, native `gpt.ckpt + sovits.pth + reference.wav`, held-out generated samples, bounded speaker-similarity evidence when useful, user preview/approval, and A2 atomic promotion to `MyVoice`.

Do not integrate Meeting daily TTS in A4 unless real build/evaluation acceptance requires a tiny internal synthesis proof. Meeting inference/readiness remains the later canonical-worker integration step.
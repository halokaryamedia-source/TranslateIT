# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slices 1-5 are source-aligned. The canonical local AI runtime now has one persistent worker/project/scheduler path, caller-owned modes, scoped readiness, truthful translation input/output boundaries, and explicit English TTS voice selection.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> bounded live-audio/VAD finalization owner + direct Meeting consumer only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Rust compilation, TypeScript typecheck,
Python dependency resolution, Ruff/pytest execution, model inference/quality,
scheduler timing, CPU/CUDA behavior, Windows TTS/audio, and installed operation remain
`LOCAL PROOF REQUIRED`.

## Locked Engine Target

```text
Rust/Tauri product runtime
        |
        v
ONE helper scheduler / process bridge
        |
        v
ONE persistent Python worker
        |
        +-- ASR
        +-- Translation
        +-- TTS
        |
        v
product result / Meeting route
```

Do not reintroduce alternate workers, manual/rule translation fallback, duplicate
readiness/dependency owners, automatic cross-mode fallback, arbitrary TTS voice
selection, or another scheduler.

Svelte remains a later independent frontend architecture decision after Engine
contracts stabilize.

# Slices 1-4 — Closed

Current bounded source truth already established:

- standalone Text has one persistent-helper/base-worker path;
- manual/alternate/fake translation paths are retired;
- static installation evidence is distinct from worker runtime capability;
- normal Text readiness uses current Quality capability;
- Meeting readiness uses canonical `MeetingSessionPreflight`;
- Text explicitly requests `Quality`; Meeting outbound explicitly requests `Realtime`;
- one helper scheduler owns stdin/stdout and waiting priority is Meeting > Text >
  Diagnostics;
- Meeting generation is checked before execution and before result promotion;
- matching in-flight revoked Meeting inference may hard-cancel the worker process;
- translation source input uses `truncation=False` and rejects unverifiable/oversized
  model-token input instead of silently truncating;
- `pyproject.toml` is the one WorkerRuntime Python dependency/tooling owner;
- duplicate requirements/stack/CUDA-setup authorities are retired;
- Ruff + pytest are configured as the bounded Python source/deterministic proof layer;
- local smoke source uses one persistent process and privacy-bounded evidence.

Queue priority remains **non-preemptive** for a Text inference already in flight.
`uv.lock`, Ruff/pytest execution, runtime smoke, and performance remain later local
proof.

# Slice 5 — Closed Source Boundary

## A. Translation output completeness

Canonical worker translation no longer assumes that a non-empty decoded string is a
complete result.

Generation now requests structured output:

```text
model.generate(..., return_dict_in_generate=True)
-> sequences
-> EOS contract
-> generated token count
-> completion decision
```

Fail-closed behavior:

```text
missing/unreadable sequences
-> reject

EOS token unavailable
-> reject

sequence ends without EOS at max_new_tokens
-> translation:output_hit_token_ceiling_without_eos
-> reject

sequence ends without EOS before ceiling
-> translation:output_ended_without_eos
-> reject

verified terminal EOS
-> decode/promote result
```

Rejected/incomplete translation never becomes standalone Text success and cannot be
promoted into Meeting TTS by the existing outbound stage contract.

This is source correctness only. Real MarianMT/NLLB generation behavior, quality, and
completion rates remain local/model proof.

## B. Explicit English TTS selection

TTS readiness/synthesis now require an identified English-capable voice.

Piper:

```text
piper.exe
+ voice.onnx
+ matching voice.onnx.json
+ metadata language code is English
-> selectable
```

Filename alone is not accepted as language proof. `en-US` is preferred when
available; otherwise another verified English locale is chosen deterministically.

Windows SAPI:

```text
installed VoiceInfo Name + Culture
-> Culture = en / en-*
-> deterministic selection (en-US preferred)
-> SelectVoice(selected name)
-> synthesize
```

The implicit Windows default voice is not accepted as the outbound TTS selection
contract.

If neither provider exposes an explicit English candidate, TTS reports unavailable
rather than synthesizing with an arbitrary voice.

Actual installed voices, Piper assets, SAPI behavior, English intelligibility, audio
quality, and synthesis success remain `LOCAL PROOF REQUIRED`.

## C. Deterministic proof definitions / static regression guard

`WorkerRuntime/tests/test_worker_contract.py` now additionally defines tests for:

```text
non-EOS token-ceiling rejection
verified-EOS acceptance
English SAPI selection with en-US preference
Piper selection requiring English metadata
Piper filename-only language claim rejection
```

pytest is still **not executed** through this channel.

`validate_translation_flow_integrity.mjs` now statically guards:

```text
return_dict_in_generate
EOS completion check
non-EOS blocker paths
explicit English Piper/SAPI selection
SAPI SelectVoice
absence of first_piper_voice
```

This remains source-contract proof only.

## D. Persistent smoke evidence

`run_realtime_worker_smoke.ps1` keeps one worker process and its saved summary may now
record only safe completion/voice metadata such as:

```text
complete
finished_with_eos
generated_tokens
hit_token_ceiling
voice_id
language_code
```

Conversation bodies and runtime file paths remain excluded.

# Proof State

**CURRENT-PROJECT VERIFIED** at static source/tooling level:

1. incomplete/unverifiable translation generation cannot be promoted merely because
   decoded text is non-empty;
2. a non-EOS result reaching `max_new_tokens` has an explicit blocked state;
3. Piper voice selection requires English-capable metadata rather than arbitrary
   first-model selection;
4. SAPI selection requires English culture and synthesis explicitly selects the
   chosen voice;
5. worker capability TTS readiness follows the explicit-English selection contract;
6. deterministic test definitions and static regression markers cover the new
   boundaries;
7. local smoke evidence remains privacy-bounded.

No uv resolution, Ruff, pytest, worker smoke, model inference, TTS synthesis, build,
or Windows audio command was executed through this channel.

# Known Gaps Kept Truthful

- `uv.lock` and actual dependency resolution are not verified;
- Python/Rust/frontend compile/test execution is deferred to the later local phase;
- active Text inference remains non-preemptive when Meeting work arrives;
- actual translation model EOS behavior/completion rates are unmeasured;
- actual English Piper/SAPI voice availability and audio quality are unproved;
- model revision/checksum/source acquisition metadata remains incomplete;
- model quality, latency, RAM, and VRAM evidence has not been measured;
- Meeting Start remains fail-closed because finalized utterance production is not
  connected;
- incoming Meeting Sound remains unimplemented;
- approved tone/context still does not reach canonical inference.

# Hold

- do not create another AI worker, TTS service, scheduler, readiness store,
  dependency manifest, lint stack, or test framework;
- do not weaken EOS/voice checks to get a successful local result;
- do not fabricate `uv.lock` or resolved dependency versions;
- do not replace models before evaluation evidence requires it;
- do not redesign scheduler preemption, incoming Meeting, Svelte, or packaging in the
  next slice;
- do not start local Windows acceptance yet.

## Next Step

Return to the previously deferred **Finalized Outbound Utterance Producer** as the
next bounded implementation slice.

Target existing live-audio/VAD ownership only:

```text
rolling microphone audio
-> natural/adaptive speech boundary
-> partial speech remains preview/non-output
-> finalized utterance created once
-> assign session_id + generation + utterance_id
-> exactly-once final consumption
-> process_authoritative_finalized_outbound_wav
-> canonical ASR -> Realtime Translation -> English TTS -> Meeting route
```

Required safety:

- finalized utterance must belong to the currently authoritative Meeting generation;
- a finalized utterance must not be emitted twice;
- partial/rolling audio must never enter Translation/TTS;
- Stop/Pause/generation change must invalidate pending finalization cleanly;
- do not combine this slice with incoming Meeting Sound, full Meeting Live UI,
  scheduler preemption redesign, model benchmarking, Svelte, packaging, or local
  acceptance.

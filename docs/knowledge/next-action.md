# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slices 1-5 and the Finalized Outbound Utterance Producer are source-aligned. The canonical outbound source path now runs from application Meeting capture through audio-owned finalization into one serialized generation-aware AI/output consumer.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> normal Meeting frontend/runtime bridge + direct Start/Stop/Live consumers only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Rust compilation, TypeScript typecheck,
Python dependency resolution, Ruff/pytest execution, real microphone/VAD behavior,
model inference/quality, scheduler timing, CPU/CUDA behavior, Windows TTS/audio,
Meeting Microphone delivery, and installed operation remain `LOCAL PROOF REQUIRED`.

## Locked Runtime Target

```text
Application Meeting capture
        |
        +-> rolling audio / preview only
        |
        v
Audio-owned finalized utterance producer
        |
        v
session_id + generation + utterance_id
        |
        v
ONE serialized Meeting outbound consumer
        |
        v
ONE helper scheduler / persistent Python worker
        |
        +-> ASR
        +-> Realtime translation
        +-> explicit English TTS
        |
        v
TranslateIT Meeting Microphone route
```

Do not reintroduce alternate workers, AI loops, rolling-audio polling output,
manual/rule translation fallback, duplicate readiness/dependency owners, automatic
cross-mode fallback, arbitrary TTS voice selection, or another scheduler/finalizer.

Svelte remains a later independent frontend architecture decision; do not combine it
with the next Meeting runtime-wiring slice.

# Engine Consolidation Slices 1-5 — Closed Source Boundaries

Already established:

- one persistent Python AI worker path;
- fake/manual/alternate translation paths retired;
- static installation evidence separated from current worker capability;
- Text owns Quality and Meeting outbound owns Realtime;
- one helper scheduler owns worker stdin/stdout;
- waiting scheduler order is Meeting > Text > Diagnostics;
- stale Meeting generations are rejected before execution/result promotion;
- matching in-flight Meeting helper work can be hard-cancelled after authority revoke;
- translation input is never silently tokenizer-truncated;
- generated translation requires verifiable EOS completion;
- TTS requires an explicit English-capable Piper/SAPI voice;
- one WorkerRuntime `pyproject.toml` owns Python dependencies/tooling;
- Ruff/pytest source proof baseline exists without fake execution claims.

Queue priority remains **non-preemptive** for Text inference already in flight.
`uv.lock`, dependency resolution, Ruff/pytest execution, model/runtime quality, and
performance remain later local proof.

# Finalized Outbound Utterance Producer — Closed Source Boundary

## A. Separate rolling and final ownership

`audio/live_audio_buffer.rs` remains rolling/preview/diagnostic ownership.
`ready_for_target_asr_frame` is not treated as a final speech signal.

Application Meeting capture additionally feeds:

```text
audio/finalized_utterance.rs
```

Capture-only/developer session owners do not activate product finalized-output
production.

## B. Natural/adaptive finalization

The finalizer uses the existing Realtime VAD profile instead of introducing a second
fixed chunk policy.

Source flow:

```text
non-speech
-> bounded pre-roll
-> speech gate accepted
-> one in-progress utterance
-> speech continues
-> trailing non-speech accumulates
-> adaptive end-silence threshold satisfied
-> full speech portion revalidated
-> FINAL
```

End-silence adaptation is derived from the existing VAD profile plus the current
boundary energy. `target_chunk_min_ms` is only an upper bound for that adaptive
silence calculation, not a command to emit fixed chunks.

Internal queue/maximum-buffer bounds are fail-closed safety mechanics only. They do
not force a partial utterance to be called final; overlong/overloaded work is dropped
instead of fabricated into output.

Actual conversational boundary quality requires microphone/VAD proof later.

## C. Identity and exactly-once consumption

Each successfully finalized utterance receives:

```text
session_id
generation
utterance_id
```

The queue is consumed with one `pop_front()` owner. It is not a repeatedly readable
rolling snapshot.

A generation that is no longer authoritative clears producer state and cannot emit
new finalized output.

## D. Temporary finalized WAV

`live_segment_writer.rs` now has a separate finalized writer:

```text
FinalizedOutboundUtterance
-> unique final_<session>_g<generation>_u<utterance>.wav
-> 16 kHz mono PCM16
-> UserData/CacheData/audio_segments/
```

The inherited `latest_live_target_segment.wav` path remains diagnostic-only and is
not called by product Meeting output.

The serialized consumer removes the finalized source WAV after the AI/output attempt,
preserving temporary-audio privacy semantics.

## E. One serialized Meeting outbound consumer

`meeting_session.rs` owns one consumer thread for the authoritative generation:

```text
wait for finalized queue item
-> verify session/generation Live
-> write unique temporary WAV
-> process_authoritative_finalized_outbound_wav
-> remove temporary finalized WAV
-> wait for next final
```

No AI inference runs in CPAL callbacks or inside the audio finalizer.

`process_authoritative_finalized_outbound_wav` remains the canonical AI/output
boundary:

```text
final WAV
-> ID ASR
-> generation check
-> Realtime ID -> EN translation with completion check
-> generation check
-> explicit English TTS
-> generation check
-> guarded Meeting route
```

## F. Start / Stop source lifecycle

Backend Meeting preflight no longer has the inherited source blockers:

```text
meeting_session:finalized_utterance_source_not_connected
meeting_session:continuous_outbound_runtime_not_connected
```

because those source connections now exist.

Other real blockers still apply: microphone, required models/current helper
capability, Meeting Microphone route, and guarded route execution.

Transactional backend Start now opens capture, commits the generation Live, then
starts the serialized outbound consumer. Consumer-start failure revokes authority and
rolls resources back.

Stop remains authority-first:

```text
revoke generation
-> cancel route
-> stop capture + clear finalized state
-> cancel matching in-flight helper work
-> join serialized consumer
-> clear session/handoff
```

Pause/Resume is not implemented by this slice. Future Pause/Resume may use fresh
generation authority, but do not claim it exists yet.

# Static Proof State

**CURRENT-PROJECT VERIFIED** at source level:

1. application Meeting capture has a distinct audio-owned finalized producer;
2. rolling ASR-ready snapshots are not the product finalization source;
3. finalizer identity is `session_id + generation + utterance_id`;
4. queue consumption is one-shot rather than snapshot polling;
5. non-authoritative generations clear/reject pending finalization;
6. product Meeting uses unique finalized temporary WAVs, not the rolling diagnostic WAV;
7. one serialized consumer invokes the existing generation-aware AI/output boundary;
8. capture-only owners do not activate product finalization;
9. Stop source ordering releases waiting/in-flight outbound work after authority revoke;
10. static translation-flow validator guards the finalizer/consumer separation.

No Rust compile, static-validator execution, microphone/VAD run, filesystem WAV run,
model inference, route delivery, or race/Stop timing test was executed in this
channel.

# Known Gaps Kept Truthful

- actual CPAL callback cadence and VAD speech/end-boundary quality are unmeasured;
- adaptive silence thresholds and internal queue/safety limits are source mechanics,
  not production-tuned values yet;
- exactly-once and Stop-race behavior still require executable/runtime proof;
- backend Meeting Start/Stop commands exist, but normal frontend `runtimeApi` does not
  yet expose/use canonical `get/start/stop_meeting_session` commands;
- normal Meeting Ready screen still lacks the approved product Start -> Live wiring;
- global/cross-view Meeting session strip/state and Live transcript rendering remain
  incomplete;
- Pause/Resume remains unimplemented;
- incoming Meeting Sound and self-output suppression remain unimplemented;
- approved translation tone/context does not yet reach canonical inference;
- Meeting History after committed turns remains incomplete;
- Text Copy/direct Save remains incomplete;
- `uv.lock`/dependency resolution and model revision/checksum metadata remain incomplete;
- all compile/test/model/audio/performance/installed proof remains deferred locally.

# Hold

- do not tune VAD constants from source intuition alone;
- do not poll `live_target_segment_snapshot()` for product output;
- do not add another speech segmenter, capture pipeline, outbound loop, worker, or
  scheduler;
- do not add retries that can deliver one utterance twice;
- do not begin incoming Meeting Sound in the next slice;
- do not combine the next slice with Svelte migration, packaging, benchmark work, or
  local Windows acceptance.

## Next Step

Implement **Normal Product Meeting Start/Stop + Live State Wiring** using the existing
canonical backend lifecycle.

Bounded target:

```text
runtimeApi
-> expose get_meeting_session_status
-> expose start_meeting_translation
-> expose stop_meeting_translation

runtimeProductFacade
-> map canonical Meeting session action/status

Meeting Ready
-> Start Translation invokes transactional backend Start
-> success switches to existing/approved Live composition
-> failure preserves Ready/source state and surfaces product-level recovery

Meeting Live
-> status follows application-level session authority
-> Stop invokes canonical backend Stop
-> navigation does not create/stop a second session
```

Do **not** implement incoming Meeting Sound, full transcript/history completion,
Pause/Resume, Svelte migration, model benchmarking, packaging, or local acceptance in
that same slice. Those remain separate bounded tasks.

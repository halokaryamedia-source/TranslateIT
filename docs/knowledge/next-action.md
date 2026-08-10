# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Product scope is now deliberately reduced to a reliable translation core. The current source still contains deferred feature breadth and, more importantly, the current Meeting incoming EN -> ID request is incompatible with the worker's ID->EN-only Realtime model contract. Source simplification starts with the translation engine, then removes product dependencies that can make optional features block core translation.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/01-product-overview.md
-> docs/foundation/02-product-requirements.md
-> .agents/skills/development-brief/SKILL.md
-> .agents/skills/local-ai-runtime-development/SKILL.md
-> current translation worker + direct Meeting/Text callers
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

No local runtime proof is available in this channel. Rust/TypeScript/Python execution,
model loading/inference, translation quality, CUDA/CPU latency, Windows audio, rendered
UI, and installed operation remain `LOCAL PROOF REQUIRED`.

# Current Product Decision

Initial product is intentionally small:

```text
Meeting
├─ Start Translation
├─ final stable ID -> EN translated voice
├─ optional final EN -> ID incoming text
├─ transient current-session transcript
└─ Stop Translation

Text
├─ ID <-> EN
├─ Translate
└─ Copy

Settings
├─ Meeting
└─ Advanced / Diagnostics
```

Deferred from initial core:

```text
Pause / Resume
Push to Talk
Stop Voice
Speak Now / Cancel coordination
partial/evolving translated subtitles
Auto / Formal / Casual tone controls
Realtime / Quality user modes
conversation-context prompting
History / Saved
Audio Studio / custom voice
Document Translation
additional languages
incoming TTS
mid-session automatic Meeting Sound default-device rebind
```

The behavioral reference is Gemini 3.5 Live Translate only at the product level:
translation may stay a few seconds behind speech for completeness and should feel like
one simple live translation capability. Do not adopt Gemini cloud/model architecture by
implication.

# Primary Source Gap

Current worker:

```text
Realtime -> marianmt-id-en -> ID -> EN only
Quality  -> nllb-200-distilled-600M
```

Current Meeting incoming requests:

```text
mode = Realtime
source_language = en
target_language = id
```

The worker explicitly rejects that direction. Therefore incoming wiring exists but the
current EN -> ID Meeting translation path is not source-functional end-to-end.

# Developing Slice — Reliable Bidirectional Translation Core

## Goal

Make the translation engine contract smaller and internally consistent before pruning
secondary UI/runtime source.

## In scope

1. establish **one canonical bidirectional ID <-> EN translation behavior** for Meeting
   and Text using the existing worker/runtime architecture;
2. remove Meeting/Text caller dependence on user/product `Realtime` vs `Quality` mode;
3. keep model/provider selection internal and do not add a second worker/engine;
4. preserve no-silent-truncation and complete-output validation;
5. make optional incoming failure/suppression inability degrade/disable incoming rather
   than fail otherwise safe outbound TTS;
6. update static source-contract checks to reflect one bidirectional translation
   behavior;
7. after translation source is aligned, prune/disconnect stale product controls and
   persistence dependencies in a subsequent bounded slice rather than mixing all UI
   cleanup into the model patch.

## Out of scope for this first implementation slice

- local benchmark/model-quality acceptance;
- new downloaded model/provider not already grounded by repository assets;
- tone/context/glossary systems;
- History/Saved removal implementation;
- broad UI/navigation cleanup;
- Audio Studio cleanup;
- packaging/installer work.

## Acceptance criteria

1. Meeting outbound ID -> EN and optional incoming EN -> ID call the same canonical
   bidirectional translation behavior rather than a direction-incompatible mode split.
2. Standalone Text ID <-> EN uses that same behavior without Meeting context/audio
   dependencies.
3. Source is never silently truncated and known incomplete generation is not promoted.
4. Optional incoming/suppression failure cannot be the sole reason a safe outbound TTS
   delivery is rejected.
5. No second worker, translation store, context store, or provider-selection UI is
   introduced.

# Proof Budget

`ChatGPT -> GitHub` may prove:

- exact worker model-selection/routing source;
- both language-direction caller wiring;
- removal of product mode dependency;
- complete-output and no-truncation guards;
- optional-incoming failure policy;
- static regression definitions;
- canonical documentation consistency.

Still `LOCAL PROOF REQUIRED`:

- actual ID -> EN translation quality;
- actual EN -> ID translation quality;
- selected model load/inference success;
- target-PC latency/RAM/VRAM;
- ASR/TTS/audio route behavior;
- Windows Meeting Sound behavior;
- rendered UX and installed package.

# Hold

- do not add tone/context before bidirectional translation is proven;
- do not preserve Realtime/Quality as normal product concepts;
- do not create another translation worker/engine;
- do not silently fall back to cloud;
- do not allow optional incoming protection to block required outbound;
- do not broaden the first implementation slice into History/UI/packaging cleanup.

## Next Step

Implement **Reliable Bidirectional Translation Core** using the current worker and
direct Meeting/Text callers, then reconcile source-level proof and return to the next
bounded simplification slice.

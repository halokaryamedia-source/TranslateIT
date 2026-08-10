# TranslateIT Workspace Context

Updated: 2026-08-10  
Working branch: `New`  
Recovery baseline: `V1-Advance` at `6fd3485d6b22b9e3f44abc640241532aea61c3c7`

This file stores compact durable project context only. Detailed requirements belong
in `docs/foundation/02-product-requirements.md`; active continuation belongs in
`docs/knowledge/next-action.md`.

## Product Direction

TranslateIT is a Windows desktop application for **simple, reliable local Indonesian
<-> English translation**, primarily for online meetings.

```text
Required outbound
Indonesian speech
-> final Indonesian transcript
-> English translation
-> English TTS
-> TranslateIT Meeting Microphone

Optional incoming
English meeting speech
-> final English transcript
-> Indonesian translated text

Secondary utility
Indonesian <-> English Text
```

Current product priority is translation success before feature breadth. The user cited
Gemini 3.5 Live Translate as a behavioral reference: fluid live translation, simple
interaction, and willingness to stay a few seconds behind speech for completeness.
TranslateIT remains local-first and does not inherit Gemini's cloud/model/language
architecture.

## Initial Product Surface

Normal navigation is reduced to:

```text
Meeting
Text
Settings
```

Settings is reduced to:

```text
Meeting
Advanced -> Diagnostics
```

Meeting uses one normal lifecycle:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Initial core does **not** include Pause/Resume, Push to Talk, Stop Voice,
Speak Now/Cancel coordination, tone controls, user-facing Realtime/Quality modes,
conversation-context prompting, History/Saved, Audio Studio/custom voice, Documents,
additional languages, incoming TTS, or partial translated subtitles.

Existing source for deferred features is cleanup input, not current product permission.

## Translation Engine Contract

The initial product should expose **one canonical bidirectional translation behavior**:

```text
current utterance/text
-> local Indonesian <-> English translation
-> complete translated text or explicit failure
```

Normal users do not choose model/provider names or translation modes.

Current worker source is not yet aligned with this decision:

```text
Realtime -> MarianMT marianmt-id-en -> ID -> EN only
Quality  -> NLLB-200-distilled-600M -> multilingual/bidirectional-capable path
```

Current Meeting incoming asks the Realtime worker for EN -> ID, while the worker
explicitly rejects non-ID->EN Realtime directions. Therefore incoming wiring exists,
but the current EN -> ID Meeting path is **not source-functional end-to-end**.

The next implementation must remove the user/product dependency on the one-direction
Realtime/Quality split and establish one bidirectional ID <-> EN translation path.
Exact model/provider remains replaceable until local target-PC validation.

## Translation Quality Rules

Keep the quality contract small:

```text
1. preserve intended meaning
2. preserve names / numbers / dates / units / URLs / versions / technical facts
3. produce understandable natural target-language grammar
4. do not silently promote incomplete output
```

Current utterance/text is the initial model input. Previous Meeting turns, History,
Saved data, and standalone Text are not automatic model context.

Source text is not silently truncated. Known incomplete generation is rejected instead
of being presented as a completed translation.

## Speech / Meeting Boundary

Normal Meeting use is one explicitly started continuous listening mode.

Only finalized stable speech is normal translation/TTS/transcript truth. A small
post-speech delay is acceptable when it improves completeness. Partial/rolling ASR may
exist internally but is not normal translated output.

One application Meeting session owner remains. Session/generation/utterance authority
continues to reject stale asynchronous output. English TTS remains serialized.

`Stop Translation` remains a direct safety action and safe native close still delegates
to canonical Stop before the main window is destroyed.

## Optional Incoming

Physical microphone remains the required outbound capture source.
Meeting Sound remains a distinct optional output-loopback capture source.

Incoming may provide:

```text
EN speech -> EN ASR -> ID text
```

but must never block otherwise healthy outbound translation.

TranslateIT's own English TTS must not become incoming speech. If safe incoming
suppression/capture cannot be maintained, **incoming degrades/disables; required
outbound TTS continues**. This supersedes the current source behavior that may block
outbound when the suppression gate is unavailable.

Automatic mid-session Follow-Windows-Default Meeting Sound rebind is deferred until the
initial selected/default endpoint path is proven stable.

## Canonical Local Runtime

```text
Rust/Tauri desktop application
-> ONE helper scheduler / process bridge
-> ONE persistent realtime_local_worker.py
   ├─ ASR
   ├─ Translation
   └─ TTS
```

Resource priority stays:

```text
Meeting outbound
> Meeting incoming
> Text
> Diagnostics / setup
```

Queues remain bounded and stale work is discarded rather than surfaced late.

CUDA may accelerate runtime when validated. CPU remains supported truthfully; if it is
too slow for practical Meeting use, the product must report that rather than pretend
equivalent realtime performance.

## Current Source That Remains Useful

The following current owners remain useful to the simplified core:

- `engine/audio/live_capture.rs` — physical microphone capture;
- `engine/audio/finalized_utterance.rs` — finalized speech/event identity;
- `engine/audio/meeting_sound_capture.rs` — optional Meeting Sound loopback;
- `commands/meeting_session.rs` — canonical Meeting session/orchestration;
- one transient committed-turn store for current live transcript;
- `helper_bridge.rs` + `helper_bridge_runtime.rs` — one AI scheduler/worker bridge;
- `realtime_local_worker.py` — current ASR/translation/TTS worker;
- virtual Meeting Microphone route owners;
- global safe Stop/Close boundary;
- standalone Text translation path.

## Source To Simplify / Retire From Initial Flow

Current source still contains behavior now outside the initial product:

- Pause / Resume lifecycle and controls;
- Realtime vs Quality product/model split;
- tone-related UI/settings assumptions;
- automatic Meeting/Text History and Saved workflow;
- History Stop finalization dependency;
- History top-level navigation/settings;
- Audio Studio/custom voice initial-product assumptions;
- any future conversation-context path;
- complex conversational delivery controls if encountered.

Cleanup must prefer disabling/removing stale product paths over maintaining compatibility
layers that keep the old complexity alive.

## First Acceptance Gate

Before reconsidering deferred features, local Windows evidence is required for:

```text
microphone capture
stable final ASR
ID -> EN translation
EN -> ID translation
English TTS
Meeting Microphone delivery
optional incoming Meeting Sound behavior
safe Stop / Close
acceptable latency / stability
standalone Text ID <-> EN
```

Static source does not prove model/audio/device/rendered/installed success.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable context.
- `docs/foundation/` — current product/system policy.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.

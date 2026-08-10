# TranslateIT Workspace Context

Updated: 2026-08-11  
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

Translation success takes priority over feature breadth. Gemini 3.5 Live Translate is a
behavioral reference only: simple live use and a small completeness delay are preferable
to unstable instant output. TranslateIT remains local-first and does not inherit
Gemini's cloud/model/language architecture.

## Initial Product Surface

Normal navigation target:

```text
Meeting
Text
Settings
```

Settings target:

```text
Meeting
Advanced -> Diagnostics
```

Normal Meeting lifecycle:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

Initial core excludes Pause/Resume, Push to Talk, Stop Voice, Speak Now/Cancel,
partial translated subtitles, tone controls, user-facing Realtime/Quality modes,
conversation-context prompting, History/Saved, Audio Studio/custom voice, Documents,
additional languages, incoming TTS, and automatic mid-session Meeting Sound default-
device rebind.

Existing source for deferred features is cleanup input, not current product permission.

## Translation Engine Contract

The product exposes one canonical bidirectional behavior:

```text
current utterance/text
-> local Indonesian <-> English translation
-> complete translated text or explicit failure
```

Current worker source is direction-based inside the same persistent worker:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

`TRANSLATION_RUNTIME` is keyed by direction (`id->en`, `en->id`), not Realtime/Quality.
Current direct callers may temporarily still send/expect a `mode` field during staged
cleanup, but that compatibility label no longer chooses the translation model.

Required outbound worker readiness depends on ID -> EN. EN -> ID is separately visible
because incoming is optional and must not block otherwise healthy outbound Start.

The repository does **not** contain runtime proof that `marianmt-en-id` is installed,
loads successfully, translates well, or meets target-PC latency/memory. Those remain
local/release proof.

## Translation Safety Rules

Keep the quality contract small:

```text
1. preserve intended meaning
2. preserve names / numbers / dates / units / URLs / versions / technical facts
3. produce understandable natural target-language grammar
4. do not silently promote incomplete output
```

Current utterance/text is the initial model input. Previous Meeting turns, History,
Saved data, and standalone Text are not automatic model context.

Worker safeguards remain:

- max interactive translation text bound;
- tokenizer uses `truncation=False`;
- model/tokenizer input limit is checked;
- oversized input is rejected before inference;
- generated output must have verifiable normal EOS completion;
- known incomplete output is rejected instead of promoted to Text/TTS.

## Meeting Boundary

Normal Meeting use is one explicitly started continuous listening mode.

Only finalized stable speech is normal translation/TTS/transcript truth. A small post-
speech delay is acceptable for completeness. Partial/rolling ASR may exist internally
but is not normal translated output.

The application Meeting now has one normal authority path:

```text
Start
-> starting
-> Live
-> Stop
-> stopping
-> Ended / no active session
```

Pause/Resume commands, paused/resuming lifecycle states, fresh Resume generation, and
normal frontend Pause/Resume controls have been removed from the current application
Meeting path. Navigation between app views and normal minimize do not stop or pause the
Meeting; it remains application-level until explicit Stop or safe Stop & Close.

Session/generation/utterance authority continues to reject stale asynchronous output.
English TTS remains serialized. Stop revokes authority before resource/transient-state
cleanup and has no History persistence dependency.

## Optional Incoming

Physical microphone remains the required outbound source. Meeting Sound remains a
distinct optional output-loopback source.

Incoming target:

```text
EN speech -> final EN ASR -> canonical EN -> ID translation -> local text
```

TranslateIT's own English TTS must not become incoming speech, but optional incoming is
subordinate to required outbound.

Current source handles suppression failure as:

```text
self-output suppression unavailable
-> clear incoming finalized producer
-> stop Meeting Sound capture best-effort
-> mark incoming disabled/degraded
-> reject disabled incoming promotion
-> continue required outbound Meeting Microphone delivery
```

Healthy incoming uses the deterministic suppression guard around TranslateIT TTS
playback. Incoming helper/session promotion is valid only while the application Meeting
is Live.

Actual Windows suppression effectiveness, capture-stop timing, and mixed-audio behavior
remain local proof. Automatic mid-session Follow-Windows-Default Meeting Sound rebind is
deferred.

## Canonical Local Runtime

```text
Rust/Tauri desktop application
-> ONE helper scheduler / process bridge
-> ONE persistent realtime_local_worker.py
   ├─ ASR
   ├─ direction-based ID <-> EN Translation
   └─ TTS
```

Resource priority remains:

```text
Meeting outbound
> Meeting incoming
> Text
> Diagnostics / setup
```

Queues remain bounded and stale work is discarded rather than surfaced late. CUDA may
accelerate runtime when validated. CPU remains truthful degraded operation when it
cannot satisfy practical Meeting latency.

## Current Source That Remains Useful

- `engine/audio/live_capture.rs` — physical microphone capture;
- `engine/audio/finalized_utterance.rs` — finalized speech/event identity;
- `engine/audio/meeting_sound_capture.rs` — optional Meeting Sound loopback;
- `commands/meeting_session.rs` — canonical Start/Live/Stop Meeting orchestration;
- bounded transient committed turns — current-session transcript;
- `helper_bridge.rs` + `helper_bridge_runtime.rs` — one AI scheduler/worker bridge;
- `realtime_local_worker.py` — ASR / bidirectional translation / TTS worker;
- virtual Meeting Microphone route owners;
- global safe Stop/Close boundary;
- standalone Text translation path.

## Source To Simplify / Retire

Current source still contains behavior outside the initial product:

- remaining Realtime/Quality compatibility fields/caller assumptions;
- tone-related UI/settings assumptions;
- automatic Text History and Saved workflow;
- History top-level navigation/settings;
- Audio Studio/custom voice initial-product assumptions;
- any future conversation-context path;
- complex conversational delivery controls if encountered.

Meeting Stop no longer writes History, and Pause/Resume is no longer part of the
application Meeting runtime/product path.

Prefer actual removal/disconnection over compatibility layers that keep old complexity
alive.

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
safe Start / Stop / Close
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

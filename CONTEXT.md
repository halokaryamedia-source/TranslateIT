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

The active frontend follows:

```text
Meeting
Text
Settings
```

Normal Settings follows:

```text
Meeting
Advanced -> Diagnostics
```

History/Saved is not an active navigation/settings workflow. Successful Text translation
does not perform an automatic History write. Existing backend History/Saved source is
deferred/disconnected and is not a Meeting/Text success dependency.

Normal Meeting/Text UI does not present Tone or Realtime/Quality mode controls. Normal
users choose only the relevant Indonesian/English direction.

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
Worker compatibility aliases may remain for inherited Diagnostics/preload boundaries,
but normal product readiness and normal Meeting/Text requests do not use them to choose
translation behavior.

Product readiness consumes the worker direction fields directly:

```text
Meeting required outbound
-> translation_id_en

Optional incoming
-> translation_en_id
-> unavailable reverse direction must not block healthy outbound

Text
-> current source/target direction
-> matching translation_id_en or translation_en_id
```

Normal Meeting/Text translation requests send content and explicit language direction;
they do not send a user/runtime mode selector.

## Translation Model Inventory

Current declarative translation inventory matches the worker:

```text
marianmt-id-en
stage = translation_id_en
required = true
path = EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en
source = Helsinki-NLP/opus-mt-id-en
license = apache-2.0

marianmt-en-id
stage = translation_en_id
required = false
path = EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-en-id
source = Helsinki-NLP/opus-mt-en-id
license = apache-2.0
```

`required=false` on EN->ID is scoped to the required Meeting-outbound inventory gate; it
does not make Text EN->ID optional for product acceptance. The old NLLB Quality inventory
entry is removed.

Inventory/presence is installation evidence only. The repository does **not** prove that
either model is installed on a target machine, loads successfully, translates well, or
meets latency/memory requirements.

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

The application Meeting has one normal authority path:

```text
Start
-> starting
-> Live
-> Stop
-> stopping
-> Ended / no active session
```

Pause/Resume commands, paused/resuming lifecycle states, fresh Resume generation, and
normal frontend Pause/Resume controls are removed from the current application Meeting
path. Navigation between app views and normal minimize do not stop or pause the Meeting;
it remains application-level until explicit Stop or safe Stop & Close.

Session/generation/utterance authority rejects stale asynchronous output. English TTS is
serialized. Stop revokes authority before resource/transient-state cleanup and has no
History persistence dependency.

## Optional Incoming

Physical microphone remains the required outbound source. Meeting Sound remains a
distinct optional output-loopback source.

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

## Controlled Windows Release Direction

Initial distribution remains controlled Windows users with **one setup experience**.
One setup experience does not mean all large runtime/model bytes must live inside one
installer executable.

Current release direction is:

```text
TranslateIT release package
├─ TranslateIT_<version>_x64-setup.exe
└─ local payload/
   ├─ required runtime payload(s)
   ├─ ASR payload
   ├─ marianmt-id-en payload
   └─ marianmt-en-id payload
```

The Setup executable owns payload verification and placement. Normal users must not
manually install Python, uv, pip, Hugging Face models, or copy model folders.

The initial controlled release does **not** add a first-run internet downloader, generic
package manager, or cloud fallback. This keeps installation independent from first-run
network availability and keeps failure handling outside the translation session.

Release acceptance requires both Marian directions because Text ID<->EN is core. Meeting
runtime Start remains narrower: EN->ID alone may degrade incoming/reverse Text without
blocking healthy required ID->EN outbound.

## Installed Runtime And Writable Data Paths

The path foundation is now source-aligned through one `ProjectPaths` owner.

Packaged/Tauri mode:

```text
Tauri resource directory
-> runtime_root
-> worker/runtime/model/voice resources

Tauri app-local data directory
-> user_data_root
-> CacheData
-> LogData
-> SavedProject reservation
```

`app_bootstrap.rs` initializes the packaged context before normal runtime commands. The
resource and app-local roots must be absolute, and the canonical owner is initialized
once rather than rediscovered independently by each caller.

Repository development remains a distinct fallback:

```text
debug build only
+ verified repository markers
-> repository_development_fallback
```

Release builds do not promote repository probing into installed path truth. A release
process that reaches `ProjectPaths` before Tauri initialization sees only an explicitly
unverified bootstrap fallback.

Worker/model consumers now use the explicit canonical roots. Bootstrap passes
`TRANSLATEIT_RUNTIME_ROOT` and `TRANSLATEIT_USER_DATA_ROOT` to child processes from
`ProjectPaths`. The Python worker uses those roots for models and writable data and maps
existing relative `UserData/...` handoff labels into the app-local data root while still
enforcing allowed-root checks.

This is **not** installed proof. Tauri resource inclusion, app-local write behavior,
packaged model presence, child-process startup, and clean-machine launch remain local/
release acceptance work.

## Remaining Packaged Helper Gap

Current helper startup still accepts `.venv`, environment override, or system Python.
That remains useful development flexibility but is not an installed-user solution.
Installed builds must eventually ship an approved helper/Python runtime and must not ask
users to install Python manually.

The exact helper packaging/freezing method is intentionally deferred until the release
payload contract and staging boundaries are grounded.

## Reproducible Release Inputs

Git keeps metadata, not model bytes. Externally sourced release payloads should be
identified at minimum by:

```text
source/repo ID
immutable source revision/commit
expected installed target
prepared release payload/archive SHA-256
```

This release identity complements `model_manifest.json`; it must not create a second
model-selection owner. The exact release-artifact identity owner is the next planning
boundary.

## Current Source That Remains Useful

- active desktop shell/controller — Meeting / Text / Settings only, no normal Mode/Tone;
- direction-based product readiness in `runtimeProductFacade.ts`;
- `engine/audio/live_capture.rs` — physical microphone capture;
- `engine/audio/finalized_utterance.rs` — finalized speech/event identity;
- `engine/audio/meeting_sound_capture.rs` — optional Meeting Sound loopback;
- `commands/meeting_session.rs` — canonical Start/Live/Stop Meeting orchestration;
- bounded transient committed turns — current-session transcript;
- `helper_bridge.rs` + `helper_bridge_runtime.rs` — one AI scheduler/worker bridge;
- `realtime_local_worker.py` — ASR / bidirectional translation / TTS plus packaged/user
  root consumption;
- `model_manifest.json` — direction-based model identity/inventory metadata;
- `engine/paths.rs` — canonical packaged/development runtime and writable-data owner;
- `app_bootstrap.rs` — Tauri resource/app-local initialization boundary;
- `bridge_paths.rs` / `runtime_inventory.rs` — direct consumers of canonical roots;
- virtual Meeting Microphone route owners;
- global safe Stop/Close boundary;
- standalone Text translation without automatic History persistence or mode selection.

## Source To Simplify / Complete

Current source still contains behavior outside the initial product or gaps before an
installed release:

- no implemented release payload revision/hash contract yet;
- no implemented NSIS local sidecar payload staging yet;
- helper Python discovery still permits `.venv`/environment/system Python instead of a
  packaged installed runtime;
- backend History/Saved persistence source, disconnected from active frontend;
- Audio Studio/custom voice initial-product assumptions;
- any future conversation-context path;
- worker/Diagnostics compatibility labels only after their consumers are proven
  unnecessary;
- stale descriptive README content from superseded scope where encountered.

Prefer actual reconciliation over compatibility layers that keep old complexity alive.

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
installed launch without repository/manual Python/manual model placement
```

Static source, manifests, and package plans do not prove model/audio/device/rendered/
installed success.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable context.
- `docs/foundation/` — current product/system policy.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.

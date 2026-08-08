# TranslateIT Workspace Context

Status: context recovery in progress  
Working branch: `New`  
Recovery baseline: `V1-Advance` at `6fd3485d6b22b9e3f44abc640241532aea61c3c7`

This file stores only compact, durable facts that are sufficiently grounded for
new TranslateIT sessions. It is not a backlog, product requirements document,
implementation report, or reconstruction of old chat history.

During context recovery, inherited requirements and engineering reports remain
evidence until they are revalidated against current source and current product
intent.

## Current Working Posture

- `New` is the current working branch for recovering, reconciling, and continuing
  TranslateIT.
- `V1-Advance` is the inherited source baseline for this recovery effort.
- The repository default branch is not changed by this bootstrap work.
- Broad feature development, redesign, architecture replacement, and old TODO
  execution are intentionally deferred until enough project context is recovered.
- When old documentation conflicts with current user intent or current source,
  resolve the conflict explicitly rather than silently preserving the old rule.

## Recovered Product Direction

Current product direction was revalidated by the user on 2026-08-08:

- TranslateIT remains primarily a **real-time voice translation application for
  online meetings**.
- The intended primary product flow is speech input -> transcription ->
  translation -> translated voice output for use in a meeting context.
- Text translation remains a supported standalone workflow and should remain
  usable even when the voice pipeline is not ready.
- The current text-first `SimpleLauncherController` UI is treated as the present
  stabilization/usable workflow, not as evidence that the meeting-translation
  product purpose was intentionally replaced.
- Voice functionality is part of the product direction, but current source
  presence does not prove end-to-end voice readiness.

## Recovered Platform And Runtime Policy

Current platform/runtime policy was revalidated by the user on 2026-08-08:

- **Initial supported platform: Windows.** Windows is the only platform that must
  be supported and validated for the first product release target. This does not
  declare that TranslateIT must remain Windows-only forever.
- **Core runtime: local-first and offline-capable.** Once required runtime/model
  assets are installed, core ASR -> translation -> TTS behavior must not require
  a cloud translation/speech API for normal operation.
- Network access may still be used for setup, dependency/model acquisition, or a
  future explicitly approved optional cloud feature.
- A future cloud-assisted capability must remain optional and must not silently
  become a required dependency of the core meeting/text translation workflow.

## Recovered Language And Voice Direction Policy

Current launch language/voice direction was revalidated by the user on
2026-08-08:

- **Initial supported languages:** Indonesian and English only.
- **Text translation:** bidirectional Indonesian <-> English.
- **Primary outbound meeting voice:** Indonesian speech -> Indonesian transcript
  -> English translation -> English TTS/output for meeting use.
- **Primary inbound meeting assistance:** English speech -> English transcript ->
  Indonesian translation -> Indonesian text for the local user.
- **English speech -> Indonesian TTS is not an initial product requirement.** It
  may be added later if there is a real product need.
- Additional languages are future scope and must not be generalized into the
  initial product merely because a model can technically support more languages.

Current source is aligned with the launch pair at the UI level. The implementation
is currently asymmetric: realtime translation is optimized for ID -> EN, while
Quality/NLLB can cover the reverse direction; current local TTS evidence is also
English-oriented. Those are implementation/runtime facts, not permission to
change the approved product directions above.

## Recovered Voice Input And Segmentation Policy

Current voice input/segmentation behavior was revalidated by the user on
2026-08-08:

- **Primary input interaction: Session Listening.** The application does not
  listen merely because it is open. The user explicitly starts a voice session
  once; while that session is active TranslateIT continuously listens and uses
  speech detection to create utterance boundaries until the user explicitly
  stops the voice session.
- **Secondary input interaction: Push to Talk.** This remains an alternative for
  deliberate/manual capture.
- **Default Push-to-Talk hotkey: `Ctrl+Space`.** Avoid plain Space because it
  conflicts with normal typing and common UI interaction.
- **Speech segmentation is semantic, not a fixed timer contract.** TranslateIT
  should detect a meaningful natural pause, avoid cutting active words/speech
  unnecessarily, begin processing quickly after a valid utterance boundary, and
  handle longer speech without losing content.
- Inherited `700 ms` silence and `12 s` maximum segment values are **not permanent
  product requirements**.
- Silence duration, minimum speech duration, pre-roll, chunk sizes, maximum
  segment duration, VAD thresholds, and related numeric values are implementation
  parameters that must be tuned with target-PC latency/quality evidence.

## Recovered Latency And Runtime Mode Policy

Current latency/runtime-mode policy was revalidated by the user on 2026-08-08:

- **Official user-relevant voice latency metric:** detected end of an utterance ->
  first translated audio begins playing.
- The inherited `<= 1 second` objective is **not a hard current release
  requirement**. A numeric release threshold must be derived from target-PC
  benchmark evidence while keeping the experience responsive enough for natural
  online conversation.
- Supporting stage metrics such as ASR, translation, TTS, and playback-start
  latency should remain measurable for diagnosis, but they do not replace the
  official end-to-first-voice product metric.
- **User-facing runtime modes:** `Realtime` and `Quality`. `Fast` is not the
  canonical product term for the realtime-oriented mode.
- **Meeting voice default:** `Realtime`.
- **Standalone text default:** `Quality`.
- Runtime/profile selection may automatically choose a suitable local profile when
  a direction/workflow cannot be served by the preferred mode.
- Manual `Realtime` / `Quality` override may remain available in Settings.
- Model/provider names are not normal-user product modes.

## Recovered Acceleration And Provider Policy

Current GPU/fallback/provider policy was revalidated by the user on 2026-08-08:

- **NVIDIA CUDA is the preferred acceleration path**, especially for the Realtime
  meeting workflow, but an NVIDIA GPU is not an absolute product requirement.
- **CPU fallback is mandatory.** Standalone text translation must remain available
  on supported CPU-only systems when the local runtime is otherwise usable.
- Meeting voice may run on CPU when measured performance is usable. If CPU
  performance cannot meet the benchmark-derived Realtime requirement, the product
  must report a degraded/not-Realtime-ready state rather than pretend equivalent
  performance.
- Failure to meet local GPU/CPU performance must **not** trigger a silent cloud
  fallback. The local-first policy remains authoritative.
- Current ASR/translation/TTS implementations (including Faster-Whisper, Marian,
  NLLB, Piper, Windows SAPI, or custom voice profiles) are **replaceable
  implementation choices**, not permanent product identity.
- A replacement model/provider is acceptable when it preserves the approved
  local-first capability and improves or maintains required quality, latency,
  packaging, and supported-language behavior.
- Normal users should see capability/readiness states such as Ready, Degraded,
  Setup Needed, GPU Accelerated, or CPU Mode. Exact model IDs, provider names,
  compute types, CUDA backend details, and fallback reasons belong in Developer
  Diagnostics.
- Old Rust-only/no-Python CUDA planning is stale implementation history where it
  conflicts with the current single-engine Rust/Tauri + Python-helper direction.

## Recovered Meeting Audio Routing Policy

Current meeting-audio routing behavior was revalidated by the user on 2026-08-08:

- **Meeting output is translated English voice only** for the primary outbound
  workflow. Raw Indonesian microphone audio is excluded from the meeting-output
  route by default.
- The physical microphone remains available to TranslateIT as the capture source
  for ASR. A global Windows microphone mute is not required because it would also
  prevent TranslateIT from hearing the user.
- The normal product concept is a **TranslateIT-managed meeting microphone/audio
  route**. The user should be able to select a TranslateIT meeting microphone (or
  equivalent managed endpoint) in Zoom, Meet, Teams, or another meeting app.
- The underlying virtual-audio driver/provider is a replaceable implementation
  detail. TranslateIT does not require a specific third-party brand as product
  identity and does not require its own custom kernel/audio driver if a supported
  Windows route satisfies the experience.
- Original Indonesian voice and translated English TTS must not be mixed into the
  meeting by default. Any future bilingual/pass-through mode requires an explicit
  separate product decision.
- **Local translated-voice monitoring is optional, off by default, and volume is
  user-adjustable.** The inherited fixed `50%` monitoring level is not a product
  constant.
- If the virtual meeting route is unavailable, Meeting Voice becomes `Setup
  Needed`. TranslateIT must not silently fall back to the raw physical microphone,
  speaker playback, or cloud routing.
- Text translation, transcripts, and local translation/TTS preview should remain
  available when their own runtime dependencies are ready even if the meeting
  route is blocked.
- Initial meeting integration uses the standard Windows microphone-device model;
  Zoom/Meet/Teams-specific plugins or APIs are not required for the initial
  product.

Current source contains guarded virtual-device selection and a Python audio-route
provider that can target an existing virtual output device, but it repeatedly
marks this as source-side/guarded work rather than proof that meeting routing is
working on a target Windows machine. Actual meeting audio delivery remains `LOCAL
PROOF REQUIRED`.

## Recovered Translation Behavior And Tone Policy

Current translation-quality/tone behavior was revalidated by the user on
2026-08-08:

- TranslateIT is **contextual and meaning-preserving**, not a word-by-word
  translator.
- Translation priority is: preserve intended meaning -> preserve factual/entity
  fidelity -> produce natural target-language grammar -> preserve appropriate tone
  -> preserve literal wording only when useful.
- Names, numbers, dates, units, URLs, code identifiers, versions, acronyms, and
  technical facts must remain accurate.
- Mixed Indonesian/English input and Indonesian conversational/slang expressions
  should be handled naturally rather than mechanically translated token by token.
- Technical terms should remain untranslated when translating them would confuse
  or distort their accepted meaning.
- **User-facing tone modes:** `Auto`, `Formal`, and `Casual`; `Auto` is the default.
- `Auto` should preserve/infer the source tone naturally. `Formal` makes output
  professional, clear, and polite without adding facts. `Casual` makes output
  conversational without inventing slang or changing meaning.
- Tone overrides apply normally to outbound/user-authored translation. Inbound
  meeting assistance should preserve the other participant's source tone through
  Auto behavior by default rather than stylistically rewriting what they said.
- Recent conversation context may influence translation when it helps resolve
  pronouns, omitted subjects, repeated terminology, continuity, or tone, but must
  never override the current utterance or invent new facts.
- Translation context is **bounded, local, and session-scoped by default**. Resetting
  the translation session clears active model context unless a later explicit
  history feature deliberately restores selected context.
- `Realtime` remains contextual/semantically correct while using a latency-aware
  strategy; `Quality` may spend more time/context budget on nuance and naturalness.
- Exact prompt design, glossary mechanics, protected-term implementation, context
  window size, and model/provider strategy are implementation details rather than
  normal-user product settings.

Current source contains context-window structures and deterministic meeting/support
fallback phrases, but the inspected runtime does not yet prove general contextual,
slang, terminology, or tone behavior. Runtime translation quality remains `LOCAL
PROOF REQUIRED`.

## Verified Repository Areas

```text
TranslateIT/
├─ EngineData/
├─ DevelopingData/
├─ UserData/
├─ AGENTS.md
├─ CONTEXT.md
└─ README.md
```

### `EngineData/`

Current production/runtime source area inherited from `V1-Advance`.

The current single-engine recovery baseline is:

```text
user-facing desktop shell
→ EngineData/Frontend/RustApp
→ Rust/Tauri

internal helper runtime
→ EngineData/Backend/LocalWorker/WorkerRuntime
→ Python

runtime contracts
→ EngineData/Backend/RuntimeContracts
```

These paths exist in `New`. Their presence does not by itself prove live runtime
readiness.

### `DevelopingData/`

Development-only material. Existing reports/plans/audits are recovery evidence
until classified and must not be treated as production source or automatic current
policy.

### `UserData/`

```text
UserData/CacheData/    → disposable runtime/session cache
UserData/LogData/      → logs, diagnostics, validation evidence
UserData/SavedProject/ → user-approved saved project/session outputs
```

Do not place engine source or project documentation under `UserData/`.

## Current Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

- Rust/Tauri owns the user-facing application direction.
- Python is an internal helper runtime, not a second product shell.
- Do not create V2/V3/V4, a legacy revival, alternative launcher, or parallel
  runtime without a new explicit product/architecture decision.
- Source implementation and live runtime proof remain different claims.

## Current UI/Implementation Shape

Current `New` frontend entrypoint instantiates `SimpleLauncherController`.
The present UI treats text translation as the immediately usable workflow and
voice as setup-gated. This is implementation posture only; meeting voice remains
the approved primary product direction.

## Current Evidence Boundary

Do not carry forward the old `38%` readiness estimate as a current fact.
Until deliberate target-environment validation occurs, do not claim proof for:

- target-PC application readiness;
- successful end-to-end microphone capture;
- local ASR/model readiness or quality;
- local translation-model readiness, contextual quality, or tone quality;
- TTS/provider quality;
- virtual meeting-microphone/audio routing;
- end-to-end meeting translation latency;
- installer readiness;
- CUDA behavior/performance on the target machine;
- save/persistence behavior beyond current source and direct proof.

Use the evidence labels defined by `AGENTS.md` when these distinctions matter.

## Inherited Product Claims Requiring Revalidation

The following still require separate recovery before becoming durable `New`
requirements:

- document, history, saved-session, privacy/data-retention, and Audio Studio scope
  beyond confirmed translation workflows;
- installer/distribution details including `TranslateIT.setup.exe`;
- final normal-user versus developer-diagnostic UI exposure beyond the approved
  provider/readiness boundary.

## Canonical Terms During Recovery

- **Working branch** — `New`.
- **Recovery baseline** — inherited `V1-Advance` source at the branch point.
- **Primary use case** — real-time voice translation for online meetings.
- **Secondary text workflow** — standalone local Indonesian/English translation.
- **Initial supported platform** — Windows for the first release target.
- **Local-first core** — core ASR, translation, and TTS run without required cloud
  APIs after required assets are installed.
- **Launch language pair** — Indonesian and English.
- **Outbound meeting voice** — Indonesian speech translated into English voice.
- **Inbound meeting assistance** — English speech translated into Indonesian text.
- **Session Listening** — explicit user-started continuous listening/VAD session.
- **Push to Talk** — secondary manual capture using `Ctrl+Space` by default.
- **Segmentation parameters** — runtime tuning, not fixed product constants.
- **Official voice latency** — detected utterance end -> first translated audio.
- **Realtime** — latency-oriented mode; normal meeting-voice default.
- **Quality** — quality-oriented mode; normal standalone-text default.
- **Preferred acceleration** — CUDA when available and validated; not a required
  GPU brand constraint.
- **CPU fallback** — required local degraded path; capability does not imply
  Realtime-equivalent performance.
- **Implementation provider/model** — replaceable internal choice, not product
  identity.
- **TranslateIT meeting microphone** — product-level virtual meeting input/audio
  route carrying translated English voice; underlying provider is replaceable.
- **Original microphone route** — physical microphone remains capture input but is
  excluded from meeting output by default.
- **Local monitoring** — optional translated-voice preview, off by default and
  user-adjustable.
- **Translation tone** — `Auto`, `Formal`, or `Casual`; `Auto` is default.
- **Translation context** — bounded local context for the active session, not
  automatic persistent memory.
- **Desktop shell** — `EngineData/Frontend/RustApp`.
- **Helper runtime** — `EngineData/Backend/LocalWorker/WorkerRuntime`.
- **Runtime contract** — machine-readable runtime/architecture contract; not
  automatic live proof.
- **Inherited documentation** — pre-`New` recovery evidence until reconciled.
- **Current source** — source present on `New` for the inspected boundary.
- **Current proof** — evidence actually obtained in the relevant environment.

## Do Not Store Here

Do not use `CONTEXT.md` for current task status, detailed implementation plans,
backlogs, source maps, test logs, long audits, historical narratives, temporary
assumptions, or copied product requirements.

The active continuation owner is `docs/knowledge/next-action.md`.
from pathlib import Path

path = Path("CONTEXT.md")
text = path.read_text(encoding="utf-8").replace("\r\n", "\n")


def replace_exact(old: str, new: str, label: str) -> None:
    global text
    if text.count(old) != 1:
        raise RuntimeError(f"{label}: expected one stale block, found {text.count(old)}")
    text = text.replace(old, new, 1)


replace_exact(
'''### Current implementation gap

The active `New` source **does not yet implement VoiceLab**. Current frontend source still contains only First Setup / Meeting / Text / Settings, and current worker TTS still uses the pre-VoiceLab English TTS route. Policy now requires that route to be replaced by the trained Voice Actor path before source closure is restored.

Do not report VoiceLab as implemented until source/runtime proof establishes it.
''',
'''### Current implementation state

The active `New` source implements VoiceLab creation through A4 and canonical-worker trained-actor inference through A5. Guided recording, build/evaluation, explicit `MyVoice` approval/promotion, actor-package revalidation, cached GPT-SoVITS V2ProPlus runtime reuse, and bounded English `voice_actor_synthesize` are source-closed.

Meeting is intentionally **not migrated yet**. Existing Meeting `tts_preflight` / `synthesize` remain pre-VoiceLab until A6 replaces only that TTS portion inside the existing atomic Start transaction. Hosted source proof does not establish target speaker fidelity, CUDA/VRAM practicality, real inference latency, packaged asset placement, or physical meeting-audio delivery.
''',
"implementation-state",
)

replace_exact(
'''VoiceLab may require long-running training work, but this is a build operation producing an actor for the same GPT-SoVITS engine family. The current architecture preference remains one application-local Python runtime/dependency graph. A second packaged Python environment is not pre-authorized and may be reconsidered only if exact compatibility proof shows the one-runtime approach is infeasible.
''',
'''VoiceLab long-running training is a bounded one-shot build operation producing an actor for the same GPT-SoVITS engine family. A4/A5 preserve one application-local Python runtime/dependency graph and one existing daily worker; there is no second packaged Python environment or second daily inference owner.
''',
"runtime-architecture",
)

replace_exact(
'''Current implemented owner graph remains:

```text
src/main.ts
-> one Svelte mount
-> src/App.svelte
   ├─ pages/FirstSetup.svelte
   ├─ pages/Meeting.svelte
   │  └─ components/meeting/MeetingActivity.svelte
   ├─ pages/Text.svelte
   └─ pages/Settings.svelte

components/layout/Sidebar.svelte
components/ui/StatusBadge.svelte
components/ui/StatusRow.svelte

styles/tokens.css
styles/app.css

src/app/bridge/runtimeApi.ts
src/app/bridge/runtimeProductFacade.ts
-> retained Tauri/product runtime boundary
```

VoiceLab is approved but **not yet present in this active source graph**. When implemented it must extend the same Svelte application/bridge architecture rather than create a second frontend shell.
''',
'''Current implemented owner graph remains:

```text
src/main.ts
-> one Svelte mount
-> src/App.svelte
   ├─ pages/FirstSetup.svelte
   ├─ pages/Meeting.svelte
   │  └─ components/meeting/MeetingActivity.svelte
   ├─ pages/Text.svelte
   ├─ pages/VoiceLab.svelte
   │  └─ components/voice-lab/VoiceLabBuild.svelte
   └─ pages/Settings.svelte

components/layout/Sidebar.svelte
components/ui/StatusBadge.svelte
components/ui/StatusRow.svelte

styles/tokens.css
styles/app.css

src/app/bridge/runtimeApi.ts
src/app/bridge/runtimeProductFacade.ts
src/app/bridge/voiceLabApi.ts
src/app/bridge/voiceLabBuildApi.ts
-> retained Tauri/product runtime boundary
```

VoiceLab extends the same Svelte application and bridge architecture; it does not create a second frontend shell or product-state owner.
''',
"frontend-owner-graph",
)

replace_exact(
'''- Current source has not yet migrated from the pre-VoiceLab TTS implementation; this is an implementation gap, not an approved fallback policy.
''',
'''- A5 now implements approved `MyVoice` inference inside the canonical worker, but Meeting still invokes the pre-VoiceLab TTS tasks until A6 atomically replaces that TTS portion; this is an implementation gap, not an approved fallback policy.
''',
"translation-tts-state",
)

replace_exact(
'''VoiceLab may justify one bounded command/module owner for its long-running build lifecycle after the compatibility gate closes. It must not create a generic service framework, model registry, second settings store, second worker launcher, or alternate readiness owner.
''',
'''VoiceLab now has the bounded `voice_lab_build.rs` build-process owner plus A5 inference tasks in the existing canonical Python worker. This does not create a generic service framework, model registry, second settings store, second daily worker launcher, or alternate readiness owner.
''',
"rust-backend-owner",
)

replace_exact(
'''Required outbound AI Start readiness is generation-bound functional truth rather than preload-only truth. Current source still validates the pre-VoiceLab ASR/translation/TTS path. VoiceLab implementation must replace only the TTS part of that readiness contract while preserving generation-bound cache/invalidation semantics and the real ASR/translation checks.
''',
'''Required outbound AI Start readiness is generation-bound functional truth rather than preload-only truth. A5 provides `voice_actor_preflight` and `voice_actor_synthesize`, but Meeting still validates the pre-VoiceLab TTS task. A6 must replace only that TTS portion with approved `MyVoice` warm/cache + bounded functional synthesis while preserving generation-bound cache/invalidation semantics and the existing real ASR/translation checks.
''',
"meeting-readiness",
)

replace_exact(
'''Those proofs do **not** prove VoiceLab training, GPT-SoVITS dependency compatibility, speaker fidelity, trained actor reuse, native custom-TTS latency, CUDA behavior, physical microphone behavior, Meeting virtual-audio routing, real Meeting-app reception, sleep/wake behavior during a live session, installer placement, or clean-machine execution.

Before release, remaining proof/materialization now includes:

```text
VoiceLab source + dependency/build/inference integration
real trained Voice Actor quality and rebuild acceptance
post-setup runtime-state projection together with deferred device/model acceptance
private PythonRuntime packaging + GPU-capable CUDA execution proof
Windows Meeting audio/device validation
Start / Stop / Safe Close / power lifecycle runtime acceptance
trained Voice Actor latency / stability / long-session measurement
installer / installed-runtime proof
clean-machine proof
```
''',
'''Separate hosted Windows proofs now establish the VoiceLab A4 build/evaluation source boundary and A5 canonical-worker trained-actor inference source boundary. They still do **not** prove real target `MyVoice` quality, target GPT-SoVITS asset placement, CUDA/VRAM practicality, actual custom-TTS latency, physical microphone behavior, Meeting virtual-audio routing, real Meeting-app reception, sleep/wake behavior during a live custom-voice session, installer placement, or clean-machine execution.

Before release, remaining proof/materialization now includes:

```text
A6 Meeting atomic custom-TTS readiness/integration
final source closure audit
real trained Voice Actor quality and rebuild acceptance on target Windows
post-setup runtime-state projection together with deferred device/model acceptance
private PythonRuntime + GPT-SoVITS asset packaging and GPU-capable CUDA execution proof
Windows Meeting audio/device validation
Start / Stop / Safe Close / power lifecycle runtime acceptance
trained Voice Actor latency / stability / long-session measurement
installer / installed-runtime proof
clean-machine proof
```
''',
"deferred-proof-boundary",
)

path.write_text(text, encoding="utf-8", newline="\n")

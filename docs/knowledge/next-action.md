# TranslateIT — Next Action

## Current Mode

**Plan / P3 Runtime Packaging Source Closed — MEETING AUDIO PROVIDER DELIVERY DECISION REQUIRED**

VoiceLab A1 through A6 and the pre-local VoiceLab quality audit remain source-closed. Target/local Windows validation remains explicitly deferred by the user.

P3 now closes the deterministic **application/runtime/model packaging source contract** without pretending that an installer, staged private runtime, model execution, or clean-machine installation has been proven.

## P3 Result

The controlled Windows release source path is now:

```text
controlled release payload staging
-> release payload preflight
-> scripts/build_release.ps1
-> Tauri build with src-tauri/tauri.release.conf.json overlay
-> NSIS bundle input
```

The release overlay maps only the approved runtime payload into the same installed layout consumed by `ProjectPaths`:

```text
EngineData/Backend/
├─ LocalWorker/
│  ├─ WorkerRuntime/
│  │  ├─ realtime_local_worker.py
│  │  ├─ voice_lab_build.py
│  │  ├─ voice_lab_gpt_sovits.py
│  │  ├─ voice_lab_upstream_stage.py
│  │  └─ model_manifest.json
│  └─ PythonRuntime/
│     └─ python.exe
└─ RuntimeAssets/
   ├─ ASR/ModelData/
   ├─ Translation/ModelData/
   └─ Voice/GPTSoVITS/
```

Packaged mode resolves only the private `PythonRuntime/python.exe`. Repository `.venv`, environment override, or system Python remain development-only and cannot silently become installed-product fallbacks.

The release map intentionally does not bundle the whole repository or whole WorkerRuntime. Tests, development setup/smoke scripts, `.venv`, `DevelopingData`, user data, and unrelated GPT-SoVITS WebUI/server/UVR/ASR tooling are not approved release runtime inputs.

## Release Payload Gate

`scripts/validate_release_payload.mjs` fails closed before the installer build when required release inputs are missing or invalid. It verifies:

```text
private PythonRuntime/python.exe
required release models from model_manifest.json
pinned GPT-SoVITS revision marker
GPT-SoVITS source/pretrained boundary
FFmpeg
required local NLTK data
absence of known unapproved GPT-SoVITS WebUI/server/auxiliary payload
```

Large/private runtime and model bytes remain controlled release inputs outside Git. Source-control presence is not used as a substitute for release staging.

## Accepted P3 Hosted Proof

Final P3 source proof:

```text
run 31779152717
exact checkout SHA 027412c88f602be5ade4a7ebac6f2bb99e4307ab
Windows Server 2022
P3 package/resource-map contract -> PASS
normal source validation -> PASS
svelte-check/typecheck -> PASS
frontend production build -> PASS
cargo check --locked -> PASS
missing controlled release payload -> correctly FAIL-CLOSED
read-only git diff closure guard -> PASS
```

The negative payload proof specifically confirmed that a checkout without the controlled private Python/model payload cannot be promoted into a release build silently.

## Remaining Release Boundary

P3 does **not** prove:

```text
actual private PythonRuntime bytes
actual ASR/translation/GPT-SoVITS payload staging
successful NSIS installer generation
installed runtime execution
clean-machine installation
CUDA/VRAM/model execution
real MyVoice training/synthesis quality
physical Meeting audio delivery
Zoom/Meet/Teams reception
```

These remain release/target evidence and local validation is still deferred by the user.

## Decision Blocker — Meeting Audio Provider Delivery

The current Meeting route source can detect and use an already-installed matched virtual-audio cable pair such as a supported VB-Audio/Voicemeeter/functionally-equivalent endpoint. It does not own or install a custom audio driver/provider.

Product requirements also require one normal installer/setup experience and Meeting-audio route support. The repository has **not** approved which virtual-audio provider may be distributed, how its licensing permits redistribution/install, or whether TranslateIT should provision a different supported endpoint.

Do not silently bundle VB-Cable, Voicemeeter, another third-party driver, or invent a custom driver to make the release appear complete. That is a product/distribution decision, not a source implementation detail.

## Deferred Target Windows Boundary

Target/local proof remains deferred and still includes:

```text
real release payload staging and installer generation
installed private PythonRuntime execution
real model load/training/synthesis
speaker fidelity/listening acceptance
CUDA/VRAM practicality and CPU behavior
cold/warm latency and longer-session stability
physical Meeting Microphone route behavior
meeting-application reception
safe installed Stop/Close/power lifecycle
clean-machine execution
```

## Next Step

**Resolve the Meeting audio provider distribution policy before expanding installer source further.**

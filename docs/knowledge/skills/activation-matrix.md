# Skill Activation Matrix

This file answers **when to route into a project skill**. Root `AGENTS.md` owns the
budget and rules; `skill-map.md` owns inventory/boundaries.

## Core Rule

```text
Non-trivial Developing
-> development-brief
-> zero or one project specialist
```

Maintenance does not require `development-brief`; after root-cause diagnosis it
may use at most one specialist when the diagnosed cause sits inside that semantic
boundary.

Context Recovery and Plan use no project specialist by default.

## Routing

| Current semantic / acceptance boundary | Route |
|---|---|
| Non-trivial approved product behavior create/change | `development-brief` |
| Desktop shell, navigation/workspaces, product readiness/state mapping, desktop settings integration, desktop/runtime facade, Normal UI vs Developer Diagnostics | `desktop-runtime-development` |
| Local ASR/translation/TTS inference, model/provider lifecycle, Realtime/Quality execution, CUDA/CPU behavior, inference context/tone, AI helper/worker orchestration | `local-ai-runtime-development` |
| Physical mic capture, PTT/Session Listening capture mechanics, VAD/segmentation, Windows devices, monitoring, virtual meeting route, TranslateIT Meeting Microphone delivery | `windows-audio-runtime-development` |
| Windows installer/package, bundled helper/Python runtime, dependencies/models/TTS assets, installed resource layout, audio-provider delivery, clean-machine deployment | `release-packaging-development` |

## Selection Test

Before loading a specialist ask:

1. What exact behavior/contract is being changed or is wrong?
2. Which owner would remain responsible if the implementation language/framework
   changed?
3. Does the specialist add domain-specific reusable judgment not already supplied
   by `AGENTS.md` + `development-brief`?
4. Is one specialist sufficient for the current acceptance boundary?

If no specialist adds material value, use `development-brief` alone.

## Multi-Domain Symptoms

Choose the **cause/current acceptance boundary**, not the file where the symptom
appears.

Examples:

```text
AI reports route_missing correctly, desktop shows Ready
-> desktop-runtime-development

device discovery/route detection itself is wrong
-> windows-audio-runtime-development

valid speech segment exists, ASR never handles it
-> local-ai-runtime-development

runtime works in development, packaged helper is missing
-> release-packaging-development
```

If investigation discovers a second independent problem, finish/reframe the
current boundary and create a separate bounded task. Do not stack specialists.

## Do Not Route By Technology

Do not select/create a project skill merely because a task touches:

```text
Rust
TypeScript
Python
Tauri
CUDA
Windows API
a named library/provider/model
```

Technology-specific review/diagnostic/research capabilities may be used
conditionally from the environment, but they are not additional TranslateIT
semantic specialists.

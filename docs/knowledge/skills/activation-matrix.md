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

Support skills do not own semantic behavior and do not count as additional project
specialists. Use them only when their review/research/communication function is
material to the task; do not stack them automatically.

## Project Specialist Routing

| Current semantic / acceptance boundary | Route |
|---|---|
| Non-trivial approved product behavior create/change | `development-brief` |
| Desktop shell, navigation/workspaces, product readiness/state mapping, desktop settings integration, desktop/runtime facade, Normal UI vs Developer Diagnostics | `desktop-runtime-development` |
| Desktop visual hierarchy, layout/composition, spacing/density, typography, color/tokens, component visual states, reference-image analysis, responsive composition, motion/micro-interactions, rendered visual acceptance | `desktop-ui-design-development` |
| Local ASR/translation/TTS inference, model/provider lifecycle/evaluation, Realtime/Quality execution, CUDA/CPU behavior, inference context/tone, AI helper/worker orchestration | `local-ai-runtime-development` |
| Physical mic capture, PTT/Session Listening capture mechanics, VAD/segmentation, Windows devices, monitoring, virtual meeting route, TranslateIT Meeting Microphone delivery | `windows-audio-runtime-development` |
| Windows installer/package, bundled helper/Python runtime, dependencies/models/TTS assets, installed resource layout, audio-provider delivery, clean-machine deployment | `release-packaging-development` |

## Support Skill Routing

| Need | Support skill | Boundary |
|---|---|---|
| Action-first output, bounded steps, visible progress, one next action | `i-have-adhd` | Communication/execution shape only; never changes proof or semantic ownership. |
| Evaluate whether a new Rust crate/tool is genuinely needed and identify a bounded candidate | `awesome-rust-research` | Candidate discovery only; Awesome Rust is an index, final evidence comes from primary sources. Do not invoke for ordinary Rust edits. |
| Audit/edit AI-like filler, fake confidence, fake readiness, duplicate owners, placeholder success, over-abstraction, or evidence inflation | `no-ai-slop` | Review filter only; it does not decide architecture independently of current owners/evidence. |

## Selection Test

Before loading a specialist ask:

1. What exact behavior/contract is being changed or is wrong?
2. Which owner would remain responsible if the implementation language/framework
   changed?
3. Does the specialist add domain-specific reusable judgment not already supplied
   by `AGENTS.md` + `development-brief`?
4. Is one specialist sufficient for the current acceptance boundary?

If no specialist adds material value, use `development-brief` alone.

Before loading a support skill ask whether it changes the quality of the current
output/research/review without becoming another owner. If not, do not load it.

## Multi-Domain Symptoms

Choose the **cause/current acceptance boundary**, not the file where the symptom
appears.

Examples:

```text
AI reports route_missing correctly, desktop shows Ready
-> desktop-runtime-development

device discovery/route detection itself is wrong
-> windows-audio-runtime-development

navigation semantics are correct, but visual hierarchy/spacing/motion is poor
-> desktop-ui-design-development

valid speech segment exists, ASR never handles it
-> local-ai-runtime-development

runtime works in development, packaged helper is missing
-> release-packaging-development
```

If investigation discovers a second independent problem, finish/reframe the
current boundary and create a separate bounded task. Do not stack specialists.

## External Documentation Helpers

Context7 or another current-documentation retrieval tool may be used conditionally
when a version-sensitive third-party API/library is material to the task. It is not
a project specialist. Official documentation or primary source remains the final
external authority for material contracts.

## Do Not Route By Technology

Do not select/create a **project specialist** merely because a task touches:

```text
Rust
TypeScript
Python
Tauri
CSS
CUDA
Windows API
a named library/provider/model
```

`awesome-rust-research` is an explicitly approved support exception for bounded
external Rust ecosystem discovery. It still must not activate merely because source
is written in Rust.

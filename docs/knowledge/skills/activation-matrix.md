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

Communication shaping, anti-slop review, research, profiling, testing, and other
tooling techniques are conditional procedures. They do **not** add another project
skill to the stack.

## Project Specialist Routing

| Current semantic / acceptance boundary | Route |
|---|---|
| Non-trivial approved product behavior create/change | `development-brief` |
| Desktop shell, navigation/workspaces, product readiness/state mapping, desktop settings integration, desktop/runtime facade, Normal UI vs Developer Diagnostics | `desktop-runtime-development` |
| Desktop visual hierarchy, layout/composition, spacing/density, typography, color/tokens, component visual states, reference-image analysis, responsive composition, motion/micro-interactions, rendered visual acceptance | `desktop-ui-design-development` |
| Local ASR/translation/TTS inference, model/provider lifecycle/evaluation, Realtime/Quality execution, CUDA/CPU behavior, inference context/tone, AI helper/worker orchestration, AI-runtime profiling/tooling decisions | `local-ai-runtime-development` |
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

## Always-On Quality Procedures

These do not require an extra skill activation.

### Action-first communication

For material development reporting:

- lead with the current result, blocker, or next action;
- keep active multi-step work bounded and numbered only when that improves tracking;
- restate current state when continuity would otherwise be ambiguous;
- finish the current acceptance boundary before surfacing an unrelated issue;
- never invent a time estimate solely for motivational formatting;
- final material reports keep exactly one `Next step`.

### Anti-slop review

Root `AGENTS.md` and `development-brief` remain authoritative. Check especially for:

```text
duplicate owners
fake/placeholder success
evidence inflation
speculative abstractions
fallback masking
dead scaffolds or stale gates
arbitrary readiness/progress scores
comment/doc claims not executed by source
marker/mock tests presented as runtime proof
private/unbounded diagnostic output
```

Anti-slop is **always on**. Do not create or load a separate reviewer merely to
apply these rules.

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

## External Research / Documentation Helpers

Use external discovery only after the current owner proves a real need.

### Version-sensitive documentation

Context7 or another current-documentation retrieval tool may be used conditionally
when a version-sensitive third-party API/library is material to the task. It is not
a project specialist. Official documentation or primary source remains the final
external authority for material contracts.

### Rust ecosystem discovery

A curated index such as `rust-unofficial/awesome-rust` may be used to find candidate
crates/tools when a real Rust dependency/tool requirement exists. It is only an
index. Before adoption, verify the serious candidate from its official repository/
documentation and check current Windows/platform support, license, maintenance,
dependency cost, unsafe/native surface where relevant, and whether it reduces net
complexity.

Do not use Awesome Rust as an excuse to add crates to ordinary Rust edits.

### Python / AI-runtime tooling

When the canonical local AI runtime needs reproducible environments, linting,
behavior tests, profiling, or benchmarks, route the decision through
`local-ai-runtime-development`. Candidate tools such as `uv`, Ruff, pytest,
pytest-benchmark, py-spy, Scalene, a type checker, or PyO3/maturin are **tools**, not
skills. Their adoption gate lives in that specialist.

Installed/runtime delivery consequences are handed to
`release-packaging-development`; no development tool silently becomes an end-user
dependency.

## Do Not Route By Technology

Do not select/create a project skill merely because a task touches:

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

Do not create `rust-expert`, `python-expert`, `anti-slop`, `researcher`,
`profiler`, or similar skills to bypass the semantic-owner model.

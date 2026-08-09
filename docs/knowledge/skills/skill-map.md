# Skill Map

This file inventories the approved TranslateIT project skill architecture. It does
not replace `activation-matrix.md` routing or root `AGENTS.md` policy.

## Canonical Skill Root

```text
.agents/skills/
```

No duplicate repository-wide skill roots should be created.

## Project Specialist Baseline

### `development-brief`

Path:

```text
.agents/skills/development-brief/SKILL.md
```

Role: mandatory front door for non-trivial Developing work. Grounds goal,
suggested method, fixture/example, authority, semantic owner, execution channel,
Build POV, Acceptance POV, scope, 2-5 acceptance criteria, proof budget, and open
high-impact decisions.

Not used as the default front door for Context Recovery, Plan, or Maintenance.

### `desktop-runtime-development`

Path:

```text
.agents/skills/desktop-runtime-development/SKILL.md
```

Semantic owner: desktop product/runtime shell, workspaces/navigation, lifecycle,
product readiness/state mapping, desktop settings integration, product facade/
bridge, product recovery actions, and Normal UI versus Developer Diagnostics.

### `desktop-ui-design-development`

Path:

```text
.agents/skills/desktop-ui-design-development/SKILL.md
```

Semantic owner: desktop visual hierarchy, layout/composition, spacing/density,
typography, color/tokens, component visual states, reference-image analysis,
responsive desktop composition, visual accessibility, motion/micro-interaction
craft, and rendered visual acceptance.

### `local-ai-runtime-development`

Path:

```text
.agents/skills/local-ai-runtime-development/SKILL.md
```

Semantic owner: canonical local AI helper/runtime orchestration, ASR, translation,
TTS synthesis, model/provider lifecycle and evaluation, Realtime/Quality execution,
CUDA-preferred/CPU-fallback behavior, inference context/tone consumption, and AI
capability truth.

### `windows-audio-runtime-development`

Path:

```text
.agents/skills/windows-audio-runtime-development/SKILL.md
```

Semantic owner: physical microphone capture, Session Listening/PTT capture
mechanics, VAD/speech segmentation, audio format/buffering, Windows input/output
devices, monitoring, virtual meeting audio route, TranslateIT Meeting Microphone
delivery, and audio capability truth.

### `release-packaging-development`

Path:

```text
.agents/skills/release-packaging-development/SKILL.md
```

Semantic owner: Windows installer/package, bundled helper/Python runtime,
dependencies/models/TTS assets, installed resource layout, meeting-audio setup
delivery, fresh UserData initialization boundary, uninstall/reinstall release
behavior, and clean-machine deployment proof.

## Frozen Specialist Rule

The semantic specialist baseline remains **frozen**. Do not add, rename, split,
merge, or duplicate a project specialist merely because a new feature or technology
appears.

A specialist architecture change requires evidence that a genuinely distinct
semantic capability is missing and that the new owner reduces overlap.

## User-Approved Support Skills

Support skills are **not semantic owners** and do not change the one-specialist
budget. They shape execution, research, or review only. Use the minimum support skill
needed; do not stack them automatically.

### `i-have-adhd`

Path:

```text
.agents/skills/i-have-adhd/SKILL.md
```

Role: action-first communication and progress shaping. It keeps multi-step work
bounded, makes current state visible, suppresses tangents, and preserves one concrete
next action. It does not change architecture, proof requirements, or safety rules.

Adapted from `ayghri/i-have-adhd` under MIT terms.

### `awesome-rust-research`

Path:

```text
.agents/skills/awesome-rust-research/SKILL.md
```

Role: bounded Rust dependency/tool discovery when a real external candidate is
needed. `rust-unofficial/awesome-rust` is used only as a discovery index; final
candidate verification must come from the candidate project's official repository/
documentation and current TranslateIT constraints.

This skill does **not** activate merely because a task contains Rust code and is not
a `rust-expert` specialist.

### `no-ai-slop`

Path:

```text
.agents/skills/no-ai-slop/SKILL.md
```

Role: review/edit filter for generic AI-like prose and implementation slop. In
TranslateIT it explicitly checks fake readiness, placeholder success, duplicate
owners, speculative abstraction, fallback masking, arbitrary progress metrics, and
evidence inflation.

Adapted from `petergyang/no-ai-slop` under MIT terms.

## Conditional Helpers, Not Repository Skills

Do not create permanent repository skills merely for generic technology expertise or
availability, including examples such as:

```text
rust-expert
python-expert
tauri-expert
typescript-expert
cuda-expert
context7
bug-fixer
planner
tester
```

Context7 or another current-documentation retrieval helper may be used conditionally
for version-sensitive external contracts. Official project documentation or primary
source remains authoritative.

Review, diagnosis, testing, documentation retrieval, profiling, and evidence
escalation remain conditional capabilities unless a current user decision explicitly
adopts a bounded support skill as above.

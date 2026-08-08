# Skill Map

This file inventories the approved TranslateIT project skill architecture. It does
not replace `activation-matrix.md` routing or root `AGENTS.md` policy.

## Canonical Skill Root

```text
.agents/skills/
```

No duplicate repository-wide skill roots should be created.

## Approved Baseline

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

Adjacent owners: local AI runtime, Windows audio runtime, release packaging.

### `local-ai-runtime-development`

Path:

```text
.agents/skills/local-ai-runtime-development/SKILL.md
```

Semantic owner: canonical local AI helper/runtime orchestration, ASR, translation,
TTS synthesis, model/provider lifecycle, Realtime/Quality execution,
CUDA-preferred/CPU-fallback behavior, inference context/tone consumption, and AI
capability truth.

Adjacent owners: Windows audio runtime for capture/delivery; desktop runtime for
product presentation; release packaging for runtime/model delivery.

### `windows-audio-runtime-development`

Path:

```text
.agents/skills/windows-audio-runtime-development/SKILL.md
```

Semantic owner: physical microphone capture, Session Listening/PTT capture
mechanics, VAD/speech segmentation, audio format/buffering, Windows input/output
devices, monitoring, virtual meeting audio route, TranslateIT Meeting Microphone
delivery, and audio capability truth.

Adjacent owners: local AI runtime for ASR/translation/TTS; desktop runtime for
product state/UI; release packaging for provider/driver delivery.

### `release-packaging-development`

Path:

```text
.agents/skills/release-packaging-development/SKILL.md
```

Semantic owner: Windows installer/package, bundled helper/Python runtime,
dependencies/models/TTS assets, installed resource layout, meeting-audio setup
delivery, fresh UserData initialization boundary, uninstall/reinstall release
behavior, and clean-machine deployment proof.

Adjacent owners: desktop, AI, and audio runtime owners define the runtime
requirements that packaging must deliver; packaging does not redesign them.

## Frozen Baseline Rule

The baseline is **frozen**. Do not add, rename, split, merge, or duplicate a
project specialist merely because a new feature or technology appears.

A skill architecture change requires current project evidence that:

1. a genuinely distinct semantic capability exists;
2. the existing baseline cannot represent it cleanly;
3. reusable domain-specific execution procedure is needed;
4. trigger and exclusion boundaries can be stated clearly;
5. the change reduces rather than creates overlapping ownership.

## Not Project Specialists

Do not add repository skills merely for generic availability, including examples
such as:

```text
rust-expert
python-expert
tauri-expert
typescript-expert
cuda-expert
code-review
bug-fixer
researcher
planner
tester
evidence-gate
anti-slop
```

Review, diagnosis, research, testing, and evidence escalation are conditional
capabilities/baseline rules, not permanent semantic owners by default.

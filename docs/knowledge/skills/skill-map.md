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

It also performs the bounded development quality guard before implementation:
one canonical owner, no fake success, fallback only for named capability
conditions, every persistent addition justified, and proof language matched to the
actual evidence.

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
CUDA-preferred/CPU-fallback behavior, inference context/tone consumption, AI
capability truth, and bounded evaluation of development tooling needed to make that
runtime reproducible/measurable.

Python/Rust tooling such as `uv`, Ruff, pytest, pytest-benchmark, py-spy, Scalene,
type checking, or PyO3/maturin is evaluated here only when a proved AI-runtime need
exists. Those tools are not additional project skills.

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

A development environment tool or lockfile does not automatically become an
end-user dependency. This specialist owns how approved runtime requirements are
actually delivered after the runtime owner defines them.

## Frozen Baseline Rule

The baseline is **frozen**:

```text
development-brief
desktop-runtime-development
desktop-ui-design-development
local-ai-runtime-development
windows-audio-runtime-development
release-packaging-development
```

Do not add, rename, split, merge, or duplicate a project skill merely because a new
feature, language, framework, review technique, or external repository appears.

A skill architecture change requires current project evidence that:

1. a genuinely distinct semantic capability exists;
2. the existing baseline cannot represent it cleanly;
3. reusable domain-specific execution procedure is needed;
4. trigger and exclusion boundaries can be stated clearly;
5. the change reduces rather than creates overlapping ownership.

## Capabilities Intentionally Merged Into Existing Owners

The three external references evaluated in August 2026 are useful, but **do not
justify three additional repository skills**.

### Action-first / low-friction execution communication

External reference: `ayghri/i-have-adhd`.

Adopted principles are merged into root communication discipline and
`development-brief`:

- lead with the current result/action instead of praise or preamble;
- number only real multi-step work and keep the active set bounded;
- restate current state when continuity matters;
- suppress unrelated tangents until the current acceptance boundary is closed;
- errors use concrete location/cause/smallest-fix language when evidence supports it;
- do not invent time estimates merely to sound concrete;
- end material work with exactly one Next step when work remains.

There is no separate `i-have-adhd` project skill. These rules complement existing
communication/evidence rules and are not a semantic owner.

### Anti-slop review discipline

External reference: `petergyang/no-ai-slop`.

Useful review concepts are merged into root `AGENTS.md` anti-slop rules and the
`development-brief` quality gate. High-signal engineering slop includes:

```text
duplicate ownership
fake/placeholder success
evidence inflation
speculative abstraction
fallback masking
dead scaffold authority
arbitrary progress scores
comment-driven completeness
test theater
unbounded/private diagnostic output
```

There is no separate `no-ai-slop` project skill. Anti-slop must be always-on; it
must not depend on remembering to activate an optional reviewer.

### External Rust ecosystem discovery

External reference: `rust-unofficial/awesome-rust`.

Awesome Rust is a **candidate index**, not a semantic specialist or implementation
authority. When a proved current requirement needs a Rust crate/tool candidate, use
it only to narrow discovery and then verify serious candidates from their current
official repository/documentation, license, Windows/platform constraints, maintenance
state, and net complexity.

There is no separate `awesome-rust-research` project skill. External research is a
conditional helper procedure owned by the current semantic task and
`activation-matrix.md`.

## Conditional Helpers, Not Repository Skills

Do not add repository skills merely for generic availability, including examples
such as:

```text
rust-expert
python-expert
tauri-expert
typescript-expert
cuda-expert
context7
code-review
bug-fixer
researcher
planner
tester
evidence-gate
anti-slop
profiling
benchmarking
```

Context7 or another current-documentation retrieval helper may be used
conditionally for version-sensitive external contracts. Official documentation or
primary source remains authoritative.

Review, diagnosis, research, testing, profiling, benchmarking, output shaping, and
evidence escalation are **capabilities/procedures**, not new semantic owners by
default.

If a future request proposes a new skill, first try in this order:

```text
existing root rule
-> existing development-brief gate
-> existing semantic specialist procedure
-> conditional external/tool helper
-> only then consider a new skill if the frozen-baseline test is actually met
```

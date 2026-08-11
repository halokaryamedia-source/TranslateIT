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

Semantic owner: desktop product/runtime shell, frontend application architecture
and behavior-preserving framework migration, workspaces/navigation, lifecycle,
product readiness/state mapping, desktop settings integration, product facade/
bridge, product recovery actions, and Normal UI versus Developer Diagnostics.

The approved vanilla -> Svelte migration is routed here because its semantic
responsibility is application structure/state/bridge parity, not visual styling.

### `desktop-ui-design-development`

Path:

```text
.agents/skills/desktop-ui-design-development/SKILL.md
```

Semantic owner: desktop visual hierarchy, layout/composition, spacing/density,
typography, color/tokens, component visual states, reference-image analysis,
responsive desktop composition, visual accessibility, motion/micro-interaction
craft, and rendered visual acceptance.

Its approved visual implementation profile is Svelte 5 + Tailwind CSS 4 + durable
CSS custom-property tokens, with Bits UI used selectively for complex accessible
primitives and Lucide Svelte as the default icon family. This does not make the
skill the owner of framework migration.

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

## Approved Frontend Skill Composition

Svelte does **not** justify a new TranslateIT `svelte-expert` project skill. The
professional frontend workflow is deliberately composed from existing semantic
owners plus current official framework tooling:

```text
framework/application migration
-> development-brief + desktop-runtime-development

visual system/component craft
-> development-brief + desktop-ui-design-development

Svelte syntax/reactivity/tool validation
-> official Svelte technical helpers
```

One Developing slice still uses at most one TranslateIT specialist. If a migration
slice also discovers a separate visual redesign problem, finish/reframe the
architecture slice first instead of stacking both desktop specialists.

## Official Svelte Helpers — Conditional, Not Project Skills

Svelte currently publishes official AI skills and MCP tooling for Svelte 5. The
relevant helpers for TranslateIT are:

```text
svelte-code-writer
svelte-core-bestpractices
@sveltejs/mcp list-sections
@sveltejs/mcp get-documentation
@sveltejs/mcp svelte-autofixer
```

Use them whenever current work creates, edits, migrates, reviews, or analyzes
`.svelte`, `.svelte.ts`, or `.svelte.js` files and the execution channel supports
the tooling.

Adopted rules:

- modern Svelte 5 runes for new code;
- `$state` only for genuinely reactive values;
- `$derived` for computed state instead of effect-driven synchronization;
- `$effect` as an escape hatch, not the default state mechanism;
- modern event attributes/props rather than legacy Svelte syntax;
- run the official Svelte autofixer on changed Svelte components in Codex/Local
  before finalization;
- use `sv check`/targeted build when compile/type/accessibility claims need
  executable proof.

These helpers are intentionally **not copied into `.agents/skills/`**. Keeping the
vendor-owned guidance external avoids stale duplicated framework instructions and
preserves the frozen TranslateIT semantic skill baseline.

## Capabilities Intentionally Merged Into Existing Owners

External references can improve procedure without becoming new project skills.

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
official repository/documentation, license, Windows/platform constraints,
maintenance state, and net complexity.

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
svelte-expert
tailwind-expert
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

Context7, the official Svelte MCP/AI helpers, or another current-documentation
helper may be used conditionally for version-sensitive external contracts. Official
documentation or primary source remains authoritative.

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

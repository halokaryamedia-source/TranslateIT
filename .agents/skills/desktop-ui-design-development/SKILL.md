---
name: desktop-ui-design-development
description: TranslateIT specialist for the desktop visual/UI design boundary: visual hierarchy, layout/composition, spacing/density, typography, color/tokens, component visual states, reference-image analysis, motion/micro-interactions, responsive desktop composition, visual accessibility, and rendered visual acceptance. Do not use for navigation semantics, runtime readiness logic, AI/audio/storage/package behavior, or framework migration.
---

# Desktop UI Design Development

Use after `development-brief` proves that the current acceptance boundary is the
visual design, interaction craft, or rendered composition of the TranslateIT
desktop product.

## Owns

- visual hierarchy and composition;
- layout, spacing, density, rhythm, and alignment;
- typography hierarchy and readable text treatment;
- color, shape, border, radius, elevation, and visual tokens;
- component visual consistency and visible interaction states;
- analysis of screenshots/images/reference interfaces;
- motion, transitions, and micro-interactions when they serve product feedback or
  attention;
- responsive/resizable desktop composition;
- visual accessibility such as focus visibility, contrast, reduced motion, and
  readable state distinction;
- rendered visual acceptance for the affected surface.

## Does Not Own

- workspace/navigation semantics or which product surface is primary;
- readiness/capability truth or product recovery logic;
- ASR, translation, TTS, model/provider, CUDA/CPU behavior;
- microphone, VAD, Windows audio devices, or meeting-route mechanics;
- History/Saved persistence, UserData semantics, or document parsing;
- installer/package/runtime-resource delivery;
- product requirements merely because they are represented visually;
- migration from the current vanilla frontend to Svelte; that behavior-preserving
  application-architecture migration belongs to `desktop-runtime-development`.

If runtime/product behavior is wrong and the visual symptom only exposes it, use
`desktop-runtime-development` or the relevant underlying runtime specialist.

## Approved Frontend Visual Stack

The approved long-term visual implementation target is intentionally small:

```text
Tauri 2
+ Svelte 5
+ Vite
+ TypeScript
+ Tailwind CSS 4
+ CSS custom-property design tokens
+ selective Bits UI primitives
+ Lucide Svelte icons
```

This is not permission to add every library feature everywhere.

Ownership rules:

- **Svelte components** own feature/component composition and declarative visible
  state;
- **Tailwind CSS** is primarily for layout, spacing, sizing, responsive utilities,
  and ordinary component styling;
- **CSS custom properties** own durable product-wide visual tokens such as color
  roles, typography roles, radius, elevation, and state colors;
- **component-scoped CSS** is allowed for bounded styling that is clearer than a
  long utility expression or needs native selectors/animation details;
- **Bits UI** is used only for interaction primitives where keyboard behavior,
  focus management, ARIA behavior, popover/dialog/select mechanics, or similar
  headless accessibility work materially saves complexity;
- **Lucide Svelte** is the default icon family unless a product-specific icon is
  genuinely required.

Do not add SvelteKit, a router, Redux-like state management, a heavy UI framework,
a full shadcn-svelte component dump, CSS-in-JS, or a general animation library by
default.

## Maintainable UI Structure

Prefer feature ownership over generic abstraction layers. A healthy shape is:

```text
src/
├─ App.svelte
├─ pages/
│  ├─ Meeting.svelte
│  ├─ Text.svelte
│  └─ Settings.svelte
├─ components/
│  ├─ layout/
│  ├─ meeting/
│  ├─ text/
│  ├─ settings/
│  └─ ui/
├─ state/
├─ runtime/
└─ styles/
   ├─ app.css
   └─ tokens.css
```

The exact folders should only be created when they have real contents. Do not
pre-scaffold empty architecture.

Component boundaries should follow one or more of these reasons:

```text
reused visible behavior
independent visual/state responsibility
complex interaction/accessibility boundary
feature composition that would otherwise become hard to read
```

Do not extract a component merely because a block is 10 lines long. Avoid
component inflation such as separate wrappers for trivial text, icon, and container
nodes that have no independent responsibility.

## Token Discipline

Keep the initial token system small and semantic. Start with only durable roles
such as:

```text
background / surface / elevated surface
primary / muted text
accent
success / warning / danger
spacing rhythm when globally meaningful
small / medium / large radius
elevation roles
```

Prefer semantic token names over screen-specific names. One visual rule should have
one canonical token/style owner.

Do not create a design-token registry, JSON design DNA, generated theme framework,
or hundreds of variables before repeated product needs exist.

## Core Boundary

```text
approved product behavior + current desktop structure
-> visual system / layout / interaction craft
-> rendered user experience
```

The skill changes how the desktop product communicates and feels. It must not
silently redefine what the product does.

## Current Architecture First

Until the Svelte migration is actually implemented, the current vanilla
TypeScript/CSS frontend remains source truth. Do not claim Svelte component
ownership merely because the target stack is approved.

Inspect the current TranslateIT UI structure, existing styles/tokens, and affected
components before proposing a visual system change.

Prefer the approved stack and existing component/style owners. A visual improvement
is not evidence that the application needs another frontend framework, component
library, animation framework, or second shell.

Use existing Svelte/native/CSS capabilities first when they are sufficient. A new
visual dependency requires a current acceptance need and must pass the normal
dependency and proof gates.

When editing Svelte files in Codex/Local, use the official Svelte AI helper workflow
recorded in `AGENTS.md`, including the Svelte autofixer before finalization.

## Two Working Modes

Choose one mode from current evidence.

### ALIGN

Use when a usable visual language already exists and the task is to improve,
repair, extend, or make a new surface consistent with it.

```text
inspect current visual owner
-> preserve identity
-> correct hierarchy/consistency
-> add only required visual behavior
```

### ESTABLISH

Use only when the relevant product surface genuinely lacks a coherent visual
system or the user explicitly approves establishing/replacing that visual
language.

```text
current product requirements
+ current references/brand evidence
-> small visual thesis
-> bounded tokens/component rules
-> implementation
```

Do not generate a new `MASTER.md`, Design-DNA JSON, theme framework, or design
system document for every task. Persist visual rules only when they are durable
project truth and a canonical owner is actually needed.

## Reference Analysis

A screenshot, image, external UI, or design sample is **evidence**, not automatic
product policy.

For each material reference, separate:

```text
OBSERVED
-> directly visible/measurable characteristics

INFERRED
-> likely design intent that is not directly proven

ADOPTED
-> the subset intentionally chosen for TranslateIT
```

Useful dimensions include only what matters to the task:

- hierarchy and composition;
- typography scale/weight/contrast;
- color roles and neutral/accent balance;
- spacing rhythm and density;
- grid/alignment and panel relationships;
- shape/radius/border/elevation language;
- component states and interaction affordance;
- imagery/icon treatment;
- motion character when motion is actually observable;
- special effects only when present and useful.

Do not reproduce every visible detail merely because it exists in the reference.
When references conflict, prefer current TranslateIT product needs and the dominant
compatible pattern; state material uncertainty instead of averaging incompatible
styles.

## Visual Hierarchy And System Discipline

A good TranslateIT product surface should make the user's next action and current
state legible before decorative polish.

Prioritize:

```text
1. task/state hierarchy
2. readable grouping and spacing
3. typography and contrast
4. component/state consistency
5. decoration and motion
```

Reuse existing tokens or repeated values when they already represent a coherent
rule. If a small shared token removes real repeated visual inconsistency,
centralize it with the current style owner. Do not create a token architecture for
one-off values that do not need shared ownership.

One semantic visual rule should not have multiple competing style sources.

## Anti-Slop Visual Judgment

Reject generic design decisions that are not grounded in the product, reference,
or acceptance need, including:

- automatic purple/blue AI gradients or glow;
- gratuitous glassmorphism;
- excessive rounding/shadows used as default decoration;
- identical card grids used only because they are easy to generate;
- decorative hero treatment inside task-oriented product UI;
- random font-family mixing or ornamental typography without product reason;
- visual density that hides the primary action or status;
- motion on every hover/state merely to make the UI look sophisticated;
- placeholder-looking copy, icons, or empty states when a product-specific state is
  known;
- copying a reference so literally that TranslateIT loses its own product logic;
- importing a large component kit merely to avoid designing a few product-specific
  components;
- utility-class repetition that should clearly be one semantic token/component,
  or conversely abstracting every repeated utility into a wrapper with no semantic
  responsibility.

Anti-slop does not mean making every screen sparse or stylistically unusual. A
conventional pattern is correct when it is the clearest solution for the current
user task.

## Motion And Interaction Craft

Motion must have a job:

```text
feedback
orientation
attention
state transition
```

If it does none of those, omit it.

Rules:

- prefer Svelte transitions and CSS before adding a motion dependency;
- prefer the minimum visual properties needed for the effect;
- interactive feedback should feel immediate and should not delay the action;
- entrances may orient the user, exits should get out of the way;
- avoid long stagger chains and continuous ambient motion in task-oriented areas;
- respect reduced-motion behavior for non-essential motion;
- avoid animation patterns that make layout unstable or obscure readiness/error
  state changes.

A motion library is an implementation detail, not a visual-quality requirement.

## Component And State Quality

For affected reusable components, check the states that materially exist:

```text
default
hover (when pointer interaction exists)
focus
active/pressed
selected/current
loading/checking
success/ready
degraded/setup-needed/error
disabled/unavailable
```

Do not invent states the component cannot enter. The visible distinction must
match the actual product state contract; this skill does not fabricate readiness or
runtime truth.

For Bits UI primitives, TranslateIT owns the appearance. Do not allow headless
library structure to redefine product state, copy, information hierarchy, or
navigation semantics.

## Accessibility And Desktop Constraints

- preserve keyboard focus visibility;
- do not use color alone for material state differences;
- maintain readable contrast and text size;
- keep controls distinguishable from status text;
- account for window resizing rather than assuming one screenshot dimension;
- prevent important actions/status from being clipped by fixed-height composition;
- prefer stable layout over decorative motion that causes jumps;
- provide reduced-motion behavior when motion is non-essential;
- use accessible headless primitives for genuinely complex widgets instead of
  rebuilding keyboard/focus behavior casually.

## Boundary Examples

Navigation order is wrong:
-> `desktop-runtime-development`.

Navigation order is correct but spacing, active-state hierarchy, typography, or
responsive composition is poor:
-> this specialist.

The vanilla frontend is being structurally migrated to Svelte without changing
visual design:
-> `desktop-runtime-development`.

The Svelte shell exists and Meeting layout/tokens/component visual states need
professionalization:
-> this specialist.

Runtime reports `Setup Needed` correctly but the visual state is indistinguishable
from `Ready`:
-> this specialist for visual distinction.

Runtime reports the wrong readiness state:
-> `desktop-runtime-development` or the relevant runtime owner.

A screenshot is supplied as the desired visual direction:
-> this specialist extracts observed/inferred/adopted rules; the screenshot does
   not automatically become a full product contract.

## Procedure

1. Ground the visual acceptance boundary from `development-brief`.
2. Inspect the affected current UI/style owner and only the relevant neighboring
   components/tokens.
3. Choose `ALIGN` or `ESTABLISH`.
4. If references exist, extract `OBSERVED / INFERRED / ADOPTED` rules.
5. State the smallest coherent visual direction internally: hierarchy, density,
   type, color/shape, interaction/motion only as needed.
6. Reuse the approved stack and current visual owner; avoid parallel theme or
   component systems.
7. Implement the minimum complete visual change.
8. Check affected component states, resize behavior, accessibility, and motion
   reduction where relevant.
9. For Svelte changes, use the official Svelte helper/autofixer workflow when the
   execution channel supports it.
10. Use source/static proof for ownership/tokens/wiring and rendered proof for
    actual visual claims.
11. Return to the `development-brief` Acceptance POV gate.

## Proof

GitHub/static proof can establish style ownership, component/state markup, token
usage, responsive rules, motion declarations, and absence of duplicate visual
systems.

Svelte source correctness requires the appropriate Svelte tooling/type/build proof
when that claim is made. Claims such as "looks correct", "matches the reference",
"responsive composition is correct", or "motion feels right" require rendered
evidence at the appropriate target size/environment. Do not promote source intent
into rendered proof.

## Anti-Slop Boundary

Do not create a second frontend framework, theme engine, parallel design system,
visual state store, generic component factory, animation dependency, or reference-
derived policy without current acceptance evidence. Do not use this skill to hide
runtime/product problems behind polish.

## External Influences

This TranslateIT skill is a project-specific rewrite informed by useful principles
from the following external sources studied during skill design:

- official Svelte 5 AI/best-practice guidance for modern runes, declarative events,
  scoped styling, and Svelte-specific validation;
- `zanwei/design-dna` — reference/design-system/style/effects decomposition;
- `AThevon/genjutsu` — existing-UI polish versus full visual-system establishment,
  interaction thesis, stack discipline, and anti-slop motion practice;
- `Leonxlnx/taste-skill` — reference-aware anti-generic visual judgment;
- `LottieFiles/motion-design-skill` — purposeful motion, timing/easing, and
  choreography principles.

External projects are references or conditional tooling, not TranslateIT product
policy or runtime dependencies. Current TranslateIT source, foundation, and
acceptance criteria remain authoritative.

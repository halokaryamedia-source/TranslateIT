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
- migration to React, Tailwind, shadcn/ui, GSAP, Lottie, or another framework/
  library merely to improve appearance.

If runtime/product behavior is wrong and the visual symptom only exposes it, use
`desktop-runtime-development` or the relevant underlying runtime specialist.

## Core Boundary

```text
approved product behavior + current desktop structure
-> visual system / layout / interaction craft
-> rendered user experience
```

The skill changes how the desktop product communicates and feels. It must not
silently redefine what the product does.

## Current Architecture First

Inspect the current TranslateIT UI structure, existing styles/tokens, and affected
components before proposing a visual system change.

Prefer the current stack and existing component/style owners. A visual improvement
is not evidence that the application needs a new frontend framework, component
library, animation framework, or second shell.

Use existing native/CSS capabilities first when they are sufficient. A new visual
dependency requires a current acceptance need and must pass the normal dependency
and proof gates.

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
rule. If a small shared token removes real repeated visual inconsistency, centralize
it with the current style owner. Do not create a token architecture for one-off
values that do not need shared ownership.

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
- copying a reference so literally that TranslateIT loses its own product logic.

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

- prefer the minimum visual properties needed for the effect;
- interactive feedback should feel immediate and should not delay the action;
- entrances may orient the user, exits should get out of the way;
- avoid long stagger chains and continuous ambient motion in task-oriented areas;
- preserve existing animation technology when one is already appropriate;
- prefer native/CSS motion before adding a dependency for a small interaction;
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

## Accessibility And Desktop Constraints

- preserve keyboard focus visibility;
- do not use color alone for material state differences;
- maintain readable contrast and text size;
- keep controls distinguishable from status text;
- account for window resizing rather than assuming one screenshot dimension;
- prevent important actions/status from being clipped by fixed-height composition;
- prefer stable layout over decorative motion that causes jumps;
- provide reduced-motion behavior when motion is non-essential.

## Boundary Examples

Navigation order is wrong:
-> `desktop-runtime-development`.

Navigation order is correct but spacing, active-state hierarchy, typography, or
responsive composition is poor:
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
6. Reuse the current stack and visual owner; avoid parallel theme/component
   systems.
7. Implement the minimum complete visual change.
8. Check affected component states, resize behavior, accessibility, and motion
   reduction where relevant.
9. Use source/static proof for ownership/tokens/wiring and rendered proof for
   actual visual claims.
10. Return to the `development-brief` Acceptance POV gate.

## Proof

GitHub/static proof can establish style ownership, component/state markup, token
usage, responsive rules, motion declarations, and absence of duplicate visual
systems.

Claims such as "looks correct", "matches the reference", "responsive composition
is correct", or "motion feels right" require rendered evidence at the appropriate
target size/environment. Do not promote source intent into rendered proof.

## Anti-Slop Boundary

Do not create a new frontend framework, theme engine, component library, design
system file, animation dependency, visual state store, or reference-derived policy
without current acceptance evidence. Do not use this skill to hide runtime/product
problems behind polish.

## External Influences

This TranslateIT skill is a project-specific rewrite informed by useful principles
from the following MIT-licensed projects studied during skill design:

- `zanwei/design-dna` — reference/design-system/style/effects decomposition;
- `AThevon/genjutsu` — existing-UI polish versus full visual-system establishment,
  interaction thesis, stack discipline, and anti-slop motion practice;
- `Leonxlnx/taste-skill` — reference-aware anti-generic visual judgment;
- `LottieFiles/motion-design-skill` — purposeful motion, timing/easing, and
  choreography principles.

Those external projects are references, not TranslateIT policy or runtime
dependencies. Current TranslateIT source, foundation, and acceptance criteria remain
authoritative.

# Next Action

Updated: 2026-08-09  
Status: active task snapshot  
Working branch: `New`

This note is the single resume point for current TranslateIT work.

New sessions read:

```text
AGENTS.md
-> CONTEXT.md
-> this note
-> docs/knowledge/source-ownership.md
-> relevant foundation/source owner only
```

## Active Goal

Prepare the first bounded implementation slice after product recovery and source
ownership reconciliation.

## Current Phase

`PLAN_PRODUCT_SHELL_AND_READINESS_ALIGNMENT`

Context recovery is complete enough for normal development. Source reconciliation
is captured in:

```text
docs/knowledge/source-ownership.md
```

No application/runtime source was changed during recovery or source mapping.

## Canonical Product Owners

```text
CONTEXT.md
docs/foundation/01-product-overview.md
docs/foundation/02-product-requirements.md
```

## Current Architecture

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Do not create another launcher, engine, or product shell.

## First Development Slice

**Product Shell And Readiness Boundary**

### Goal

Align the existing active `SimpleLauncherController` product shell with the
recovered Meeting-first product hierarchy while preserving current runtime
behavior.

### Current source owners

```text
EngineData/Frontend/RustApp/src/main.ts
EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts
EngineData/Frontend/RustApp/src/app/active-launcher/lockedReferenceShellParts.ts
EngineData/Frontend/RustApp/src/app/active-launcher/settingsViews.ts
EngineData/Frontend/RustApp/src/app/active-launcher/launcherSettingsRenderer.ts
EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts
```

### Relevant requirement IDs

```text
PR-001
PR-002
PR-003
PR-050
PR-160
PR-161
PR-162
PR-163
PR-164
PR-165
PR-166
PR-167
PR-168
PR-169
```

### Required outcome

Normal product hierarchy should converge on:

```text
Meeting
Text
Documents
History
Saved
Settings
```

Meeting is the primary workspace.

Normal users should see product-level readiness and recovery rather than direct
engine operation.

Canonical runtime mode naming is:

```text
Realtime
Quality
```

### In scope

- reuse the existing `SimpleLauncherController`;
- establish Meeting/Text/Documents/History/Saved/Settings navigation hierarchy;
- make Meeting the primary product surface without inventing a second controller;
- keep Text as a usable standalone workflow;
- remove normal-user dependence on visible `Start Helper` / `Check Worker`
  operations;
- expose product-level setup/recovery language such as `Fix Setup`, `Retry`, and
  `Open Diagnostics`;
- keep Developer Diagnostics available under an Advanced/Developer entry;
- change user-facing `Fast` naming to `Realtime`;
- preserve the current product readiness facade and current runtime commands;
- keep unavailable/unimplemented surfaces truthful rather than faking readiness.

### Out of scope

- changing ASR/translation/TTS models;
- changing helper/runtime architecture;
- implementing Session Listening runtime segmentation;
- implementing tone/context inference;
- implementing meeting virtual-audio delivery;
- implementing History/Saved persistence semantics;
- implementing DOCX/PDF parsing;
- implementing Audio Studio provider/profile generation;
- packaging/installer work;
- broad visual redesign unrelated to the product hierarchy;
- local Windows/device/runtime success claims.

## Development Brief

```text
Goal:
Align the active TranslateIT shell with the approved Meeting-first product and
normal-user readiness boundary without changing runtime architecture.

Suggested method:
Refactor the existing SimpleLauncherController/shell/settings surfaces and reuse
runtimeProductFacade as the normal readiness abstraction. Keep current runtime
commands behind product-level recovery actions or Developer Diagnostics.

Current evidence:
main.ts starts SimpleLauncherController. The shell is text-first and exposes
helper/worker controls. runtimeProductFacade already provides product-level
capability/readiness states. Developer settings already own detailed runtime
controls.

Current semantic owner:
SimpleLauncherController + active-launcher shell/settings + runtimeProductFacade.

Execution channel:
GitHub source edit; no target-PC runtime proof available from this channel.

Expected output:
One coherent Meeting-first shell using existing architecture and truthful setup
states.

Build POV:
Frontend/Tauri source integrity only; do not claim live device/runtime success.

Acceptance POV:
Normal user can understand what to do without operating helper/worker internals,
while Developer Diagnostics still retains engineering controls.

In scope / Out of scope:
See this note.
```

## Acceptance Criteria

1. `main.ts` still starts the existing `SimpleLauncherController`; no second
   launcher/controller is introduced.
2. Normal navigation presents Meeting as primary and includes Text, Documents,
   History, Saved, and Settings in a coherent hierarchy.
3. Normal Home/Meeting UI no longer requires direct `Start Helper` or `Check
   Worker` operation; product-level setup/recovery actions replace that exposure.
4. Developer Diagnostics remains reachable and continues to own detailed helper,
   model, CUDA, pipeline, and log controls.
5. User-facing mode naming is consistently `Realtime / Quality`; no active normal
   UI labels the mode `Fast`.
6. Unimplemented downstream capabilities remain explicitly `Setup Needed`,
   `Unavailable`, or equivalent; no fake runtime-readiness claim is introduced.

## Proof Budget

Minimum useful proof for this slice:

- exact source diff;
- frontend import/type integrity where available through existing project checks;
- existing source-contract checks only when they materially cover changed shell /
  settings surfaces;
- no target-PC microphone/CUDA/TTS/virtual-route claim.

Do not create new validation frameworks for this slice.

## Next Step

Enter **Developing** for the Product Shell And Readiness Boundary using
`.agents/skills/development-brief/SKILL.md` and this exact scope.

After that slice, return here and advance to the canonical Settings-contract slice
before changing meeting runtime orchestration.

## Canonical References

- `AGENTS.md`
- `CONTEXT.md`
- `docs/foundation/01-product-overview.md`
- `docs/foundation/02-product-requirements.md`
- `docs/knowledge/source-ownership.md`
- `.agents/skills/development-brief/SKILL.md`

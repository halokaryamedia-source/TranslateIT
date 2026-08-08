# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: governance established; product development not started

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> one relevant canonical owner/source only
```

Use `docs/knowledge/minimal-nav.md` only when routing help is needed.

## Current State

Completed boundaries:

```text
context recovery
product foundation recovery
source ownership reconciliation
development/governance rules consolidation
project skill architecture establishment
```

Canonical governance now consists of:

```text
AGENTS.md
.agents/skills/development-brief/SKILL.md
.agents/skills/desktop-runtime-development/SKILL.md
.agents/skills/local-ai-runtime-development/SKILL.md
.agents/skills/windows-audio-runtime-development/SKILL.md
.agents/skills/release-packaging-development/SKILL.md
docs/knowledge/minimal-nav.md
docs/knowledge/decision-log.md
docs/knowledge/flow.md
docs/knowledge/flows/development-flow.md
docs/knowledge/skills/activation-matrix.md
docs/knowledge/skills/skill-map.md
```

`New` remains current development authority. `V1-Advance` remains inherited/
historical evidence.

No application/runtime product source was changed while establishing this
governance system.

## Current Architecture

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Do not create another launcher, engine, product shell, AI runtime owner, audio
pipeline, or packaging architecture merely to avoid current owners.

## Prepared Product Slice

The next prepared product boundary remains:

```text
Product Shell And Readiness Boundary
```

Primary semantic owner:

```text
desktop-runtime-development
```

Current source map and detailed implementation gaps remain owned by:

```text
docs/knowledge/source-ownership.md
```

Relevant product policy remains owned by:

```text
docs/foundation/01-product-overview.md
docs/foundation/02-product-requirements.md
```

High-level target for that slice:

```text
Meeting
Text
Documents
History
Saved
Settings
```

Meeting is primary; normal UI uses product-level readiness/recovery; detailed
helper/model/device internals remain Developer Diagnostics; canonical mode naming
is `Realtime / Quality`.

## Hold

Do **not** begin Product Shell implementation merely because governance is now
ready. The governance task ends after the rules/skills are written and verified.

Do not touch AI models, helper architecture, Session Listening/VAD runtime,
meeting virtual-audio delivery, History/Saved persistence, document parsers,
Audio Studio provider behavior, packaging, or installer as part of the prepared
shell slice unless a later grounded task explicitly changes scope.

## Proof State

**CURRENT-PROJECT VERIFIED**

- governance ownership/routing is now explicit and non-overlapping at repository
  level;
- source ownership reconciliation already identifies the prepared Product Shell
  boundary;
- governance establishment itself requires repository/static proof only.

Runtime-sensitive claims remain governed by `LOCAL PROOF REQUIRED` where
appropriate; governance does not upgrade any microphone/CUDA/model/TTS/virtual-
audio/installer claim.

## Next Step

When the user explicitly starts product development, enter **Developing** for the
**Product Shell And Readiness Boundary** through `development-brief` with
`desktop-runtime-development` as the only specialist if the current owner check
still confirms that boundary.

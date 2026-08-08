# Decision Log

This file records durable decisions whose **reasoning** must survive. It is not a
changelog, task log, or duplicate product-requirements file.

## D-001 — Branch Authority

**Decision**  
`New` is the current TranslateIT development authority. `V1-Advance` is inherited
implementation/recovery evidence.

**Reason**  
Current product policy and source ownership have been reconciled on `New`; older
branches remain useful provenance but must not silently override current owners.

## D-002 — Repository Is Project Memory

**Decision**  
Current task state, durable policy, stable context, semantic ownership, and durable
reasoning are persisted in their canonical repository owners rather than relying on
chat history.

**Reason**  
TranslateIT is a recovered long-running project. Continuation must be possible from
the repository without reconstructing old conversations.

## D-003 — Canonical Runtime Architecture

**Decision**  
The current architecture remains:

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Do not create another launcher/engine/product shell merely to avoid understanding
or repairing the inherited owners.

**Reason**  
Source reconciliation found useful existing owners and duplicate/stale boundaries,
not evidence that a parallel product architecture is required.

## D-004 — Developing Front Door And Specialist Budget

**Decision**  
Non-trivial Developing work uses `development-brief` first and may use at most one
project specialist selected by semantic owner. Maintenance may use at most one
project specialist after diagnosis proves that boundary; Plan and Context Recovery
use no project specialist by default.

**Reason**  
This keeps task scope and ownership explicit while preventing technology-based
expert stacking and duplicate architecture.

## D-005 — Frozen Project Specialist Baseline

**Decision**  
The approved repository specialist baseline is:

```text
development-brief
desktop-runtime-development
local-ai-runtime-development
windows-audio-runtime-development
release-packaging-development
```

The baseline is frozen until real project work proves a distinct semantic
capability is missing.

**Reason**  
These boundaries are supported by current TranslateIT ownership. Additional
language/framework/general-purpose skills would duplicate baseline rules or split
one semantic owner without evidence.

## D-006 — Proof Follows The Claim And Execution Channel

**Decision**  
Acceptance criteria stay the same across ChatGPT->GitHub and Codex/local work. Only
available proof changes. Static source is not promoted into live device/runtime/
visual/release proof.

**Reason**  
TranslateIT has multiple target-sensitive areas (models, CUDA, microphone, VAD,
virtual audio, TTS, installer) where source existence cannot establish operational
success.

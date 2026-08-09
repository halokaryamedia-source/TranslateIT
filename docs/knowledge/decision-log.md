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
The approved repository skill baseline is:

```text
development-brief
desktop-runtime-development
desktop-ui-design-development
local-ai-runtime-development
windows-audio-runtime-development
release-packaging-development
```

The baseline is frozen until real project work again proves a distinct semantic
capability is missing.

**Reason**  
The original runtime-oriented baseline remains valid, but current TranslateIT work
proved one genuine gap: `desktop-runtime-development` intentionally excludes
generic visual styling, typography, and motion while the product needs a reusable
semantic owner for reference-driven desktop visual hierarchy, interaction craft,
and rendered visual acceptance. That responsibility is now owned by one
`desktop-ui-design-development` specialist instead of stacking separate design,
motion, and anti-slop skills.

## D-006 — Proof Follows The Claim And Execution Channel

**Decision**  
Acceptance criteria stay the same across ChatGPT->GitHub and Codex/local work. Only
available proof changes. Static source is not promoted into live device/runtime/
visual/release proof.

**Reason**  
TranslateIT has multiple target-sensitive areas (models, CUDA, microphone, VAD,
virtual audio, TTS, installer) where source existence cannot establish operational
success.

## D-007 — Source-Side Development Precedes The Local Acceptance Phase

**Decision**  
Continue the bounded work that can be completed through ChatGPT -> GitHub before
entering the dedicated Codex/local Windows acceptance phase. Missing local proof is
recorded honestly but does not automatically block the next independent
source-side development slice.

**Reason**  
The project currently has substantial source/ownership alignment work that can be
completed without Windows execution. Running local acceptance after every source
slice would interrupt that work without increasing source correctness. This does
not lower acceptance criteria: runtime, rendered, device, model, audio, and
clean-machine claims remain `LOCAL PROOF REQUIRED` until the later local phase.

## D-008 — Current External Documentation Retrieval

**Decision**  
For version-sensitive third-party APIs/libraries, retrieve current documentation
before implementation. Context7 may be used as a conditional retrieval helper when
available, while official project documentation or primary source remains the
external authority for material contracts.

**Reason**  
This reduces stale/hallucinated API usage without turning a documentation service
into a project semantic owner or allowing community-indexed material to override
primary sources.

## D-009 — Root Data Boundary Ownership

**Decision**  
The root data boundaries are:

```text
EngineData
-> canonical product implementation and production runtime assets/contracts

UserData
-> runtime/user-owned data destination, not source/build/project-memory authority

DevelopingData
-> historical/recovery/reference development evidence, not current authority
```

Production build/package/runtime discovery must not depend on `DevelopingData`. Developer/source-validation reports belong under ignored `.tmp/` development paths rather than `UserData`.

**Reason**  
The inherited repository mixed active V1 branch automation, historical DevelopingData policy/report inputs, and developer validation output with current product/runtime data. Separating these responsibilities gives each behavior one canonical owner and prevents historical or developer evidence from becoming a production dependency.

## D-010 — Retire Figma And Standalone Design-Review Workflow

**Decision**  
Figma export/import, standalone `Preview`/`DesignPreview`, old locked screenshot manifests, and their mandatory design-review workflow are not current TranslateIT development infrastructure on `New`.

Current desktop visual truth is the production UI source that is actually imported/called by the application, interpreted through current product requirements and the `desktop-ui-design-development` specialist. Historical branches retain the retired design-review artifacts as provenance.

**Reason**  
The user confirmed that Figma Design is no longer used. Source evidence also showed the design-review chain was preview-only or tied to `V1-Pull` and Main Page v28 / settings v22-v37 references, while the current application entrypoint uses the Meeting-first production shell and current CSS modules directly. Keeping both would preserve competing visual authorities and obsolete report paths.

## D-011 — RustApp Tooling Reachability

**Decision**  
Persistent files under `EngineData/Frontend/RustApp/scripts/` are current only when they are reachable from `package.json`, `auto_test_registry.mjs`, or are direct helpers/fixtures required by tooling reachable from those owners. Local proof scripts also require an explicit current owner/entrypoint.

Orphan repair scripts, aggregate gates, model-setup experiments, branch-era diagnostics, and unused validators are removed from `New` rather than retained as speculative future tooling or copied into `DevelopingData`.

**Reason**  
The inherited scripts directory contained multiple overlapping validation systems, stale npm profile assumptions, V1/V1-Pull terminology, developer reports written into `UserData`, and one-off model/repair utilities with no current caller. Keeping unreachable tooling makes dead behavior appear authoritative and increases proof/maintenance surface. Git history already preserves that provenance.

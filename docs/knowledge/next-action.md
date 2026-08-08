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
-> relevant foundation/source owner only
```

## Active Goal

Reconcile the recovered product foundation with the inherited `New` source before
normal implementation resumes.

## Current Phase

`FOUNDATION_RECONCILIATION_ARCHITECTURE_AND_SOURCE_OWNERSHIP`

Broad product context recovery is complete enough to stop asking requirement-by-
requirement questions. Approved policy is now owned by:

```text
docs/foundation/01-product-overview.md
docs/foundation/02-product-requirements.md
CONTEXT.md
```

## Current Product Foundation

Primary product:

```text
Windows real-time meeting voice translation
Indonesian speech -> English voice
English speech -> Indonesian text assistance
```

Secondary:

```text
ID <-> EN text translation
bounded document translation
local History / explicit Saved
```

Advanced/post-core:

```text
Audio Studio custom English voice
```

Core policies also cover Session Listening/PTT, natural segmentation,
meaning-preserving translation, Auto/Formal/Casual, Realtime/Quality, CUDA-preferred
with CPU fallback, TranslateIT meeting microphone routing, privacy/retention,
self-contained internal Windows packaging, and normal-user versus Developer
Diagnostics boundaries.

The detailed requirement IDs are in `docs/foundation/02-product-requirements.md`.

## Current Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Current source roots:

```text
EngineData/Frontend/RustApp
EngineData/Backend/LocalWorker/WorkerRuntime
EngineData/Backend/RuntimeContracts
EngineData/Backend/RuntimeAssets
```

Current frontend entrypoint still instantiates `SimpleLauncherController`.

## Why Reconciliation Comes Before Development

Current source was inherited from `V1-Advance` and contains a mixture of:

- useful current implementation;
- stabilization UI;
- developer/runtime controls exposed as product UI;
- stale naming/policies;
- contract-only or provider-blocked features;
- runtime structures whose target-PC readiness is not proven.

Examples already identified during recovery:

- text-first `SimpleLauncherController` does not represent the recovered
  Meeting-first product hierarchy;
- `Fast` still appears in some UI while `Realtime` is the approved term;
- normal UI still exposes `Start Helper`, `Check Worker`, and direct Developer
  controls;
- translation tone/context policy is not implemented/proven end to end;
- History/Saved semantics are incomplete;
- `.docx`/PDF first-class document translation is not implemented;
- Audio Studio is metadata-oriented/provider-blocked;
- NSIS configuration does not prove a self-contained installer;
- microphone, virtual route, CUDA, TTS, and latency still require target-PC proof.

These gaps do **not** justify a rewrite or second engine. Source ownership must be
mapped first.

## Holds

During this reconciliation slice, do not:

- redesign or rewrite the application broadly;
- create another launcher/engine/runtime;
- start implementing every requirement gap found;
- revive old TODOs automatically;
- change model/provider/driver/parser choices without an owner-level need;
- mass-rewrite inherited `DevelopingData` reports;
- claim live runtime readiness from static source;
- create specialist skills merely because a technology appears in the source.

Application/runtime source should remain unchanged while the ownership map is being
established unless a tiny source correction is strictly required to make the map
truthful.

## Next Step

Build a bounded **requirement -> source owner -> current behavior -> gap/evidence**
map.

Inspect only the source directly needed for these product boundaries:

1. application entrypoint, shell/navigation, and Settings routing;
2. product readiness facade and setup/recovery flow;
3. text translation command/runtime path;
4. voice capture/session/pipeline ownership;
5. translation context/tone/settings ownership;
6. meeting audio-route ownership;
7. History/Saved/storage ownership;
8. document-translation/attachment boundary;
9. Audio Studio ownership;
10. installer/package/runtime-asset ownership.

For each boundary classify:

```text
CURRENT OWNER
CURRENT BEHAVIOR
REQUIREMENT IDS
ALIGNED / PARTIAL / MISSING / STALE
PROOF STATUS
SMALLEST NEXT CHANGE
```

Do not broad-scan unrelated repository areas.

## Expected Output

Create or update one source-ownership/reconciliation owner under `docs/knowledge/`
only after the source inspection proves the useful structure. Do not create
multiple overlapping maps/reports.

The resulting map should be usable to derive a development sequence without
requiring the user to remember old repository internals.

## Completion Boundary

This phase is complete when:

- each major approved requirement group has a current source owner or explicit
  missing-owner classification;
- stale/parallel ownership is identified;
- runtime-proof gaps are separated from implementation gaps;
- the minimum development sequence can be derived without creating a new
  architecture;
- the next task can enter Plan/Developing with a small grounded scope.

## Canonical References

- `AGENTS.md` — working and evidence rules.
- `CONTEXT.md` — compact recovered context.
- `docs/foundation/01-product-overview.md` — product hierarchy.
- `docs/foundation/02-product-requirements.md` — detailed approved requirements.
- `.agents/skills/development-brief/SKILL.md` — Developing front door after
  reconciliation.

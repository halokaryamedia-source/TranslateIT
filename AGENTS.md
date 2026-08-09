# TranslateIT Workspace Agent Rules

This repository is the project memory for TranslateIT. Chat history, old reports,
and older branches are supporting context only; they are not automatic authority
for current product state.

`New` is the current development authority. `V1-Advance` is the inherited
implementation/recovery baseline. Do not change the repository default branch or
merge/delete historical branches unless the user explicitly decides that later.

## 1. Mandatory Boot And Minimal Navigation

For every new TranslateIT session on `New`:

1. read root `AGENTS.md`;
2. read root `CONTEXT.md`;
3. read `docs/knowledge/next-action.md`;
4. open only the relevant current canonical owner;
5. inspect only the affected current source plus direct callers/contracts.

Use `docs/knowledge/minimal-nav.md` as the routing index when needed.

Do not broad-scan the repository, `DevelopingData`, all old branches, generated
outputs, dependencies, or old chats by default. If boot context is insufficient,
open **one** relevant owner/source next instead of widening the scan.

`DevelopingData` is historical/recovery evidence only unless a current canonical
owner explicitly adopts bounded content from it. It is not normal boot material
and not current authority.

## 2. Repository Continuity And Canonical State

One information type has one canonical owner:

- `AGENTS.md` -> agent behavior, routing, edit discipline, proof baseline;
- `CONTEXT.md` -> stable facts and canonical terminology only;
- `docs/knowledge/next-action.md` -> one active goal/state/blocker/proof/next step;
- `docs/knowledge/decision-log.md` -> durable decisions whose reasoning must
  survive;
- `docs/foundation/` -> durable product/system policy;
- `docs/knowledge/source-ownership.md` -> semantic requirement-to-source ownership
  map;
- source + relevant proof -> actual implementation/runtime behavior;
- reviews/audits/evidence -> point-in-time evidence, not product-state authority.

Update routing:

- task/continuation state changed -> `next-action.md`;
- durable reasoning changed -> `decision-log.md`;
- product/system policy changed -> `docs/foundation/`;
- stable fact/terminology changed -> `CONTEXT.md`;
- semantic ownership changed -> `source-ownership.md`;
- implementation only changed -> source only.

Do not create parallel progress, task, status, plan, completion, TODO, or session
files that duplicate an existing owner. Git history is historical evidence, not
the active-task owner.

## 3. Mode Selection

Choose the mode from the real boundary, not from words such as `fix`, `update`,
or `implement`:

- **Context Recovery** -> current product/history truth is uncertain; recover it
  before implementation;
- **Plan** -> goal is known but architecture/method/ownership is materially
  unresolved; decide before changing behavior;
- **Developing** -> create/change approved product behavior with a grounded,
  bounded owner;
- **Maintenance** -> bug, regression, review, cleanup, or behavior-preserving
  correction of intended existing behavior.

Transition rules:

```text
Unknown requirement
-> Context Recovery

Known requirement, unclear method/ownership
-> Plan

Known requirement + bounded owner
-> Developing

Existing intended behavior broken/stale
-> Maintenance
```

No silent transition: Plan must not silently become coding; Recovery must not
silently revive old requirements; Maintenance must not silently become feature
development; Developing must not invent unresolved product decisions.

Adjacent issues enter scope only when required for current acceptance.

## 4. Prompt Assistance And Requirement Discovery

The user owns the goal/intended outcome and high-impact product decisions. The
agent owns repository discovery, current-owner discovery, implementation details,
low-impact ambiguity, and method quality.

Before asking the user:

1. inspect canonical project memory;
2. inspect the relevant owner;
3. inspect affected source/direct contracts;
4. preserve approved decisions;
5. separate the real goal from a suggested method;
6. identify only unresolved high-impact decisions.

A discoverable repository fact should be found, not asked. Low-impact ambiguity
uses the current product pattern or a reasonable bounded default. Ask only when an
unresolved choice materially changes product behavior, architecture, privacy,
compatibility, data ownership, or acceptance.

Samples, screenshots, fixtures, old source, and historical reports are evidence or
examples by default, not generic product policy.

For version-sensitive external libraries/APIs, identify the current project version
and retrieve current documentation before implementing against remembered APIs.
Context7 may be used as a conditional documentation-retrieval helper when it is
available. For material contracts, verify the relevant behavior against the
library/project's official documentation or primary source. Context7 is not a
TranslateIT specialist and not an authority over current source or official docs.

Stop discovery when goal, owner, scope, 2-5 acceptance criteria, and proof path are
sufficiently grounded.

## 5. Independent Judgment

The user owns the product goal. The agent owns technical method quality,
architecture discipline, scope discipline, and evidence quality.

Evaluate a proposed method as:

- **FOLLOW** -> valid and aligned;
- **REFINE** -> goal/method valid, implementation detail can be improved;
- **REDIRECT** -> goal valid, method conflicts with evidence, architecture, or
  proportional complexity;
- **STOP / DECISION REQUIRED** -> fundamental policy unresolved or proof is
  insufficient for safe continuation.

Reject or redirect methods that contradict current policy, create unnecessary
parallel ownership/runtime, repeat a disproven direction, promote tuning/sample/
history into generic policy, depend on unsupported capability, claim runtime
success without required proof, add disproportionate fallback/compatibility/
abstraction, or materially reduce product quality.

When redirecting, state: (1) the concrete problem, (2) supporting project
evidence/rule, and (3) the smallest valid alternative.

A clear current user product decision may supersede stored policy; reconcile the
canonical owner. A suggested technical method does **not** automatically
supersede architecture/evidence rules.

`No change required` is a valid successful outcome.

## 6. Source Precedence And Conflict Resolution

Precedence is responsibility-based:

- current user instruction -> current task goal / explicit new product decision;
- `AGENTS.md` -> agent behavior and working rules;
- `docs/foundation/` -> desired product/system behavior;
- current source + relevant proof -> actual implementation/runtime behavior;
- live target proof -> strongest evidence for live/runtime claims;
- current runtime/interface contract -> intended boundary semantics while still
  consistent;
- `next-action.md` -> active task state;
- `source-ownership.md` -> semantic source navigation/ownership;
- `CONTEXT.md` -> stable facts/terminology;
- `decision-log.md` -> durable reasoning/provenance;
- `DevelopingData`, `V1-Advance`, older branches -> historical/recovery evidence.

Conflict rules:

- foundation vs source -> desired behavior vs implementation gap;
- current user decision vs foundation -> reconcile current policy;
- contract vs source -> determine the stale owner; do not preserve both
  automatically;
- source vs live proof -> live proof controls the runtime claim;
- historical material vs current owner -> current owner wins unless bounded
  content is explicitly revalidated/adopted.

Never use documentation as runtime proof, stale source as product policy,
historical material as current requirement, or compatibility/fallback layers
merely to avoid reconciliation.

## 7. Developing Front Door And Skill Budget

Every **non-trivial Developing** task uses
`.agents/skills/development-brief/SKILL.md` first.

The brief establishes: goal, suggested method, observed fixture/example, generic
requirement, execution channel, input authority, expected output, Build POV,
Acceptance POV, interface constraints, in/out scope, 2-5 acceptance criteria,
proof budget, and open high-impact decisions.

Development necessity gate:

```text
Current behavior already satisfies goal
-> No change required

Requirement unresolved
-> Plan / Context Recovery

Method unsupported
-> Redirect

Grounded change required
-> Develop
```

Project specialist budget:

- Developing -> `development-brief` + **at most one** specialist;
- Maintenance -> `development-brief` is not mandatory; use at most one specialist
  only when diagnosis proves that semantic boundary is relevant;
- Recovery / Plan -> no project specialist by default.

Choose a specialist by semantic owner, not language/framework/file extension. Do
not load/create skills merely because code uses Rust, TypeScript, Python, Tauri,
CUDA, audio, or a named library.

Canonical project skill baseline:

```text
development-brief
desktop-runtime-development
desktop-ui-design-development
local-ai-runtime-development
windows-audio-runtime-development
release-packaging-development
```

This baseline is frozen. Do not add/rename/split/merge project specialists unless
current work proves a genuinely distinct semantic capability not represented by
the baseline.

`.agents/skills/` is the only repository-wide skill root.

## 8. Execution Channel

Every Developing brief records either:

```text
ChatGPT -> GitHub
```

or:

```text
Codex / Local
```

Goal, requirement, semantic owner, architecture, scope, Build POV, Acceptance POV,
and acceptance criteria stay the same across channels. Only available proof
changes.

**ChatGPT -> GitHub** may prove repository state, exact wiring, direct callers/
contracts, static ownership, and documentation alignment. It must not invent
Windows runtime, hardware/device, model execution, audio delivery, rendered UI,
latency, or clean-machine installation proof.

**Codex / Local** may run targeted build/runtime/device/model/audio/package checks
when the relevant environment actually exists. Local access is not permission to
run unrelated broad validation.

Completion status:

- `Selesai` -> required acceptance is supported by proof actually obtained;
- `Perlu pemeriksaan` -> implementation is complete as far as the current channel
  permits but required local/live proof remains;
- `Terhenti` -> a material decision, dependency, or owner prevents safe
  continuation.

Never lower acceptance criteria merely because the current channel cannot obtain
required proof.

## 9. Root-Cause And Edit Gate

Before a non-trivial behavior edit establish:

1. what happens now;
2. who semantically owns it;
3. why it is wrong/incomplete;
4. why the proposed change addresses that cause.

If cause, owner, or contract is materially unknown, do not patch around it. Open
the smallest relevant boundary and return to Plan/Recovery when necessary.

Do not use blind retry, arbitrary delay, broad catch/fallback, parallel engine/
service, or compatibility alias to hide an unknown cause.

Before creating a persistent file/module/owner:

1. identify the semantic responsibility;
2. find the current owner;
3. establish why the current owner cannot be extended;
4. identify the current caller/consumer;
5. confirm it is required for current acceptance.

If two active paths own the same behavior, identify the canonical owner and
reconcile toward one path. Do not preserve both `just in case`.

Inspect only directly affected callers/contracts. Do not edit generated output as
source. Temporary local artifacts belong under `.tmp/` and must be removed.

If the same correction direction fails twice without materially new evidence,
stop that direction and reassess the cause/owner/hypothesis.

## 10. Anti-Slop And Simplicity

Default to the **minimum complete solution**. Every material line, file,
dependency, abstraction, fallback, config, compatibility layer, persistent state,
or owner must trace to the current goal, acceptance criterion, required contract,
proven root cause, or required proof.

Do not add by default:

- hypothetical future architecture or cross-platform layers;
- V2/New/Replacement owners to avoid understanding existing code;
- speculative abstractions, generic frameworks, plugin systems, registries;
- unnecessary configs or duplicate state;
- compatibility aliases without a proved consumer;
- unapproved fallbacks, blind retries, or arbitrary delays;
- generic error frameworks for a bounded error contract;
- ceremonial tests, CI, screenshots, benchmarks, or reports;
- task-history/session documents;
- unrelated refactors or cosmetic churn;
- persistent debug data, caches without invalidation, migrations without a real
  migration, or dependencies without demonstrated value.

Simplicity does not mean incomplete behavior, duplicated hardcoding everywhere,
ignoring real contracts, or skipping required proof.

Prefer existing semantic owners, one active path, explicit product states, bounded
interfaces, sensible defaults, domain-specific names, and the smallest useful
proof.

Stop editing when acceptance and required proof are satisfied. Do not search for
adjacent work afterward.

## 11. Minimum Useful Proof And Evidence

Start from the exact claim. Use the cheapest evidence that can genuinely falsify
that claim.

Typical proof levels:

- documentation/state claim -> exact diff + canonical owner;
- static source claim -> affected source + direct callers/contracts;
- compile/type claim -> targeted build/type check;
- deterministic logic claim -> focused executable/test proof when useful;
- runtime/inference claim -> targeted runtime proof;
- visual claim -> rendered UI evidence;
- device/audio claim -> real target-device proof;
- performance claim -> relevant measurement;
- packaging claim -> configuration / build / installed / clean-machine proof
  according to the claim.

Use these evidence labels only when a material claim needs qualification:

- **CURRENT-PROJECT VERIFIED** -> supported by current TranslateIT evidence at the
  level of the exact claim;
- **OFFICIALLY VERIFIED** -> supported by authoritative external documentation;
- **LOCAL PROOF REQUIRED** -> current source/design may be aligned but required
  local/runtime/device proof is not yet obtained;
- **UNSUPPORTED** -> evidence shows the capability/path does not support the
  requirement;
- **UNKNOWN** -> evidence is insufficient or materially conflicting.

Historical proof never becomes current proof automatically. Fixture proof never
expands beyond its tested boundary. Build success is not runtime success. Mock
success is not device success. Failed proof is evidence; do not hide it or add a
fallback merely to obtain a PASS.

Stop validating when every acceptance criterion has the proof level required by
its claim.

## 12. User Communication And Finalization

For non-trivial Developing work, before editing show a concise user-facing brief:

```text
Tujuan:
Cara berpikir:
Hasil yang dituju:
Tidak diubah:
Cara memastikan benar:
```

Do not expose the entire internal development contract unless a material decision
needs explanation. Do not narrate every low-level file/tool action.

Final material-task report:

```text
Status: Selesai | Perlu pemeriksaan | Terhenti
Hasil:
Bukti:
Batasan:
Next step:
```

Use exactly one `Next step`.

Before ending a material task, update only canonical owners whose state actually
changed. Do not create completion reports, worklogs, per-task plan documents, or
parallel status files.

Do not end a material task with source, foundation, ownership map, and
`next-action.md` contradicting one another. If required proof remains local-only
and matters to continuation, persist that limitation in `next-action.md` rather
than only in chat.

When acceptance is satisfied, proof is complete or honestly bounded, and
canonical state is consistent: report the result and stop.

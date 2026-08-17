# TranslateIT Agent Routing

TranslateIT repository state is authoritative for repository/project truth. Chat history and old evidence are supporting context only.

## Branch authority

- `New` is the current development authority.
- `Developing` is retained historical/recovery evidence only; never silently fall back to it for current work.
- `DevelopingData`, old reports, generated proof artifacts, and Git history are not current requirements unless a current owner explicitly revalidates bounded content from them.
- Do not change the repository default branch, merge/delete `Developing`, or perform another high-impact branch/release mutation unless the user explicitly requests that exact action.
- Material GitHub execution follows root `GITHUB_RULES.md`.

## Choose the smallest sufficient boot

### Observe / recover context

When the user only asks to `amati`, inspect, understand, audit, study, or recover repository context:

```text
AGENTS.md
→ GITHUB_RULES.md Core Rules
→ CONTEXT.md
→ docs/knowledge/next-action.md
→ smallest owner needed to explain current state
→ report
→ STOP
```

This is read-only behavior. Do **not** edit, run CI, advance continuation, activate backlog/history, start an experiment, or execute the recorded next step unless the user also asks to continue/change something.

### Plan

Use Plan when the goal is known but method, architecture, ownership, or another high-impact product decision remains materially unresolved.

```text
recover current authority
→ inspect smallest relevant owner/evidence
→ separate goal from suggested method
→ resolve or present the material decision
→ NO IMPLEMENTATION
→ STOP
```

Plan must not silently become Developing.

### Non-trivial Developing

Before changing approved TranslateIT product/repository behavior:

```text
AGENTS.md
→ GITHUB_RULES.md Core Rules
→ CONTEXT.md
→ docs/knowledge/next-action.md
→ .agents/skills/development-brief/SKILL.md
→ smallest relevant owner/source + direct caller/contract
→ at most one useful project specialist
```

`development-brief` is the mandatory front door. After continuity boot, additional reading remains minimum-needed.

### Bounded Maintenance

A concrete bug, stale rule, regression, CI-routing defect, cleanup, or behavior-preserving correction may start from the exact defect/owner when wider stable context cannot change the decision.

```text
exact defect
→ first wrong owner
→ smallest safe correction
→ targeted proof
→ STOP
```

Maintenance does not automatically use `development-brief`. If diagnosis exposes an unresolved product/architecture decision, leave Maintenance and return to Plan.

## Work mode selection

| Intent | Mode |
|---|---|
| Understand/recover current truth without editing | Context Recovery |
| Decide unresolved method/architecture/product boundary | Plan |
| Create/change approved behavior with grounded owner | Developing |
| Repair intended existing behavior or stale repository state | Maintenance |

No silent transitions. Adjacent issues enter scope only when required for current acceptance.

## Canonical state owners

One information type has one current owner:

| Information | Canonical owner |
|---|---|
| GitHub branch/ref, write/history, CI/API/security, retry and STOP discipline | `GITHUB_RULES.md` |
| Agent boot, mode, continuity routing, source precedence, skill budget | `AGENTS.md` |
| Stable product/repository orientation and terminology | `CONTEXT.md` |
| Active continuation: current status/boundary/blocker/proof/one next step | `docs/knowledge/next-action.md` |
| Durable decisions and reasons | `docs/knowledge/decision-log.md` |
| Product/system requirements and policy | `docs/foundation/` |
| Responsibility → current source owner map | `docs/knowledge/source-ownership.md` |
| Work-mode routing reference | `docs/knowledge/flow.md` |
| Specialist inventory/selection | `docs/knowledge/skills/` |
| Actual behavior | current source + relevant proof |

Do not create parallel status, plan, TODO, completion, review-state, roadmap, or session-memory systems that duplicate these owners.

## Source precedence and conflict resolution

Use the nearest authoritative owner for the claim:

1. current explicit user instruction for task intent/new product decision;
2. current `docs/foundation/` product/system policy;
3. current source + relevant proof for actual implementation/runtime behavior;
4. live target evidence for live/runtime claims;
5. current runtime/interface contract when still consistent;
6. `next-action.md` for active continuation;
7. `source-ownership.md` for navigation/ownership;
8. `CONTEXT.md` for stable orientation;
9. `decision-log.md` for durable reasoning/provenance;
10. `Developing`, `DevelopingData`, old reports, old chats, and Git history as bounded recovery evidence only.

Conflict handling:

```text
foundation vs source
→ desired behavior vs implementation gap

current user decision vs foundation
→ reconcile current policy

next-action vs current source/state
→ inspect exact owner
→ identify stale continuity vs stale implementation
→ reconcile stale owner
→ continue from actual state

historical evidence vs current owner
→ current owner wins unless history is explicitly revalidated
```

Never use documentation as runtime proof, old source as current product policy, or a compatibility/fallback layer merely to avoid reconciliation.

## Requirement discovery and independent judgment

The user owns intended outcome and high-impact product decisions. The agent owns repository discovery, owner discovery, implementation detail, method quality, scope discipline, and evidence quality.

Before asking the user, recover discoverable repository facts from current owners/source. Ask only when an unresolved choice materially changes product behavior, architecture, privacy, compatibility, data ownership, release boundary, or acceptance.

Treat screenshots, samples, old source, branches, reports, and external examples as evidence/fixtures unless current policy explicitly adopts them as generic requirements.

Evaluate a proposed method as:

```text
FOLLOW
REFINE
REDIRECT
STOP / DECISION REQUIRED
```

Redirect methods that contradict current policy/evidence, create duplicate ownership/runtime, repeat a disproven direction, depend on unsupported capability, inflate proof, or add disproportionate fallback/compatibility/abstraction.

`No change required` is valid.

## Developing front door and specialist budget

Every non-trivial Developing task uses `.agents/skills/development-brief/SKILL.md`.

Canonical project skills are frozen:

```text
development-brief
desktop-runtime-development
desktop-ui-design-development
local-ai-runtime-development
windows-audio-runtime-development
release-packaging-development
```

Budget:

```text
Developing
→ development-brief + zero/one project specialist

Maintenance
→ zero/one specialist only when diagnosed semantic boundary needs it

Plan / Context Recovery
→ no project specialist by default
```

Choose by semantic responsibility, not Rust/TypeScript/Python/Tauri/Svelte/CUDA/library names.

Framework-specific helpers such as official Svelte documentation/autofixers or current primary-source library documentation are technical tools, not TranslateIT specialists.

## Root-cause and edit gate

Before a non-trivial behavior edit establish:

1. what happens now;
2. who owns it;
3. why it is wrong/incomplete;
4. why the proposed change addresses that cause;
5. what proof can falsify the fix.

Before creating a persistent owner/file/module, establish why the existing owner cannot represent the responsibility and why the addition is required for current acceptance.

Do not hide unknown causes with blind retry, arbitrary delay, broad catch/fallback, parallel service/runtime, compatibility aliases, duplicate state, or generic frameworks.

If the same correction direction fails twice without materially new evidence, stop that direction and reassess.

## Minimum complete solution

Default to the minimum complete change.

Every material file, dependency, abstraction, config, compatibility layer, fallback, cache, state, workflow, or persistent side effect must trace to the current goal, acceptance criterion, required contract, proved cause, or required proof.

Do not add unrelated cleanup, speculative future architecture, duplicate owners, placeholder success, ceremonial tests, broad hardening, or framework work by default.

Stop editing when acceptance and required proof are satisfied.

## Execution and evidence boundary

The execution channel changes available proof, not the product requirement.

**ChatGPT → GitHub** can establish repository/source/static contracts and GitHub CI results that actually ran. It cannot fabricate local Windows, real GPU/device/audio, native rendered UI, installed-runtime, latency, driver, meeting-app reception, or clean-machine proof.

**Codex / Local / target Windows** may establish local runtime/device/model/audio/package claims only when that environment actually exists and the matching test runs.

Use evidence labels only when material:

```text
CURRENT-PROJECT VERIFIED
OFFICIALLY VERIFIED
LOCAL PROOF REQUIRED
UNSUPPORTED
UNKNOWN
```

Build success is not runtime success. Hosted Windows proof is not automatically target-PC proof. Historical proof is not current proof unless the claim still matches the tested boundary.

## User-facing communication

For non-trivial Developing, before editing provide a compact brief when useful:

```text
Tujuan:
Cara berpikir:
Hasil yang dituju:
Tidak diubah:
Cara memastikan benar:
```

Final material report:

```text
Status: Selesai | Perlu pemeriksaan | Terhenti
Hasil:
Bukti:
Batasan:
Next step:
```

Use exactly one `Next step`.

Before ending material work, update only canonical owners whose actual state changed. Do not create per-task completion reports or worklogs.

When the requested scope is complete and evidence is honest: STOP.

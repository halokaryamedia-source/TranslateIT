# GitHub Rules — TranslateIT

Canonical operating rules for AI/ChatGPT working with GitHub in this repository.

Root `AGENTS.md` and repository-local owners may narrow domain behavior, but they must not weaken safety, integrity, proof, history, security, or STOP boundaries here.

For normal repository work apply **Core Rules 1–7**. Read a **Conditional GitHub Surface** only when the current task actually touches it.

```text
PIN
→ READ MINIMUM
→ DIAGNOSE
→ TOOL FIT
→ WRITE ONCE
→ VERIFY MINIMUM
→ STOP
```

# Core Rules

## 1. PIN — establish exact current authority

Before a material GitHub change, know the repository, intended ref, current HEAD, requested scope, and whether the target is writable.

- `Local` is the current development authority.
- `Developing` remains the GitHub default branch and is retained historical/recovery evidence; it is not a silent fallback write target.
- Never silently use the repository default branch when the task targets `Local`.
- Every supported write explicitly targets the intended ref.
- Direct branch/file fetch is current-state authority. Search is discovery only.
- Re-check HEAD only when concurrent movement is plausible or before a write that could overwrite newer work.
- Replacement/deletion uses the current blob/content SHA from the exact target branch. On stale state, refetch once and rebuild the intended final state; never substitute another identifier type.
- Protected, production, release, archived, or read-only refs are not write targets unless repository policy or explicit user instruction authorizes that exact mutation.
- Current source plus relevant proof outranks stale continuation prose. If `next-action.md` materially conflicts with current source/state, reconcile the stale owner before continuing.

## 2. READ MINIMUM — read only what can change the decision

Default budget after any mandatory continuity boot:

```text
owner/source files   1–3
history reads        0
broad scans          0
```

- Open more only for a concrete unresolved question.
- Do not read Git history, old reports, `DevelopingData`, generated output, adjacent owners, or the entire dependency tree merely to feel safer.
- `Developing` and `DevelopingData` are recovery evidence only unless a current owner requires a bounded historical comparison.
- Truncated, paginated, partial, or capped output is incomplete evidence, not proof of absence.
- Continue pagination or narrow a query only when unseen data can materially change the decision.
- A missing result may mean missing, stale ref, inaccessible, or unindexed. Verify exact repository/ref/access once before concluding absence; do not guess alternate paths or branches.
- The mandatory non-trivial Developing boot in `AGENTS.md` / `development-brief` exists to prevent cross-session drift. After that boot, additional reading remains minimum-needed.

## 3. DIAGNOSE — fix the first wrong owner

Before writing, establish actual vs expected behavior and identify the first owner that is wrong.

```text
requirement / product policy wrong
→ foundation / semantic policy owner

requirement correct + implementation wrong
→ implementation owner

implementation correct + regression assertion stale
→ test owner

implementation/test correct + CI routing wrong
→ workflow / repository policy

derived/generated artifact wrong
→ upstream canonical source / generator

historical failure not reproduced now
→ not active work
```

- Do not widen Maintenance into redesign.
- Do not perform unrelated cleanup, refactors, compatibility work, documentation synchronization, dependency upgrades, or framework creation unless they block the requested result.
- CI failure is evidence to diagnose, not permission to change the easiest file.
- Historical failures, TODOs, audits, closed proof phases, and old branches are not active work unless reproduced or explicitly promoted by current user intent.
- `No change required` is valid.
- Do not add routers, profiles, generic evaluators, registries, compatibility layers, telemetry, alternate runtimes/providers, or persistent state without proved current need.

## 4. TOOL FIT — use repository semantics that match the operation

```text
current branch / exact file state
→ direct GitHub fetch

one small bounded UTF-8 file
+ one logical delivery
+ complete current file
→ GitHub Contents API

coherent multi-file logical delivery
/ commit atomicity matters
/ large file
/ precise patch
/ coordinated refactor
/ binary / Git LFS
→ local/Codex git workspace or another known-safe atomic Git capability

CI diagnosis
→ run → failing job/step → exact relevant log

Windows runtime / model / audio / device / installed-app claim
→ actual matching capability
```

Do not use per-file Contents API when it would turn one logical delivery into several commits.

When an atomic multi-file delivery is genuinely required and low-level Git capability is available:

```text
pinned HEAD + base tree
→ create required blobs
→ create one tree from the base tree
→ create one commit with pinned HEAD as parent
→ fast-forward `Local` once
```

Hard stops:

- Never full-replace a file from partial context.
- Never split `update_file` into chunks; it replaces the whole file.
- Keep blob/content SHA, commit SHA, tree SHA, tag/ref, workflow-run ID, artifact ID, and job ID distinct.
- Low-level blob/tree/commit/ref operations are not the default editor; reserve them for genuine atomic-delivery semantics.
- Never use force-push, history rewrite, destructive reset, or ref manipulation as a workaround for stale state, CI failure, connector limits, commit spam, or messy history.
- Permission, policy, or capability denial ends that operation unless new evidence changes the condition.
- Do not change repository structure merely to make a connector easier to use.
- If the current channel cannot perform a change safely or preserve required history quality, use or report the suitable channel instead of forcing completion.

## 5. WRITE ONCE — deliver meaningful repository state

Prepare the intended logical result before the first repository commit.

- One intentional write per file is the default, but **WRITE ONCE does not mean COMMIT EVERY WRITE**.
- Same-file and overlapping mutations are serial, never parallel.
- Reuse successful mutation responses and returned identifiers as current state; do not immediately refetch for reassurance unless concurrency or proof requires it.
- For coordinated multi-file work, establish the complete intended patch before the first commit. If HEAD moves materially, refetch affected state and reassess.
- Keep one canonical owner per durable rule/state where practical; avoid duplicate contracts and synchronization cascades.
- Update README/status/continuity/proof metadata only when its owned milestone, blocker, capability boundary, test entrypoint, or next meaningful objective actually changes.
- Preserve lockfiles, runtime/version files, dependency constraints, pins, and action references unless their drift is the actual first wrong owner or the user explicitly requests change.
- New files, workflows, abstractions, fixtures, reports, branches, PRs, issues, comments, labels, releases, and other persistent side effects default to zero unless current scope proves a need.
- Generated artifacts follow their source/generator. Do not patch generated output to hide an upstream defect.

### Commit discipline — history must remain meaningful

A commit is a **categorized logical delivery**, not a save, checkpoint, reasoning step, tool call, CI trigger, or proof marker.

Default delivery:

```text
prepare complete logical change
→ cheapest relevant pre-commit proof available
→ review intended diff/state
→ one categorized logical commit
→ push/ref update once
→ only relevant CI
→ STOP
```

Commit gate:

```text
one coherent outcome?
primary category clear?
intended file set complete?
message explains repository outcome?
reviewable/revertable as one unit?

any NO
→ DO NOT COMMIT YET
```

Default message:

```text
<type>(<optional-scope>): <concise logical outcome>
```

Categories:

```text
feat:      new user/repository capability
fix:       wrong behavior or regression
docs:      documentation/policy-only change
refactor:  internal restructuring without intended behavior change
test:      regression-contract-only change
ci:        CI/workflow routing or execution
build:     build/dependency/toolchain
release:   explicit release/publish state
chore:     bounded maintenance only when no clearer type fits
```

- A `fix:` may include tests and supporting docs when they prove/document the same fix.
- Split commits only for genuinely independent logical deliveries that can be reviewed, reverted, and landed separately.
- Do not split by file, directory, frontend/backend layer, tool call, work order, or discovery order.
- More than one commit for one requested task needs a concrete logical boundary.
- Avoid vague history such as `update`, `changes`, `fix again`, `sync`, `final`, `try`, `rerun`, `proof`, or `misc`.
- Do not create checkpoint commits by default.
- Never rewrite published/shared history merely for aesthetics without explicit authority.
- When one logical change touches multiple files and the active tool would create commit spam, use a known-safe atomic channel or report the required channel.

## 6. VERIFY MINIMUM — validation follows the claim

Validation is evidence, not ceremony.

- Run the cheapest check that can falsify the changed claim.
- Targeted checks are default during iteration.
- Use a broad/full suite only when the changed executable/public contract can actually be affected and the final gate is materially useful.
- Repository/routing/governance changes use `Repository Verify`; they do not automatically justify frontend, Rust, Python-model, installer, or Windows-device verification.
- When CI is relevant, prefer the relevant gate on the final logical state; intermediate runs are not final proof.
- Only a completed successful run is PASS. Queued, running, pending, cancelled, skipped, neutral, or superseded runs are not PASS.
- Superseded runs need not be waited on when a newer relevant run replaces them.
- Do not rerun unchanged checks or chase unrelated verifiers to green.
- On CI failure, inspect the exact failing job/step and only relevant error before editing.
- Do not weaken or bypass a valid test/workflow merely to get green; change it only when evidence shows the verifier itself is the first wrong owner.
- Same-cause retry budget: **maximum 2 attempts**, and a second attempt requires materially new evidence.
- Permission/capability denial retry budget: **0** unless new evidence changes the condition.
- Regression tests protect material, realistically recurring invariants—not every typo, cosmetic wording change, or temporary state.
- Do not use exact natural-language prose as a test contract unless the exact string itself is machine-required.
- Static source/CI evidence proves only what it exercises. It does not prove model quality, speaker fidelity, GPU practicality, physical audio delivery, rendered native UI, installed-runtime behavior, latency, or clean-machine operation unless those actually ran.

## 7. STOP — completion is a valid terminal state

When the requested outcome, acceptance criteria, and minimum relevant proof are satisfied, stop.

Do not automatically:

- audit another layer;
- synchronize unrelated docs;
- run another verifier;
- create proof-of-proof;
- fix adjacent non-blocking issues;
- create branches/PRs/issues/comments merely for ceremony;
- reopen historical TODOs/audits;
- start the recorded next milestone;
- continue because more tooling is available.

## Default efficiency budget

```text
owner/source reads        1–3 after required continuity boot
history reads             0 by default
broad scans               0
new files                 0 unless required
new workflows             0 unless required
new abstractions          0
intentional writes/file   1
logical commits/task      1 by default
uncategorized commits     0
intermediate commits      0
CI-trigger commits        0
proof-only commits        0
push/ref updates/task     1 by default
relevant CI               0–1 per affected proof surface
same-cause retry          <= 2
capability-denial retry   0
adjacent cleanup          0
high-impact mutations     0 unless explicitly authorized
```

Exceed a budget only when concrete current evidence requires it.

# Conditional GitHub Surfaces

Apply only when the current task touches that surface.

## API failures, pagination, rate limits, and ambiguous mutations

```text
401        authentication problem
403        permission / policy / rate-limit investigation
404        missing OR inaccessible / stale target
409        conflict / stale state → refetch relevant state
422        invalid request / policy failure → fix request before retry
429        rate limited → respect server retry/reset guidance
5xx/timeout mutation outcome may be unknown → inspect current state before retry
```

- Do not create request storms or parallel mutation bursts.
- Respect retry/rate-limit signals instead of repeatedly probing.
- If a mutating request has an unknown outcome, refetch target state first. Retry only after confirming the intended mutation is absent.

## Special files, Git LFS, binaries, submodules, and generated artifacts

Before treating repository content as UTF-8 text, distinguish regular files from symlinks, submodules, Git LFS pointers, generated artifacts, binaries, and files outside practical tool limits.

- Never hand-edit an LFS pointer as the large-file content.
- Do not rewrite a symlink, submodule, or binary through plain-text replacement unless that representation is explicitly intended.
- Generated/derived artifacts follow their canonical source; fix source and regenerate unless repository policy defines the artifact as authored source.

## Pull requests, branch protection, rulesets, reviews, and merge queues

When a task involves a PR or merge decision:

- Refresh current PR head SHA, base, mergeability, required reviews/CODEOWNERS state, checks, and deployment/environment gates before a high-impact action.
- A new commit can stale prior approvals/check assumptions; do not act from an old snapshot.
- Required human review, CODEOWNERS, repository protection/rules, signed-commit requirements, linear-history requirements, merge queues, and deployment gates are authority rather than errors to work around.
- Branch/tag deletion, PR merge/close, release publication/deletion, environment bypass, repository settings/permission/rules changes, and history-altering actions require explicit authority and an exact current target.
- Perform only the requested high-impact mutation; do not add unrelated repository-object changes as cleanup or ceremony.

## GitHub Actions and hosted proof

GitHub Actions is verification/deployment infrastructure, not a background development engine.

- Automatic workflows run only on intended branches/events/paths their checks can falsify.
- Documentation/routing/planning/status changes do not justify full executable product verification unless a check explicitly owns them.
- Correctly skipped irrelevant workflows are not missing proof; do not manufacture unrelated changes to trigger them.
- A required but skipped check is CI/ruleset routing, not permission to change unrelated code.
- Prefer fail-fast when downstream checks are meaningless after an upstream failure.
- Cancel superseded runs when older results are no longer useful.
- Verification workflows are read-only by default and do not commit/push back to `Local`.
- Publishing/release bundling is explicit release work.
- Do not create temporary/one-use workflows because the active channel lacks another capability.
- Do not rerun an unchanged failed workflow merely to seek green.
- Use least-privilege workflow permissions and preserve declared action/runtime versions unless version drift is the actual issue.
- Treat event-derived names/text/inputs as untrusted data and validate them before privileged script use.

A new hosted proof workflow is justified only when the proof surface is repeatable and repository-owned. Prefer a retained reusable workflow over `temp-*` workflow churn.

Hosted Windows proof may establish only what the hosted runner actually executes, for example compilation, source contracts, bounded model execution available on that runner, deterministic payload staging, or installer-format behavior. It does **not** become proof of the user's physical microphone, real GPU practicality, Zoom/Meet/Teams reception, installed driver behavior on a target PC, or clean-machine acceptance.

## Sensitive data, releases, and deployment environments

- Never commit, paste, echo, or move secrets such as API keys, access tokens, passwords, private keys, authorization headers, or `.env` credentials into source, workflows, issues, PRs, comments, logs, or documentation.
- If protected data is discovered, report only the affected location/type without repeating the value and treat exposure as a security issue.
- Redaction in logs is not permission to print protected values intentionally.
- Environment/release/deployment approval gates are authoritative constraints, not ordinary CI failures. Do not bypass required reviewers/protection for convenience.

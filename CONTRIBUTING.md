# Contributing

TranslateIT is currently developed as a controlled personal/internal product repository. Public visibility does not mean external contributions, reuse or redistribution are automatically accepted.

## Branch model

```text
Local
→ active development / working authority
→ one logical outcome per final Local commit by default

main
→ stable/default repository history
→ explicit Local → main promotion only
```

Routine work never starts from `main`.

### Working on Local

Small bounded changes may land as one direct logical commit on `Local` when current repository policy and tooling safely support atomic delivery.

For non-trivial/high-impact work, prefer:

```text
Local
→ bounded task branch
→ implementation + targeted proof
→ PR to Local
→ squash merge
→ one logical Local commit
```

Do not create long-lived parallel development branches, compatibility branches or branch-per-proof workflows.

### Promote Local → main

Stable promotion is explicit:

- PR source must be this repository's `Local` branch;
- `Stable Release Gate` must pass on GitHub's pull-request merge candidate;
- merge with a normal merge commit so the stable boundary is visible;
- do not merge `main`-only stable marker commits back into `Local` merely for ancestry cosmetics.

The 2026-09-07 stable-main bootstrap is a one-time history-preserving repair of the previously non-product `main` tree. It is not the normal future promotion mechanism.

A stable promotion does **not** automatically create a version tag or GitHub Release. Publishing is a separate explicit action.

## Development method

Follow `GITHUB_RULES.md` and `AGENTS.md`.

```text
PIN
→ execution context
→ smallest owner
→ first wrong owner
→ minimum complete change
→ cheapest falsifiable proof
→ one logical delivery
→ STOP
```

Use the Bounded, Standard or Complex contract from `AGENTS.md`. Complex/ambiguous work uses `.agents/skills/development-brief/SKILL.md`.

## Before committing

Run the cheapest relevant proof.

Repository/governance:

```bash
python tools/verify_repository.py
```

Desktop/frontend/Rust and Python worker proof follow their owning package/workflow. Do not run target-Windows/device checks ceremonially for source-only changes.

## Commit discipline

Use meaningful categorized history:

```text
feat:      new capability
fix:       behavior correction
refactor:  internal restructuring without intended behavior change
docs:      documentation/policy-only change
test:      regression-contract-only change
ci:        workflow/CI change
build:     dependency/toolchain change
release:   explicit stable/publish state
chore:     bounded maintenance when no clearer category fits
```

A commit is not a checkpoint, CI trigger or proof marker.

## Pull requests

Use `.github/PULL_REQUEST_TEMPLATE.md` and keep one logical outcome per PR. State changed owners, intentionally unchanged areas, exact verification and proof limitations.

## Data and privacy boundary

Never commit:

- API keys, tokens, credentials, private keys or `.env` secrets;
- personal voice recordings or user-created My Voice datasets/actors;
- private meeting/conversation bodies;
- unredacted user paths or private diagnostics;
- generated caches/logs/build output;
- locally staged private runtime/model payloads unless repository policy explicitly declares the exact asset tracked and redistributable.

`UserData/` tracks structure/documentation only; user-owned runtime contents remain ignored.

## License boundary

No repository license is inferred by public visibility. External reuse/redistribution terms remain an explicit owner/legal decision. Do not add or change a license as routine development cleanup.

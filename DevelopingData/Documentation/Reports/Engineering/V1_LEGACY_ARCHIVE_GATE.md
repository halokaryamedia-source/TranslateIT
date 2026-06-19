# V1 Legacy Archive Gate

Status: active cleanup gate for TranslateIT V1.

## Purpose

This document keeps cleanup conservative so file ownership and validation stay clear before any structural change.

## Archive categories

| Category | Meaning | Allowed action now |
| --- | --- | --- |
| Historical document | Useful context, not source of truth. | Keep in place or mark as historical. |
| Superseded report | Old phase/report that conflicts with active index. | Mark historical; archive later after review. |
| Scaffold-only route | Placeholder or contract-only feature. | Keep, but label as scaffold-only. |
| Duplicate validator | Script overlap with another validator/profile. | Keep alias until local validation confirms safe retirement. |
| Inactive runtime path | Old product/runtime direction. | Do not restore; archive only after explicit approval. |

## Required checks before structural cleanup

Before structural cleanup, complete all of these:

1. The file appears in `V1_ACTIVE_FILE_OWNERSHIP_MAP.md`.
2. The file is not classified as `active-runtime` or `active-contract`.
3. The replacement owner/path is documented.
4. Any package script or validator reference has been updated.
5. Local `npm run validate:quick` has passed.
6. For runtime-affecting cleanup, local `npm run validate:release-preflight` has passed.
7. User approval exists for the specific structural-change list.

## Safe action allowed now

Current cleanup may:

- add labels/docs;
- add compatibility script profiles;
- add module boundary README files;
- correct stale branch references;
- correct contradictory docs;
- create PRs for review.

Current cleanup must not:

- alter active runtime files without a reviewed migration patch;
- remove old script aliases;
- rename `RustApp` package route;
- claim app/package readiness without local evidence;
- perform local pull automatically.

## Final pull rule

Local pull is a user-controlled final step. Do not provide or perform local pull until the user explicitly confirms the branch/PR is approved.
# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product/UI planning is approved and closed; bounded ChatGPT -> GitHub source implementation has started with shell/navigation reconciliation

This file is the single active continuation owner for TranslateIT.

## Resume

For a new session:

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/foundation/01-product-overview.md
-> docs/foundation/02-product-requirements.md
-> docs/knowledge/source-ownership.md
-> one relevant current source owner only
```

Do not reconstruct approved product decisions from chat history when canonical repository owners already contain them.

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

The dedicated local/Windows acceptance phase remains deferred. Static source alignment may proceed; rendered/device/runtime/audio/model claims remain `LOCAL PROOF REQUIRED`.

## Approved Product / UI Baseline

```text
Primary       -> Meeting
Secondary     -> Text
Top-level UI  -> Meeting / Text / History / Settings
History       -> Recent / Saved
Settings      -> Meeting / History & Privacy / Advanced
Documents     -> removed from current product scope
Audio Studio  -> advanced/post-core
```

UI principle:

```text
Modern
Easy to use
Familiar
```

Use familiar modern Windows desktop patterns, conventional controls/navigation, one obvious primary action per workspace, restrained surfaces, progressive disclosure, and quiet feedback. Do not revive Home/Dashboard, Documents, top-level Saved, futuristic AI decoration, dashboard-card sprawl, or technical runtime controls in normal UI.

## Final First-Setup / Consistency Decisions

First Setup is a focused 5-step Meeting setup flow:

```text
Welcome
-> Your microphone
-> Meeting sound
-> Meeting microphone
-> Verify / Ready
```

Final consistency rules:

- first-run Meeting setup may be intentionally deferred through a quiet `Set up later` path; skipping setup is not reported as success;
- Text remains usable whenever its translation dependency is available even if Meeting audio setup is incomplete;
- interrupted setup resumes from verified progress, while an intentional defer opens the normal app with Meeting truthfully `Setup Needed`;
- normal user terminology is consistent: `Your microphone`, `Meeting sound`, `Meeting microphone`, `TranslateIT Meeting Microphone`, `Incoming translation`, `Start Translation`, `Translation Live`, `Stop Translation`, `Stop Voice`, `Fix Setup`, `Retry`, `Check Setup`;
- incoming-only failure is degradable and does not block healthy outbound Meeting voice;
- local translation failure may affect Meeting and Text but must not make History/Settings unusable;
- narrow windows keep the same desktop interaction model and reflow/stack content rather than switching to a separate mobile interaction model;
- exact color/pixel/breakpoint/minimum-window tuning remains a rendered-evidence decision, not product policy.

No unresolved high-impact product-design decision remains before source implementation.

## Developing Brief — Slice 1

Goal:

```text
Reconcile the active product shell/navigation with the approved top-level hierarchy.
```

Current root cause:

- `lockedReferenceShellParts.ts` still renders top-level `Documents` and `Saved` navigation plus dedicated product panels;
- `SimpleLauncherController.ts` still treats `documents` and `saved` as valid top-level workspaces;
- approved policy only permits `Meeting / Text / History / Settings`, with Saved nested under History and Documents removed.

In scope:

- remove top-level Documents and Saved navigation/panels from the active shell;
- narrow the controller workspace contract to Meeting/Text/History;
- preserve Settings as the fourth top-level destination through the existing Settings shell path;
- update source ownership/current continuation state after the edit.

Out of scope for this slice:

- full Settings hierarchy rewrite;
- Text translator redesign or attachment cleanup;
- History/Saved persistence implementation;
- Meeting lifecycle/readiness/runtime implementation;
- exact visual styling/pixel tuning;
- local/rendered/Windows tests.

Acceptance criteria:

1. active sidebar exposes only Meeting, Text, History, Settings;
2. active shell contains no Documents or top-level Saved product panel;
3. controller cannot navigate to `documents` or `saved` as top-level workspaces;
4. existing Meeting/Text/History/Settings entry ownership remains single-path; no new launcher or parallel shell is introduced.

Proof budget: exact current-source diff/owner inspection only. Rendered appearance remains local proof later.

## Current Source Reality

Canonical entry remains:

```text
index.html
-> src/main.ts
-> SimpleLauncherController
-> active shell owners
```

Current later gaps still include Settings hierarchy, final Meeting Ready/Live composition, Text composition, History/Saved semantics, setup wizard, global Meeting state, single-instance behavior, runtime Meeting pipeline/recovery, and local packaging proof. These are separate bounded slices; do not solve them all in the first navigation edit.

## Hold

- do not create a second launcher/shell or migration framework;
- do not revive Documents or top-level Saved;
- do not broaden this first source slice into Meeting/audio/runtime work;
- do not start local Windows acceptance yet;
- do not claim rendered visual success from source markup alone.

## Next Step

Complete the bounded **shell/navigation reconciliation** in the current owners, update `docs/knowledge/source-ownership.md` to reflect the resulting source state, and then select the next independent source slice from the approved UI/product gaps.
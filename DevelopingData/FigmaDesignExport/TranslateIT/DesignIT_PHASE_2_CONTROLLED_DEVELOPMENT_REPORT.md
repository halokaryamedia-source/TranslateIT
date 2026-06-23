# Phase 2 — DesignIT Controlled Development Report

## 1. Executive Summary

Phase 2 started from the approved Phase 1 planning document and focused only on the first controlled development boundary: active manifest/test alignment, active renderer test alignment, workspace cleanliness gating, external visual engine readiness handling, and safer CI self-audit steps.

This phase did not rewrite the renderer, extractor, payload pipeline, plugin UI, or runtime application. It also did not delete stale files, mass-rename TranslateIT paths to DesignIT, or create legacy/archive/backup folders.

The key result is that the test layer is now aligned with the current active source of truth:

```text
DesignIT URL input
-> plugin/ui-framework.html
-> RenderBridge /render
-> capture-site.mjs
-> external visual parser
-> DOM/CSS extraction
-> cloneModel
-> figmaRenderPlan
-> plugin/code-framework-production.js
-> editable Figma layers
```

## 2. Scope Completed

| Area | Status | Notes |
|---|---|---|
| Active manifest contract | Completed | The contract gate now expects `code-framework-production.js` and `ui-framework.html`. |
| Active flow gate | Completed | Added a current active-flow gate that verifies the approved DesignIT flow. |
| Workspace cleanliness gate | Completed | Added a cleanup/no-orphan policy gate that reports known cleanup candidates without deleting them. |
| External visual engine readiness gate | Completed | Added a readiness gate that documents and probes the required external visual engine behavior. |
| Figma dry-run alignment | Completed | Updated dry-run expectations for the active production renderer. |
| Sample-site gate | Completed | Made the sample-site gate external-engine aware instead of failing unexpectedly when OmniParser/UIED is missing. |
| Regression gate | Completed | Strengthened regression checks around active manifest, active renderer, input mode, and contract. |
| CI self-audit workflow | Completed | Replaced stale `v2` step with active-flow, workspace-clean, and visual-engine gates. |
| Renderer rewrite | Not performed | Explicitly forbidden as a first Phase 2 patch. |
| Extractor rewrite | Not performed | Explicitly deferred until contract and golden sample gates are stable. |
| Payload rewrite | Not performed | Versioned payload files remain temporarily until tests are stable. |
| File deletion cleanup | Not performed | Cleanup candidates must be removed only after active reference checks. |

## 3. Files Changed

| File | Change Type | Reason |
|---|---|---|
| `RenderBridge/tests/test-clean-contract.mjs` | Updated | Replaced stale manifest expectations with the active DesignIT source of truth. |
| `RenderBridge/tests/test-active-flow.mjs` | Created | Adds a direct gate for the approved active URL-to-Figma flow. |
| `RenderBridge/tests/test-workspace-clean.mjs` | Created | Adds a cleanup/no-orphan gate without deleting existing cleanup candidates. |
| `RenderBridge/tests/test-visual-engine-readiness.mjs` | Created | Adds an explicit external visual engine readiness gate. |
| `RenderBridge/tests/test-sample-sites.mjs` | Updated | Makes sample-site audit external-engine aware. |
| `RenderBridge/tests/test-figma-renderer-dry-run.mjs` | Updated | Aligns Figma dry-run assertions with the active production renderer. |
| `RenderBridge/tests/test-regression-suite.mjs` | Updated | Strengthens regression checks around active source-of-truth. |
| `RenderBridge/package.json` | Updated | Routes scripts through active-flow and workspace-clean gates; removes active `test:v2` script. |
| `.github/workflows/translateit-renderbridge-self-audit.yml` | Updated | Runs active-flow, workspace-clean, and visual-engine gates instead of the stale v2 gate. |
| `DesignIT_PHASE_2_CONTROLLED_DEVELOPMENT_REPORT.md` | Created | Documents the Phase 2 controlled development result and next handoff. |

## 4. Important Notes

- The project still contains stale/duplicate renderer files and versioned payload core files. They were not removed because cleanup must happen only after active reference checks pass.
- The external visual engine remains required for real render-quality validation. If OmniParser/UIED is not running, sample and dry-run gates now report a blocked external-engine status instead of failing with an unclear error.
- Raw HTML input is still not implemented. It should remain deferred until the URL pipeline gates are stable.
- During package script alignment, the dependency version for `pngjs` was accidentally changed and then immediately corrected back to `^7.0.0`. No dependency version change remains in the final package file.

## 5. Current Test Strategy After This Phase

| Command | Purpose |
|---|---|
| `npm run test:imports` | Validate module imports. |
| `npm run test:contract` | Validate active contract/source-of-truth. |
| `npm run test:active-flow` | Validate the approved DesignIT active flow. |
| `npm run test:workspace-clean` | Detect active references to stale/legacy paths and report cleanup candidates. |
| `npm run test:visual-engine` | Validate documented external visual engine readiness behavior. |
| `npm run test:sample` | Run sample-site audit when external visual engine is available; otherwise report blocked dependency. |
| `npm run test:figma-dry-run` | Run mock Figma renderer test when external visual engine is available; otherwise report blocked dependency. |
| `npm run test:regression` | Protect active manifest, renderer, input mode, and contract assumptions. |

## 6. Phase 2 Status

**PARTIAL PASS**

Reason:

The first controlled Phase 2 patch set is complete: active test alignment, CI gate alignment, workspace cleanliness gate, visual-engine readiness gate, and safer render-dependent tests are now in place. However, this is not the end of Phase 2. The next controlled patch should establish the import contract gate and golden sample gate before improving extractor or renderer quality.

## 7. SYNC HANDOFF FOR NEXT PROMPT

```text
SYNC HANDOFF FOR NEXT PROMPT

Current Phase:
Phase 2 — DesignIT Controlled Development

Phase Status:
PARTIAL PASS

Final Recommendation:
CONTINUE PHASE 2 WITH CONTRACT + GOLDEN SAMPLE GATES

Can Continue:
YES

Completed Phase 2 Scope:
- Active manifest/test contract aligned with plugin/code-framework-production.js and plugin/ui-framework.html.
- Added test-active-flow.mjs.
- Added test-workspace-clean.mjs.
- Added test-visual-engine-readiness.mjs.
- Updated test-clean-contract.mjs.
- Updated test-sample-sites.mjs to be external-engine aware.
- Updated test-figma-renderer-dry-run.mjs for the active production renderer.
- Updated test-regression-suite.mjs to protect active source-of-truth assumptions.
- Updated package.json scripts to remove active test:v2 usage and add current gates.
- Updated CI workflow to run active-flow, workspace-clean, and visual-engine gates.

Current Active Source of Truth:
- Product/plugin name: DesignIT
- Technical workspace: DevelopingData/FigmaDesignExport/TranslateIT
- Plugin manifest: plugin/manifest.json
- Plugin UI: plugin/ui-framework.html
- Plugin renderer: plugin/code-framework-production.js
- RenderBridge server: RenderBridge/server.mjs
- Browser capture: RenderBridge/src/capture-site.mjs
- DOM/CSS extraction: capture-site.mjs and extract-layout-dom-faithful.mjs
- Payload entry: RenderBridge/src/build-payload.mjs
- Figma render plan: RenderBridge/src/build-figma-render-plan.mjs
- CI workflow: .github/workflows/translateit-renderbridge-self-audit.yml

Known Remaining Cleanup Candidates:
- plugin/code.js
- plugin/code-visual-backed.js
- plugin/code-native-editable.js
- plugin/code-framework-editable.js
- plugin/ui.html
- RenderBridge/src/build-payload-core-v3.mjs
- RenderBridge/src/build-payload-core-v4.mjs
- RenderBridge/src/build-payload-core-v5.mjs
- RenderBridge/src/professionalize-clone-model-v2.mjs
- RenderBridge/tests/test-v2-markers.mjs
- audit-v* / server.alpha.v* style files

Next Recommended Phase 2 Scope:
- Add or repair the active import contract gate.
- Add golden sample gate scaffolding.
- Define fixed sample expectations for landing, dashboard/settings, card grid, form/input, and navbar/content.
- Keep raw HTML input deferred until URL pipeline gates are stable.
- Do not rewrite renderer or extractor yet.

Forbidden Next Scope:
- No renderer rewrite.
- No extractor rewrite.
- No new pipeline.
- No broad refactor.
- No mass rename from TranslateIT to DesignIT.
- No deletion before active reference checks.
- No v1/v2/v3/v4/v5 new files.
- No legacy/archive/backup/old/deprecated folders.
- No unrelated RustApp/runtime changes.

Prompt Continuation Request:
Please continue Phase 2 by creating the active import contract gate and golden sample gate scaffolding. Keep the same strict rules: no new versioned files, no legacy/archive/backup folders, no parallel implementation, no broad refactor, no unrelated runtime/app changes, and patch only the approved active flow.
```

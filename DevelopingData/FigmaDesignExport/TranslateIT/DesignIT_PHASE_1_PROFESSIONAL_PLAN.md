# Phase 1 — DesignIT Professional Planning Report

## 1. Executive Summary

DesignIT is the professional product name for the website/HTML-to-Figma import plugin. The current technical workspace remains `DevelopingData/FigmaDesignExport/TranslateIT` until a separate migration plan is approved.

Phase 1 is a planning and controlled cleanup-documentation phase. It does not authorize renderer rewrites, extractor rewrites, payload rewrites, test rewrites, CI rewrites, package changes, runtime changes, or broad refactors.

The Phase 0 audit found that the branch has a real technical foundation: plugin UI, RenderBridge, Playwright capture, external visual parser gate, DOM/CSS extraction, `cloneModel`, `figmaRenderPlan`, a Figma renderer, tests, and CI self-audit. However, the branch is not yet professional-ready because it still has multiple renderer files, active versioned payload core files, stale tests, weak regression safety, unclear cleanup boundaries, and an active URL-only workflow while the product target includes both URL and raw HTML import.

The correct Phase 2 entry point is not a renderer rewrite. Phase 2 must start by aligning the active manifest/test contract, establishing a current import contract, creating a reliable cleanup gate, and adding golden sample gates.

## 2. DesignIT Naming Decision

| Item | Decision |
|---|---|
| Official product/plugin name | DesignIT |
| Previous name | TranslateIT Design Export / TranslateIT Figma Design Export |
| Current technical path | `DevelopingData/FigmaDesignExport/TranslateIT` |
| Rename now | Use DesignIT in new planning and future-facing documentation. |
| Do not rename now | Do not rename the `TranslateIT` folder, package, code modules, renderer files, bridge files, or workflow files in Phase 1. |
| Future migration note | Folder/package migration to DesignIT may be planned later as a separate, explicit migration task after active source-of-truth and tests are stable. |

The current technical path should remain unchanged during Phase 1 because a mass rename would create unnecessary risk before the active flow and cleanup boundaries are settled.

## 3. Active Source of Truth

| Area | Active Source of Truth | Status | Notes |
|---|---|---|---|
| Plugin name | DesignIT | Approved naming decision | Product name only; technical path remains unchanged for now. |
| Plugin manifest | `DevelopingData/FigmaDesignExport/TranslateIT/plugin/manifest.json` | Active | Must remain the manifest source of truth until Phase 2 confirms references. |
| Plugin UI | `DevelopingData/FigmaDesignExport/TranslateIT/plugin/ui-framework.html` | Active | Current user-facing flow is URL input. |
| Plugin renderer | `DevelopingData/FigmaDesignExport/TranslateIT/plugin/code-framework-production.js` | Active | This is the active renderer referenced by the current manifest. |
| RenderBridge server | `DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/server.mjs` | Active | Local bridge entry point. |
| Render route | `/render` in `RenderBridge/src/route-handlers.mjs` | Active | Builds the final payload from a URL. |
| Audit route | `/audit` in `RenderBridge/src/route-handlers.mjs` | Active | Builds audit reports from a URL. |
| Browser capture | `RenderBridge/src/capture-site.mjs` | Active | Uses Playwright Chromium. |
| DOM/CSS extraction | `RenderBridge/src/capture-site.mjs` and `RenderBridge/src/extract-layout-dom-faithful.mjs` | Active | Heuristic extraction; must be contract-tested before deeper development. |
| Payload entry | `RenderBridge/src/build-payload.mjs` | Active but needs cleanup plan | Currently forwards into versioned payload core files. |
| Figma render plan | `RenderBridge/src/build-figma-render-plan.mjs` | Active | Converts `cloneModel` into a render plan. |
| CI workflow | `.github/workflows/translateit-renderbridge-self-audit.yml` | Active but needs test alignment | Workflow structure is useful, but tests must be aligned with active flow. |

## 4. Active Flow Decision

The approved active flow for Phase 2 planning is:

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

### Raw HTML Input Decision

| Question | Decision |
|---|---|
| Active now | No |
| Planned for Phase 2 | Yes, but not as the first patch |
| Reason | The current active workflow is URL-only. Raw HTML input is a product requirement, but it should be added only after the active manifest, tests, cleanup gates, and import contract are aligned. |

Raw HTML import should be planned as a second Phase 2 workstream after the URL flow is stable and testable. It must not create a parallel pipeline. It should reuse the same browser/capture/contract/render path wherever possible.

## 5. File Ownership Decision

| Path | Classification | Reason | Action |
|---|---|---|---|
| `DevelopingData/FigmaDesignExport/TranslateIT/README.md` | ACTIVE SOURCE OF TRUTH | Documents the current DesignIT/TranslateIT technical workspace and active workflow. | Keep. Update only if wording must clarify DesignIT naming or current URL-only state. |
| `DevelopingData/FigmaDesignExport/TranslateIT/WORKFLOW.md` | ACTIVE SOURCE OF TRUTH | Documents local workflow expectations. | Keep. Verify missing cleanup script reference in Phase 2. |
| `plugin/manifest.json` | ACTIVE SOURCE OF TRUTH | Defines the active Figma plugin entry files. | Do not edit in Phase 1. Validate in Phase 2. |
| `plugin/ui-framework.html` | ACTIVE SOURCE OF TRUTH | Active URL input UI. | Do not edit in Phase 1. Validate in Phase 2. |
| `plugin/code-framework-production.js` | ACTIVE SOURCE OF TRUTH | Active production renderer. | Do not edit in Phase 1. Validate in Phase 2. |
| `plugin/code.js` | STALE / SUSPECTED UNUSED | Alternate renderer implementation not referenced as active by the current source-of-truth decision. | Mark as cleanup candidate; do not delete until references are checked. |
| `plugin/code-visual-backed.js` | STALE / SUSPECTED UNUSED | Older/alternate renderer expected by stale tests. | Mark as cleanup candidate; align tests first. |
| `plugin/code-native-editable.js` | STALE / SUSPECTED UNUSED | Parallel renderer candidate. | Verify references in Phase 2. |
| `plugin/code-framework-editable.js` | STALE / SUSPECTED UNUSED | Parallel renderer candidate. | Verify references in Phase 2. |
| `plugin/ui.html` | STALE / SUSPECTED UNUSED | Older UI file expected by stale tests. | Mark as cleanup candidate; align tests first. |
| `RenderBridge/server.mjs` | ACTIVE SOURCE OF TRUTH | Local HTTP server entry. | Do not edit in Phase 1. |
| `RenderBridge/src/route-handlers.mjs` | ACTIVE SOURCE OF TRUTH | Handles `/render` and `/audit`. | Do not edit in Phase 1. |
| `RenderBridge/src/capture-site.mjs` | ACTIVE SOURCE OF TRUTH | Browser capture and raw DOM/CSS extraction. | Do not edit in Phase 1. |
| `RenderBridge/src/extract-layout-dom-faithful.mjs` | ACTIVE SOURCE OF TRUTH | Active layout extraction after capture. | Do not edit in Phase 1. |
| `RenderBridge/src/build-payload.mjs` | ACTIVE SOURCE OF TRUTH | Active payload entry. | Keep as entry; Phase 2 should remove version confusion behind it only after tests exist. |
| `RenderBridge/src/build-payload-core-v3.mjs` | CLEANUP CANDIDATE | Versioned payload file. | Verify imports before any cleanup. |
| `RenderBridge/src/build-payload-core-v4.mjs` | ACTIVE BUT CLEAN NAME LATER | Current active chain depends on it. | Do not rename until Phase 2 contract and tests are stable. |
| `RenderBridge/src/build-payload-core-v5.mjs` | ACTIVE BUT CLEAN NAME LATER | Current active chain depends on it. | Do not rename until Phase 2 contract and tests are stable. |
| `RenderBridge/src/professionalize-clone-model-v2.mjs` | ACTIVE BUT CLEAN NAME LATER | Versioned helper in active pipeline. | Classify for later cleanup; do not edit first. |
| `RenderBridge/tests/test-clean-contract.mjs` | TEST / VALIDATION | Existing contract test appears stale against current manifest. | Replace or repair early in Phase 2. |
| `RenderBridge/tests/test-v2-markers.mjs` | CLEANUP CANDIDATE | Version-marker test likely no longer matches active architecture. | Replace with active-flow gate in Phase 2. |
| `RenderBridge/tests/test-figma-renderer-dry-run.mjs` | TEST / VALIDATION | Useful dry-run idea, but expectations may be stale. | Repair after active manifest gate. |
| `.github/workflows/translateit-renderbridge-self-audit.yml` | TEST / VALIDATION | CI gate exists and should be preserved. | Do not edit in Phase 1. Update only after tests are aligned. |
| `audit-v*` / `server.alpha.v*` files | CLEANUP CANDIDATE | Versioned alpha/test files create confusion. | Inventory references before cleanup. |

## 6. Cleanup Decision Matrix

| Cleanup Candidate | Risk | Recommended Action | Timing | Approval Required |
|---|---|---|---|---|
| Multiple plugin renderer files | High | Confirm active renderer, update tests to active renderer, then remove unused renderers only after reference check. | Early Phase 2 | Yes |
| `plugin/ui.html` vs `plugin/ui-framework.html` | High | Confirm active UI from manifest and update stale tests. | Early Phase 2 | Yes |
| `build-payload-core-v3/v4/v5.mjs` | High | Keep active chain until tests exist; later consolidate behind non-versioned source-of-truth files. | Later Phase 2 | Yes |
| `professionalize-clone-model-v2.mjs` | Medium | Keep temporarily, then rename/consolidate only after contract tests pass. | Later Phase 2 | Yes |
| `test-clean-contract.mjs` | High | Replace marker expectations with active manifest/contract assertions. | Early Phase 2 | Yes |
| `test-v2-markers.mjs` | High | Replace with active current-flow gate. Do not create new versioned test names. | Early Phase 2 | Yes |
| `test-figma-renderer-dry-run.mjs` | Medium | Update to current active renderer messages and node expectations. | Early Phase 2 | Yes |
| Regression test only checking health | High | Expand regression to validate editable layers, sample output, and cleanup gate. | Early Phase 2 | Yes |
| Missing `scripts/audit-clean-workspace.ps1` reference | High | Confirm whether the file should exist; either create a current cleanup gate or update docs. | Before Phase 2 / Early Phase 2 | Yes |
| `audit-v*` files | Medium | Inventory imports and package references before cleanup. | Later Phase 2 | Yes |
| `server.alpha.v*` files | High | Confirm not used; remove only after active server gate passes. | Later Phase 2 | Yes |
| TranslateIT-to-DesignIT folder migration | Medium | Do not perform now. Create a future migration plan only after active flow is stable. | Can Wait | Yes |

## 7. Import Contract Plan

### Target Pipeline

```text
Website URL / Raw HTML
-> Browser Render Snapshot
-> DOM/CSS Extraction
-> Normalized Design Tree
-> Figma Render Plan
-> Editable Figma Scene Graph
```

### Node Types

DesignIT should normalize all imported content into these node types:

- `frame`
- `group`
- `text`
- `image`
- `shape`
- `button`
- `input`
- `icon`
- `card`
- `section`

### Contract Shape

```ts
type DesignITNode = {
  id: string
  type: "frame" | "group" | "text" | "image" | "shape" | "button" | "input" | "icon" | "card" | "section"
  name: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  style?: {
    fill?: string
    stroke?: string
    opacity?: number
    radius?: number
    shadow?: string
    fontFamily?: string
    fontSize?: number
    fontWeight?: number
    lineHeight?: number
    color?: string
  }
  text?: string
  asset?: {
    id: string
    kind: "image" | "svg" | "background" | "icon"
    source?: string
  }
  layout?: {
    mode?: "absolute" | "horizontal" | "vertical"
    gap?: number
    padding?: number[]
    alignment?: string
  }
  children?: DesignITNode[]
  editable: boolean
  source?: {
    domId?: string
    tag?: string
    className?: string
    role?: string
    confidence?: number
  }
  warnings?: string[]
}
```

### Required Fields

Every node must have:

- `id`
- `type`
- `name`
- `bounds`
- `editable`

Text nodes must also have non-empty `text` unless explicitly marked as a placeholder warning.

Image/icon/background nodes with visual content must either have a valid `asset.id` or a warning explaining the missing asset.

### Validation Rules

A node is invalid if:

- `id` is missing.
- `type` is outside the approved node type list.
- `bounds.width` or `bounds.height` is less than 1.
- `name` is empty or a raw debug name such as `undefined`, `null`, `raw-*`, or generic `Layer` without context.
- a text node has no text and no warning.
- an image node has no asset and no warning.

### Filtering Rules

Filter before rendering when:

- the node is hidden by display/visibility/opacity.
- the node has zero-size or near-zero bounds.
- the node is a parent text container that duplicates child text.
- the node is decorative noise with no useful visual or semantic value.

### Naming Rules

Names must be designer-readable and should follow this pattern:

```text
Section / Group / Purpose / Short Label
```

Examples:

- `Header / Navigation / Pricing`
- `Hero / Title / Build faster with DesignIT`
- `Card / Feature / Real-time import`
- `Form / Input / Email address`
- `Button / Primary / Start import`

### Asset Rules

- Real images should remain editable Figma image fills.
- SVG/icon assets should prefer vector-friendly handling in future development.
- Background images should be clearly named as background/media layers.
- Missing assets must not silently become blank layers.
- Component-slice raster assets must be treated as a temporary fallback, not the final professional target.

### Editability Rules

- Text must render as editable Figma text.
- Buttons must be editable groups or frames, not flat screenshots.
- Inputs must become editable field structures.
- Cards must become grouped editable surfaces with text/media children.
- Screenshot backing may be used only as a reference/debug aid, not as the primary professional output.

### Warning Rules

Warnings should be attached when:

- asset is missing.
- confidence is low.
- node was downgraded from vector to raster.
- text was reconstructed or deduplicated.
- layout is absolute because auto-layout confidence is low.
- color/font/style could not be faithfully mapped.

## 8. Golden Sample Plan

| Sample | Purpose | Required Editable Elements | Required Grouping | Pass Criteria |
|---|---|---|---|---|
| Simple landing page | Validate hero, navigation, CTA, image/media, and footer. | 8+ text layers, 1+ image, 1+ button, section backgrounds. | Header, Hero, Content, Footer. | 80%+ major layout match, editable text, no screenshot-only main output. |
| Dashboard/settings page | Validate dense UI, sidebar/topbar, cards, settings rows, toggles/buttons. | 20+ text layers, 4+ cards/rows, buttons/toggles if present. | Sidebar, Topbar, Settings Sections, Cards. | Clean layer hierarchy, no major text collisions, key labels editable. |
| Card grid | Validate repeated card structures and image/text combinations. | 6+ cards, card titles, card bodies, optional images/icons. | Section, Grid, Card Groups. | Repeated cards grouped consistently; no duplicate parent text spam. |
| Form/input page | Validate inputs, labels, placeholders, buttons, validation text. | 4+ input fields, labels, placeholder text, primary button. | Form Container, Fields, Actions. | Inputs rendered as editable field groups, not only rectangles or screenshots. |
| Navbar + content section | Validate navigation and structured content with mixed text/buttons/media. | Nav items, headings, body text, at least one CTA. | Header/Nav, Content Section, CTA Group. | Nav alignment preserved and readable; CTA editable. |

### Golden Sample Scoring

Each sample should be scored from 0 to 100 using:

- Text preservation: 20 points
- Layout accuracy: 20 points
- Layer cleanliness: 20 points
- Component editability: 20 points
- Asset/image handling: 10 points
- No duplicate/garbage layer behavior: 10 points

Minimum professional threshold:

- 80+ for a pass.
- 70–79 is reviewable but not professional-ready.
- Below 70 blocks professional approval.

## 9. Test Gate Plan

| Gate | Purpose | Command / Future Command | Must Catch |
|---|---|---|---|
| Active manifest gate | Confirm manifest points to the approved UI and renderer. | `npm run test:active-manifest` | Stale manifest, wrong renderer, wrong UI. |
| Active renderer gate | Confirm only the approved renderer is used by tests. | `npm run test:active-renderer` | Tests targeting old renderer files. |
| Module import gate | Confirm all active modules import cleanly. | `npm run test:imports` | Broken imports and missing modules. |
| Import contract gate | Validate `DesignITNode` / `cloneModel` / `figmaRenderPlan` structure. | `npm run test:contract` | Missing required fields, invalid nodes, empty text/image issues. |
| Figma dry-run gate | Mock Figma import and count real Figma primitives. | `npm run test:figma-dry-run` | Screenshot-only import, too few text/image/frame nodes, layer spam. |
| Golden sample gate | Validate fixed benchmark samples. | `npm run test:golden-samples` | Poor professional output quality. |
| Regression gate | Protect previously passing samples. | `npm run test:regression` | Quality regressions, missing key sections, broken output. |
| External visual engine gate | Verify OmniParser/UIED readiness or explicit fallback policy. | `npm run test:visual-engine` | Missing external visual parser, accidental fallback behavior. |
| No duplicate renderer gate | Confirm no active parallel renderer is used. | `npm run test:no-duplicate-renderer` | Multiple active renderers or wrong file patched. |
| No version/legacy/orphan gate | Prevent new versioned/legacy/orphan files. | `npm run test:workspace-clean` | New `v2/v3`, `legacy`, `backup`, `archive`, orphan files. |

Phase 2 should replace stale marker-based tests with active-flow tests. The test names should not include new version numbers.

## 10. Phase 2 Controlled Development Boundary

### Allowed First Patches

1. Align active manifest/test contract with the current source of truth: `plugin/ui-framework.html` and `plugin/code-framework-production.js`.
2. Repair or replace stale tests so they validate the active flow instead of older renderer files.
3. Create or repair the cleanup/no-orphan gate after approval.
4. Establish a current import contract gate for the active payload.
5. Add golden sample test scaffolding after the active contract is stable.

### Forbidden in First Patches

1. Renderer rewrite.
2. New pipeline.
3. Broad refactor.
4. Plugin UI polish.
5. Mass rename from TranslateIT to DesignIT.
6. Deleting files before active reference checks.
7. Creating `v1/v2/v3/v4/v5`, `legacy`, `archive`, `backup`, `old`, or `deprecated` files/folders.
8. Unrelated RustApp/runtime changes.

### Required Phase 2 Start Order

```text
1. Active manifest/test alignment
2. Active renderer/test alignment
3. Cleanup/no-orphan gate
4. Import contract gate
5. Golden sample gates
6. Extractor/renderer quality improvement
```

Phase 2 must not start with visual polish or component intelligence. It must start by making the current system measurable and safe to change.

## 11. File Changes Made in Phase 1

| File | Change Type | Reason |
|---|---|---|
| `DevelopingData/FigmaDesignExport/TranslateIT/DesignIT_PHASE_1_PROFESSIONAL_PLAN.md` | Created | Adds the English professional planning document for DesignIT Phase 1, including source-of-truth decisions, cleanup matrix, import contract plan, golden sample plan, test gate plan, and Phase 2 boundaries. |

No renderer, extractor, payload, test, CI, package, runtime, or plugin behavior files were modified in this Phase 1 documentation commit.

## 12. Commit Summary

| Item | Value |
|---|---|
| Committed | Yes |
| Commit message | `docs(designit): add phase 1 professional planning and cleanup strategy` |
| Files changed | `DevelopingData/FigmaDesignExport/TranslateIT/DesignIT_PHASE_1_PROFESSIONAL_PLAN.md` |
| Code behavior changed | No |
| Renderer/extractor/payload/test/runtime logic modified | No |
| New version/legacy/archive/backup files created | No |

## 13. Risk Notes

- The project still has multiple renderer files and versioned payload core files. These were not changed in Phase 1 because deleting or renaming them without active reference checks could break the flow.
- The active test suite is not yet reliable because several tests appear to target stale renderer/UI assumptions.
- Raw HTML input is still not active. It is planned for Phase 2 after the URL flow is made measurable and safe.
- The external visual engine dependency remains a setup and test risk. It needs a dedicated readiness gate before deeper development.
- The DesignIT name is now approved for product-facing planning, but folder/package migration is not approved yet.

## 14. Final Phase 1 Recommendation

**READY FOR PHASE 2 CONTROLLED DEVELOPMENT**

Reason:

Phase 1 has established the planning boundaries needed to begin controlled development. Phase 2 may start only with test/contract alignment, active flow cleanup gates, and golden sample gates. It must not start with renderer rewrite, extractor rewrite, UI polish, broad refactor, or mass renaming.

## 15. SYNC HANDOFF FOR NEXT PROMPT

```text
SYNC HANDOFF FOR NEXT PROMPT

Current Phase:
Phase 1 — DesignIT Professional Planning

Phase Status:
PASS

Final Recommendation:
READY FOR PHASE 2 CONTROLLED DEVELOPMENT

Can Continue to Phase 2:
YES, but only under controlled development boundaries.

DesignIT Naming Decision:
- Official product/plugin name: DesignIT.
- Current technical path remains: DevelopingData/FigmaDesignExport/TranslateIT.
- Do not mass-rename folders, packages, or code modules yet.
- Folder/package migration to DesignIT is a future explicit migration task, not part of initial Phase 2 patches.

Active Source of Truth:
- Plugin manifest: DevelopingData/FigmaDesignExport/TranslateIT/plugin/manifest.json
- Plugin UI: DevelopingData/FigmaDesignExport/TranslateIT/plugin/ui-framework.html
- Plugin renderer: DevelopingData/FigmaDesignExport/TranslateIT/plugin/code-framework-production.js
- RenderBridge server: DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/server.mjs
- Browser capture: DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/src/capture-site.mjs
- DOM/CSS extraction: capture-site.mjs and extract-layout-dom-faithful.mjs
- Payload entry: DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/src/build-payload.mjs
- Figma render plan: DevelopingData/FigmaDesignExport/TranslateIT/RenderBridge/src/build-figma-render-plan.mjs
- CI workflow: .github/workflows/translateit-renderbridge-self-audit.yml

Raw HTML Input Decision:
- Active now: No.
- Planned timing: Phase 2, after active manifest/test alignment and import contract gate.
- Notes: Raw HTML input must reuse the active import pipeline and must not create a parallel pipeline.

Cleanup Decisions:
- Confirm active renderer source of truth before editing renderer files.
- Align stale tests with the active manifest and active renderer.
- Replace stale v2/marker-based tests with current active-flow gates.
- Keep versioned payload core files temporarily until tests and contract gates are stable.
- Do not delete duplicate renderer files until active reference checks pass.
- Verify or repair the missing cleanup workspace script reference.
- Do not create legacy/archive/backup folders.

Files Changed in Phase 1:
- Created: DevelopingData/FigmaDesignExport/TranslateIT/DesignIT_PHASE_1_PROFESSIONAL_PLAN.md

Commit:
- committed: YES
- commit hash: [fill from commit result]
- commit message: docs(designit): add phase 1 professional planning and cleanup strategy

Approved Phase 2 First Scope:
- Patch active manifest/test contract alignment.
- Patch active renderer test alignment.
- Create or repair cleanup/no-orphan gate after approval.
- Establish active import contract gate.
- Add golden sample gates.
- Only after those gates are stable, improve extractor/renderer quality.

Forbidden Phase 2 Scope:
- No renderer rewrite as first patch.
- No new pipeline.
- No broad refactor.
- No plugin UI polish first.
- No mass rename from TranslateIT to DesignIT.
- No deleting files before active reference check.
- No v1/v2/v3/v4/v5 new files.
- No legacy/archive/backup/old/deprecated folders.
- No unrelated RustApp/runtime changes.

Blocking Issues Before Phase 2:
- Active test contract must be aligned with plugin/code-framework-production.js and plugin/ui-framework.html.
- Stale tests must be identified and repaired or replaced.
- Cleanup/no-orphan gate must be planned and approved before deleting files.
- Raw HTML input must be added only after URL pipeline gates are stable.
- External visual engine readiness must be testable.

Risk Notes:
- The branch remains technically promising but messy.
- Biggest risk is patching the wrong renderer, stale test, or versioned payload file.
- Professional quality must be measured through golden samples, not only marker tests.
- DesignIT naming is approved for product-facing planning, but technical migration is deferred.

Prompt Continuation Request:
Please generate the Phase 2 Controlled Development prompt based on this Phase 1 planning handoff. Keep the same strict rules: no v1/v2/v3/v4/v5 new files, no legacy/archive/backup folders, no parallel implementation, no broad refactor, no unrelated runtime/app changes, and patch only the approved active flow.
```

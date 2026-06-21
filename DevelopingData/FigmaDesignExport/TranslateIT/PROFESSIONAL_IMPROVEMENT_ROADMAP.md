# TranslateIT Professional Improvement Roadmap

## Product Direction

TranslateIT Version 0.1 - Alpha should move from an experimental website-to-layer importer into a professional visual reconstruction workflow.

The immediate goal is not to claim perfect native editability. The professional target is:

1. **Visual parity first**: the imported result must visually match the source website.
2. **Editable structure second**: text, image, section, and surface layers must remain accessible and organized.
3. **Reliable audit before manual test**: local self-audit must prove the result is reviewable before opening Figma.
4. **No misleading output**: every preview, score, and status must clearly explain whether it is visual-backed, editable reconstruction, or pure source reference.

---

## Phase 0 - Stabilize the Alpha Contract

### Goal
Lock the current alpha into a predictable and honest mode: **Visual-Backed Editable Clone**.

### Scope
- Keep `Version 0.1 - Alpha` as the public version.
- Keep `translateit-core / alpha-clean-1` as the active engine marker.
- Use `cloneModel` as the only active renderer contract.
- Keep screenshot as the visual truth.
- Keep editable reconstruction layers as a low-opacity grouped overlay.
- Remove ambiguity between engine preview, Figma simulation preview, and actual Figma output.

### Required Work
- Ensure plugin manifest points to the active visual-backed renderer.
- Ensure all tests read `manifest.main` instead of hardcoded renderer paths.
- Ensure plugin output structure is stable:

```txt
01 Visual-Backed Editable Clone
├─ Visual Backing / Source Screenshot
└─ Editable Reconstruction / Low Opacity
   ├─ Section / Header
   ├─ Section / Hero
   ├─ Section / Content
   └─ Section / Footer
```

### Exit Criteria
- Local self-audit pack includes a clear review dashboard.
- Figma Simulation Preview uses the same render structure as the plugin.
- Dry-run test validates the active renderer.
- No old renderer is accidentally used by tests or UI.

---

## Phase 1 - Professional Self-Audit Gate

### Goal
Make the local ZIP audit reliable enough to decide whether manual Figma testing is allowed.

### Scope
The self-audit should become the main QA gate. The user should not need to run Figma or visually inspect scattered files before the tool is ready.

### Required Work
- Add a single review dashboard:
  - Figma Simulation Preview
  - Engine Clone Preview
  - Source vs Clone Diff Overlay
  - Exit codes
  - Decision checklist
  - Readiness verdict
- Add explicit readiness states:
  - `Not Ready`
  - `Reviewable`
  - `Manual Figma Allowed`
- Make Figma Simulation Preview the primary review target.
- Add failure reasons that are understandable:
  - missing visual backing
  - simulation renderer mismatch
  - contract mismatch
  - high visual risk
  - missing image assets
  - page height mismatch
  - source screenshot missing

### Exit Criteria
- ZIP contains `reports/translateit-self-audit-review.html`.
- ZIP contains `reports/translateit-figma-sim-preview-latest.png`.
- Dashboard verdict is visible without reading logs.
- Manual Figma testing is blocked by policy unless dashboard says `Manual Figma Allowed`.

---

## Phase 2 - Visual Parity Foundation

### Goal
Make the alpha output visually professional by default.

### Scope
This phase improves visual correctness while keeping the visual-backed strategy.

### Required Work
- Improve screenshot capture stability:
  - wait for fonts
  - wait for lazy images
  - freeze animations where possible
  - normalize viewport/device scale
  - capture full-page source consistently
- Improve image handling:
  - preserve object-fit
  - preserve object-position
  - prevent stretched images in preview and Figma
  - detect missing assets
- Improve page and frame sizing:
  - source screenshot ratio must match visual backing frame
  - Figma Simulation Preview must match actual plugin size
  - no unexpected crop or extra whitespace
- Improve surface/background detection:
  - header/footer backgrounds
  - full-width colored sections
  - dark/light section transitions
- Add visual parity thresholds based on the Figma Simulation Preview, not only engine clone preview.

### Exit Criteria
- Figma Simulation Preview visually matches source screenshot at top viewport.
- No large blank bands.
- No stretched main screenshots.
- No missing major images.
- Visual backing gives professional presentation even if editable overlay is imperfect.

---

## Phase 3 - Editable Reconstruction Quality

### Goal
Improve the editable overlay so it becomes useful, not just present.

### Scope
The visual backing can remain the source of visual truth, but the editable overlay should become cleaner and closer to the actual website structure.

### Required Work
- Improve text reconstruction:
  - line grouping
  - text box width/height
  - font size and weight
  - line height
  - avoid duplicated hidden/animated text
- Improve layout grouping:
  - header/nav grouping
  - hero grouping
  - card/grid grouping
  - footer grouping
- Improve layer naming:
  - `Hero / Title`
  - `Navigation / Link`
  - `Image / ...`
  - `Section / Background`
  - `Footer Text / ...`
- Improve editability controls:
  - overlay opacity documented
  - easy hide/show visual backing
  - easy inspect editable reconstruction
- Reduce noise:
  - remove invisible elements
  - remove off-canvas elements
  - remove duplicated animation states

### Exit Criteria
- Editable overlay is readable in layer tree.
- Main text is editable and correctly grouped.
- Major images are represented as image layers.
- Footer/header structure is organized.
- Turning off visual backing shows a coherent approximate reconstruction.

---

## Phase 4 - Native Editable Mode

### Goal
Start moving from visual-backed alpha toward a stronger native editable clone.

### Scope
This is not the default mode until it passes quality gates. It should be developed behind an explicit mode flag.

### Required Work
- Add renderer modes:
  - `visual-backed-editable` default
  - `editable-reconstruction-preview` experimental
  - `source-reference-only` diagnostic
- Improve DOM-to-visual matching:
  - match visible text to screenshot regions
  - match images to screenshot regions
  - detect occlusion and stacking conflicts
- Add a reconstruction confidence score per layer.
- Add visual diff for overlay-only mode.
- Add warnings when native reconstruction is not reliable.

### Exit Criteria
- Native editable mode is only shown as experimental.
- Visual-backed mode remains stable and professional.
- Overlay-only preview can be evaluated independently.
- No false claim of 100% native editability.

---

## Phase 5 - Professional Plugin UX

### Goal
Make the Figma plugin feel like a professional import tool instead of a debug utility.

### Scope
Improve the user-facing import experience without hiding technical truth.

### Required Work
- Clear mode labels:
  - `Visual-Backed Editable Clone`
  - `Editable Reconstruction Overlay`
  - `Pure Source Reference`
- Add preflight checks:
  - RenderBridge reachable
  - correct engine/build
  - visual backing available
  - active renderer match
- Better status messages:
  - source capture started
  - cloneModel built
  - visual backing ready
  - import complete
- Add import summary panel:
  - sections
  - layers
  - images
  - text layers
  - visual backing status
- Add safe failure messages:
  - missing server
  - wrong branch/build
  - old plugin manifest
  - missing screenshot

### Exit Criteria
- Plugin UI is understandable without developer context.
- Import status is honest and actionable.
- User can identify whether they are seeing visual-backed or reconstruction-only output.

---

## Phase 6 - Regression Coverage and Sample Set

### Goal
Prevent improvements for one site from breaking other sites.

### Scope
Expand from one Mivubi sample into a small professional regression suite.

### Required Work
- Keep Mivubi as priority regression target.
- Add sample categories:
  - basic static landing page
  - image-heavy landing page
  - dark hero page
  - footer-heavy page
  - responsive layout page
- For each sample, generate:
  - source screenshot
  - Figma simulation preview
  - diff overlay
  - JSON report
- Add per-sample readiness verdict.

### Exit Criteria
- Regression dashboard shows all sample verdicts.
- Mivubi remains priority but no longer the only confidence source.
- New patches must not reduce previous visual quality without being flagged.

---

## Phase 7 - Production Readiness

### Goal
Prepare TranslateIT for a controlled alpha release workflow.

### Scope
Focus on stability, repeatability, and documentation.

### Required Work
- One-terminal start command remains supported.
- Local self-audit command remains supported.
- Documentation clearly explains:
  - what alpha can do
  - what alpha cannot do yet
  - how visual-backed mode works
  - how to inspect editable layers
- Add troubleshooting guide:
  - failed fetch
  - port 8844 conflict
  - wrong plugin path
  - outdated manifest
  - missing Playwright browser
- Add versioned changelog.

### Exit Criteria
- A new user can run the tool using documented commands.
- Audit output is understandable.
- Manual Figma test is only done after local gates pass.
- Known limitations are documented honestly.

---

## Priority Order

### Immediate Priority
1. Phase 1 - Professional Self-Audit Gate
2. Phase 2 - Visual Parity Foundation
3. Phase 3 - Editable Reconstruction Quality

### Medium Priority
4. Phase 5 - Professional Plugin UX
5. Phase 6 - Regression Coverage

### Later Priority
6. Phase 4 - Native Editable Mode
7. Phase 7 - Production Readiness

---

## Definition of Professional Result

TranslateIT should be considered professionally acceptable for alpha when:

```txt
- The visual result shown in Figma Simulation Preview matches the source website closely enough for presentation.
- The actual Figma plugin follows the same structure as the simulation preview.
- The imported Figma frame includes a locked visual backing layer.
- Editable reconstruction layers are grouped, named, and inspectable.
- The audit dashboard clearly says whether manual Figma testing is allowed.
- No test, preview, or UI copy falsely claims full native reconstruction when visual backing is still required.
```

---

## Current Strategic Decision

For Version 0.1 - Alpha, the default professional path is:

```txt
Visual-Backed Editable Clone first.
Native Editable Reconstruction later.
```

This protects visual quality while still allowing the editable reconstruction engine to improve step by step.

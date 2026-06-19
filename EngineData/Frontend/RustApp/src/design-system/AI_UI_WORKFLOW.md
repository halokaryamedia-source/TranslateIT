# TranslateIT UI Workflow for AI / Chat Contributors

This document is the mandatory UI workflow for every AI, ChatGPT, Codex, or human contributor working on the TranslateIT launcher UI.

The goal is simple: keep the UI professional, modular, Figma-like, and safe to edit without breaking unrelated pages.

---

## 1. Current Approved UI Baseline

All approved UI pages are treated as locked baselines unless the user explicitly asks to revise them.

| Page | Status | CSS Module | Allowed Scope |
| --- | --- | --- | --- |
| Main Page | Approved | `src/mainPageLayout.css` | `body:not(.settings-open)`, `.workspace`, `.sidebar` |
| Audio Settings | Approved | `src/audioSettingsLayout.css` | `.settings-view--audio` |
| Translate Settings | Approved | `src/translateSettingsLayout.css` | `.settings-view--translate` |
| Developer Settings | Approved | `src/developerSettingsLayout.css` | `.settings-view--developer` |

Approved page ownership is also registered in:

```text
src/design-system/components/approved-pages.components.json
```

Figma export/handoff files are stored in:

```text
src/design-system/figma-export/
src/design-system/figma-plugin/
```

---

## 2. Required Layer Order

The active app imports must stay modular and predictable.

Expected order in `src/main.ts`:

```ts
import "./styles.css";
import "./launcherGuard.css";
import "./professionalUi.css";
import "./referenceLayout.css";
import "./mainPageLayout.css";
import "./audioSettingsLayout.css";
import "./translateSettingsLayout.css";
import "./developerSettingsLayout.css";
```

Rules:

- Base/shared styling comes first.
- Page-specific approved modules come after shared layout.
- Do not re-add broad legacy override layers unless explicitly approved.
- Do not create temporary lock/override files unless the file has a clear page/module scope.

---

## 3. Design System Source of Truth

Use these files as the design system source of truth:

```text
src/design-system/translateit.tokens.json
src/design-system/components/approved-pages.components.json
src/design-system/components/main-page.components.json
```

Use `translateit.tokens.json` for shared values:

- colors
- spacing
- radius
- typography
- reusable layout dimensions
- component measurements

Use page CSS modules for approved visual implementation.

Do not hardcode a shared value in multiple CSS files. If the value is shared across pages, move it into tokens first.

---

## 4. Safe Edit Rule

Only edit the module that owns the page or component being changed.

Examples:

| Requested Change | Correct File | Do Not Edit |
| --- | --- | --- |
| Composer spacing | `mainPageLayout.css` | `audioSettingsLayout.css`, `referenceLayout.css` |
| Sidebar account card | `mainPageLayout.css` | Settings modules |
| Audio microphone card | `audioSettingsLayout.css` | Main Page module |
| Translate language selector | `translateSettingsLayout.css` | Audio/Developer modules |
| Developer diagnostic card | `developerSettingsLayout.css` | Audio/Translate modules |

Always scope selectors tightly.

Good examples:

```css
body:not(.settings-open) .composer { ... }
.settings-view--audio .settings-card--audio { ... }
.settings-view--translate .language-grid { ... }
.settings-view--developer .developer-log-card { ... }
```

Bad examples:

```css
button { ... }
.icon { ... }
.settings-card { ... }
.composer { ... } /* without page guard */
svg { ... }
```

---

## 5. Strict Prohibitions

Never do these unless the user explicitly approves a full refactor:

- Do not use `!important`.
- Do not use broad global selectors for page-specific changes.
- Do not edit multiple page modules in one visual pass.
- Do not change Settings when the user asked for Main Page only.
- Do not change Main Page when the user asked for Audio/Translate/Developer only.
- Do not claim `done`, `final`, or `100%` before the user approves the preview.
- Do not remove approved modules without rollback plan.
- Do not add arbitrary new CSS layers named vaguely like `fix.css`, `final.css`, `override.css`, or `temp.css`.

---

## 6. Mandatory Work Process

Every UI change must follow this sequence.

### Step 1 — Identify target page

Confirm which page/module is being edited:

```text
Main Page -> mainPageLayout.css
Audio Settings -> audioSettingsLayout.css
Translate Settings -> translateSettingsLayout.css
Developer Settings -> developerSettingsLayout.css
```

### Step 2 — Fetch latest file first

Always fetch the latest file from the active branch before editing.

### Step 3 — Edit only the owner module

Keep the selector scoped to the target page.

### Step 4 — Commit small changes

Use a specific commit message.

Good examples:

```text
ui: align main page composer to approved reference
ui: tune audio settings microphone card spacing
ui: refine translate settings language selector
ui: adjust developer diagnostic log card
```

### Step 5 — Provide preview

Every visual change must include a full-page preview link.

Required response format:

```text
Dikerjakan:
- <short summary>

Commit:
- <sha>

Preview:
- <sandbox preview link>

Status:
- Belum final / Menunggu approve
```

### Step 6 — Wait for approval

Only mark a page approved after the user says approve/setuju.

---

## 7. Preview Rules

Preview is mandatory for visual changes.

Rules:

- Use full-page preview, not cropped preview.
- Preview must match the page being edited.
- If the preview link fails, regenerate/reupload it.
- Do not ask the user to approve without preview.
- Do not claim visual accuracy without showing preview.

Approved preview categories:

```text
Main Page Preview
Audio Settings Preview
Translate Settings Preview
Developer Settings Preview
```

---

## 8. Approval Gate

Use these statuses:

| Status | Meaning |
| --- | --- |
| `Draft` | Work in progress, not ready for approval |
| `Preview Ready` | Preview is available for user check |
| `Approved` | User explicitly approved |
| `Rollback Required` | User says worse/not matching |

If user says the result is worse:

1. Roll back the last visual change.
2. Do not stack another override layer on top.
3. Return to the last approved baseline.
4. Re-attempt only after identifying the exact mismatch.

---

## 9. Figma Handoff Workflow

Approved pages are export-ready through:

```text
src/design-system/figma-export/translateit.approved-ui.figma-export.json
src/design-system/figma-plugin/manifest.json
```

Recommended Figma workflow:

1. Open Figma.
2. Plugins -> Development -> Import plugin from manifest.
3. Select:

```text
src/design-system/figma-plugin/manifest.json
```

4. Run `TranslateIT Design Importer`.
5. Paste the content of:

```text
src/design-system/figma-export/translateit.approved-ui.figma-export.json
```

6. Import.

When changes are made in Figma and ported back to code:

| Figma Change | Code Destination |
| --- | --- |
| Shared color/spacing/radius/font | `translateit.tokens.json` |
| Page ownership/component map | `approved-pages.components.json` |
| Main Page visual | `mainPageLayout.css` |
| Audio Settings visual | `audioSettingsLayout.css` |
| Translate Settings visual | `translateSettingsLayout.css` |
| Developer Settings visual | `developerSettingsLayout.css` |

---

## 10. Validation Commands

Do not run build/test/validation unless the user asks.

Available commands:

```text
npm run validate:figma-export
npm run audit:css-priority
npm run audit:ui-design
npm run validate:ui-reference
npm run validate:ui-template
npm run typecheck
npm run build:frontend
```

Recommended lightweight validation after UI edits, when allowed:

```text
npm run audit:css-priority
npm run validate:figma-export
npm run typecheck
```

---

## 11. AI Response Rules

For this project, AI/chat responses must stay concise.

Use this style:

```text
Dikerjakan:
- <what changed>

Commit:
- <sha>

Preview:
- <link>

Status:
- Menunggu approve
```

Avoid long explanations unless the user asks for documentation, audit, or planning.

Be honest:

- Say `belum final` if not approved.
- Say `belum dijalankan` if validation/build/test was not run.
- Say `rollback dilakukan` if reverting.
- Do not invent build/test results.

---

## 12. Future AI Starter Prompt

Use this prompt when continuing UI work in another AI/chat session:

```text
You are continuing TranslateIT UI work on GitHub repo halokaryamedia-source/TranslateIT, branch Dev-Rust.
Follow src/design-system/AI_UI_WORKFLOW.md strictly.
Approved page modules:
- Main Page: src/mainPageLayout.css
- Audio Settings: src/audioSettingsLayout.css
- Translate Settings: src/translateSettingsLayout.css
- Developer Settings: src/developerSettingsLayout.css

Rules:
- Fetch latest file before editing.
- Edit only the owning page module.
- Keep selectors scoped.
- Do not use !important.
- Do not add broad global overrides.
- Always provide a full-page preview after visual changes.
- Do not claim final until user approves.
- Do not run build/test/validation unless explicitly asked.
```

---

## 13. Final Principle

Treat the UI like a Figma component library mapped into code.

Every page must be:

- modular
- scoped
- previewed
- approved
- documented
- safe to edit independently

Do not make the UI look clean by making the code messy. The structure matters as much as the screenshot.

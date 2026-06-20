# TranslateIT UI Build Package

This folder defines the export format used after Figma review.

The goal is not only to make a Figma design, but to export a structured UI package that can be processed into frontend code and connected to backend actions.

## Workflow

```txt
Single self-contained HTML package
        ↓
HTML contract validator
        ↓
Figma plugin import
        ↓
One editable Figma page
        ↓
User edits/reviews visual structure
        ↓
Export UI Build Package JSON
        ↓
UI Build Package validator
        ↓
Component contract checker
        ↓
UI Sync Gate
        ↓
Component registry generation
        ↓
Codegen tool creates frontend scaffold
        ↓
Backend adapter connects actions/state/component state
```

## Pre-Figma HTML Validation

Before opening Figma, run:

```powershell
node .\tools\validate-single-html-package.mjs ..\Samples\single-html-ready-sample.html
```

This catches obvious input issues before the plugin is used.

It checks:

- empty HTML;
- missing embedded style block;
- external stylesheet links;
- script tags;
- missing `data-component`;
- missing `data-action`;
- missing `data-backend` for actions;
- missing `data-bind` / `data-slot`;
- missing SVG symbols for `data-icon`;
- unsupported CSS patterns.

## File Produced by Figma Plugin

Save the plugin export as:

```txt
ui-build-package.json
```

The package contains:

- metadata;
- target runtime information;
- quality readiness metadata;
- design tokens;
- icon master references;
- component candidates;
- backend binding metadata;
- screen tree;
- integration contract.

## Package Validation

After export, run:

```powershell
node .\tools\validate-ui-build-package.mjs .\ui-build-package.json
```

This confirms the package is structurally usable for codegen.

## Component Contract Check

Run:

```powershell
node .\tools\check-component-contract.mjs .\ui-build-package.json
```

This checks whether components follow the TranslateIT component contract:

- `Category / Name` component naming;
- interactive components should define `data-action`;
- actions should define `data-backend`;
- non-button interactive elements should define `role="button"`;
- dynamic/status/output components should define `data-bind` or `data-slot`;
- layout dimensions should exist.

## Sync Gate

Before considering runtime sync, run:

```powershell
node .\tools\run-ui-sync-gate.mjs .\ui-build-package.json
```

The sync gate is stricter than codegen validation.

It should fail or warn when:

- readiness is `BLOCKED`;
- readiness score is below sync threshold;
- generated tree is missing;
- design-only sections leaked into the exported tree;
- action bindings are missing;
- state/slot bindings are missing;
- icon instance workflow is missing;
- icon SVG payloads are missing.

Passing the sync gate does not replace visual approval. It only means the package is structurally safe enough for the next stage.

## Component Registry

Generate a standalone component registry from an exported package:

```powershell
node .\tools\generate-component-registry.mjs .\ui-build-package.json .\component-registry.json
```

Codegen also writes:

```txt
GeneratedFrontend/component-registry.json
```

The registry infers:

- component id;
- component name;
- type;
- variant;
- state;
- size;
- action;
- backend command;
- state binding;
- slot binding;
- layout and style snapshot.

Type inference currently supports:

```txt
screen
toolbar
button
input
card
modal
status
icon
frame
```

## Backend Binding Attributes

Add these attributes in the single HTML package before importing to Figma:

```html
<button data-component="Button / New Chat" data-action="chat.new" data-backend="chat_new">
  New Chat
</button>

<span data-component="Status / Worker" data-bind="worker.status">
  Ready
</span>

<div data-slot="translation.output"></div>
```

Meaning:

- `data-action`: frontend event that should call backend/Tauri/local worker.
- `data-backend`: explicit backend command name.
- `data-bind`: frontend value that should be updated from backend state.
- `data-slot`: dynamic content area.
- `data-component`: stable component/layer name.

## Generated Frontend Package

The codegen tool outputs:

```txt
GeneratedFrontend/
├─ index.html
├─ styles.css
├─ ui-runtime.js
├─ backend-adapter.js
├─ ui-bindings.json
├─ component-registry.json
├─ ui-package-report.md
└─ README.md
```

This is not automatically copied into the app runtime. It is a reviewable frontend scaffold.

Generated runtime helpers:

```txt
updateBinding(name, value)
updateSlotText(name, value)
setComponentState(componentId, state)
```

After approval, it can be mapped into:

```txt
EngineData/Frontend/RustApp/src/app/active-launcher/
```

## Safety Rule

Do not directly overwrite runtime UI from a Figma export. Use generated frontend as a reviewable intermediate artifact first.

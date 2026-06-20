# TranslateIT UI Build Package

This folder defines the export format used after Figma review.

The goal is not only to make a Figma design, but to export a structured UI package that can be processed into frontend code and connected to backend actions.

## Workflow

```txt
Single self-contained HTML package
        ↓
Figma plugin import
        ↓
One editable Figma page
        ↓
User edits/reviews visual structure
        ↓
Export UI Build Package JSON
        ↓
Codegen tool creates frontend scaffold
        ↓
Backend adapter connects actions/state
```

## File Produced by Figma Plugin

Save the plugin export as:

```txt
ui-build-package.json
```

The package contains:

- metadata;
- target runtime information;
- design tokens;
- icon master references;
- component candidates;
- backend binding metadata;
- screen tree;
- integration contract.

## Backend Binding Attributes

Add these attributes in the single HTML package before importing to Figma:

```html
<button data-component="Button / New Chat" data-action="chat.new">
  New Chat
</button>

<span data-component="Status / Worker" data-bind="worker.status">
  Ready
</span>

<div data-slot="translation.output"></div>
```

Meaning:

- `data-action`: frontend event that should call backend/Tauri/local worker.
- `data-bind`: frontend value that should be updated from backend state.
- `data-slot`: dynamic content area.
- `data-backend`: optional explicit backend command name.
- `data-component`: stable component/layer name.

## Generated Frontend Package

The codegen tool should output:

```txt
GeneratedFrontend/
├─ index.html
├─ styles.css
├─ ui-runtime.js
├─ ui-bindings.json
└─ README.md
```

This is not automatically copied into the app runtime. It is a reviewable frontend scaffold.

After approval, it can be mapped into:

```txt
EngineData/Frontend/RustApp/src/app/active-launcher/
```

## Safety Rule

Do not directly overwrite runtime UI from a Figma export. Use generated frontend as a reviewable intermediate artifact first.

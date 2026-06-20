# TranslateIT Figma Component Contract

This document defines the supported component contract for the Figma Design Export workflow.

The goal is to keep generated Figma layers, exported UI Build Package JSON, and frontend codegen consistent.

## Required Base Attributes

Every meaningful UI block should use:

```txt
data-component
```

Recommended format:

```txt
Category / Name
```

Examples:

```txt
Screen / Main Shell
Toolbar / Main
Button / New Chat
Composer / Translation Input
Card / Voice Input
Status / Worker
```

## Interaction Attributes

Use these for interactive UI:

```txt
data-action
data-backend
```

Rules:

- `data-action` is the frontend event name.
- `data-backend` is the Tauri/backend command name.
- Interactive controls should define both.
- If `data-backend` is missing, codegen may fallback to `data-action`, but sync gate should warn.

Recommended action naming:

```txt
chat.new
settings.open
translation.send
voice.record
```

Recommended backend naming:

```txt
chat_new
settings_open
translation_send
voice_record
```

## State and Output Attributes

Use these for runtime state and dynamic output:

```txt
data-bind
data-slot
```

Rules:

- `data-bind` is for state values that can update existing text.
- `data-slot` is for dynamic output areas.
- Every screen should normally have at least one state or slot binding.

Examples:

```txt
worker.status
translation.output
composer.placeholder
voice.status
```

## Icon Attributes

Use:

```txt
data-icon
```

Rules:

- Each `data-icon` should match an SVG symbol id when possible.
- Plugin fallback icons are allowed for smoke tests.
- Production UI should define explicit SVG symbols or icon registry entries.

Examples:

```txt
plus
send
mic
settings
alert
check
```

## Optional Semantic Attributes

Future-friendly attributes:

```txt
data-component-type
data-variant
data-state
data-size
role
aria-label
```

Recommended values:

```txt
data-component-type="button"
data-component-type="input"
data-component-type="card"
data-component-type="status"
data-component-type="modal"

data-variant="primary"
data-variant="secondary"
data-variant="danger"
data-variant="ghost"

data-state="default"
data-state="active"
data-state="disabled"
data-state="loading"
data-state="error"

data-size="sm"
data-size="md"
data-size="lg"
```

These attributes should be preserved through plugin metadata and later used by codegen.

## Supported CSS Contract

Use simple, predictable CSS:

```txt
display: flex
flex-direction: row | column
gap
padding
width
height
min-width
min-height
background
background-color
color
border
border-color
border-width
border-radius
opacity
font-size
font-weight
align-items
justify-content
```

Avoid using these as core layout requirements:

```txt
CSS grid
absolute / fixed / sticky positioning
media queries
container queries
pseudo-elements
pseudo-classes
animation / keyframes
transform
external url assets
box-shadow
filter / backdrop-filter
complex selectors
```

The plugin may warn, approximate, or ignore unsupported features.

## Naming Rules

Good names:

```txt
Button / Send Translation
Card / Text Input
Status / Worker
Composer / Translation Input
Modal / Settings
```

Avoid names like:

```txt
div1
frame copy 3
button-new-final-final
untitled
```

## Do Not Sync Rules

Do not sync generated package into app runtime if:

- readiness is `BLOCKED`;
- readiness score is below 70;
- expected `data-action` values are missing;
- expected `data-backend` values are missing;
- expected `data-bind` or `data-slot` values are missing;
- design-only sections leaked into exported UI tree;
- unsupported CSS controls major layout;
- manual Figma edits were not recorded back into repo source.

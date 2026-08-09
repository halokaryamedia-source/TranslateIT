# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product Shell & Readiness source aligned; local/rendered verification blocked in current ChatGPT environment

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> one relevant canonical owner/source only
```

## Current State

Completed boundaries:

```text
context recovery
product foundation recovery
source ownership reconciliation
development/governance rules consolidation
project skill architecture establishment
Product Shell & Readiness source implementation
static source/contract verification for Product Shell & Readiness
```

Current architecture remains:

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

No new launcher, engine, product shell, AI runtime, audio pipeline, or packaging owner was introduced.

## Product Shell & Readiness Result

Current source follows the approved hierarchy:

```text
Meeting
Text
Documents
History
Saved
Settings
```

Static source currently establishes:

- `main.ts` still starts `SimpleLauncherController`;
- Meeting is the default/primary workspace;
- Text remains a usable standalone translation surface;
- Documents, History, and Saved are truthful unavailable surfaces until their own implementations are connected;
- normal recovery uses `Retry`, `Fix Setup`, and `Open Diagnostics` instead of direct `Start Helper` / `Check Worker` controls;
- detailed engineering/runtime controls remain under Settings -> Advanced -> Developer Diagnostics;
- canonical user-facing mode naming is `Realtime / Quality`;
- `runtimeProductFacade` remains the product-facing readiness owner;
- Meeting readiness consumes the existing live-meeting runtime gate plus virtual-route readiness rather than helper/model/microphone presence alone;
- technical blocker detail remains available for Diagnostics while normal Meeting copy remains product-level.

## Scope Preserved

This slice did **not** implement or redesign:

```text
AI models/providers
helper/runtime architecture
Session Listening/VAD runtime mechanics
meeting virtual-audio mechanics
tone/context inference
History/Saved persistence
DOCX/PDF document workflow
Audio Studio provider/profile generation
installer/package behavior
```

## Verification Attempt

The requested targeted local/rendered verification was attempted from the current ChatGPT execution environment.

Available here:

```text
GitHub repository/source access
Node.js
TypeScript compiler
static source/contract inspection
```

Unavailable here:

```text
local TranslateIT checkout
GitHub CLI (`gh`)
Windows/Tauri desktop session
GUI/rendered application target
connector action for GitHub workflow_dispatch
```

The `New` branch contains manual GitHub Actions workflows, including `TranslateIT V1 Advance Primary CI`, but that workflow is `workflow_dispatch` only. The current `7a3158b89bd3d295d16957cdeb3cfddaf1be7a02` source commit has no associated workflow run, and this connector cannot dispatch it.

Creating a new CI trigger/workflow solely to obtain a PASS would violate the project proof/anti-slop rules, so no CI ceremony was added.

Additional static inspection confirmed that the existing translation-flow validator remains compatible with the current Text path and that the active controller does not depend on the legacy `bindUi()` selector set in `dom.ts`. No adjacent cleanup was performed.

## Proof State

**CURRENT-PROJECT VERIFIED**

At repository/static level:

- Product Shell source ownership and navigation hierarchy are aligned;
- normal-user recovery and Advanced/Developer separation are represented in the active source;
- Meeting readiness mapping uses the current live-meeting/virtual-route gate;
- stale `Fast` naming is removed from the active Translation settings source;
- affected direct source validators were reconciled with the new product contract;
- current source-ownership map now reflects Slice 1 as source-aligned rather than pending implementation.

**LOCAL PROOF REQUIRED**

Still unproven:

- TypeScript check executed against the complete real checkout;
- targeted source validators executed from the complete checkout;
- frontend build on the real checkout;
- rendered Meeting/Text/Documents/History/Saved/Settings navigation;
- actual click/back/settings behavior in Tauri;
- Windows readiness-state transitions;
- any microphone/CUDA/model/TTS/virtual-route live behavior.

## Hold

Do not advance to the Canonical Settings Contract slice from static proof alone. Product Shell acceptance still requires the targeted local/rendered desktop check.

## Next Step

Run the current `New` branch in a **Codex/local Windows checkout** and perform the targeted Product Shell & Readiness acceptance check: execute the existing relevant frontend/type/source-contract checks, launch the Tauri app, and verify Meeting-first navigation plus normal `Retry / Fix Setup / Open Diagnostics` versus Advanced/Developer Diagnostics behavior.

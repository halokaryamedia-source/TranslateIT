# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Product Shell & Readiness source aligned; local/rendered proof required

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
```

Current architecture remains:

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

No new launcher, engine, product shell, AI runtime, audio pipeline, or packaging owner was introduced.

## Product Shell & Readiness Result

Current static source now follows the approved product hierarchy:

```text
Meeting
Text
Documents
History
Saved
Settings
```

Key boundaries:

- `SimpleLauncherController` remains the active controller from `main.ts`;
- Meeting is the default/primary workspace;
- Text remains a usable standalone translation surface;
- Documents, History, and Saved are explicit truthful unavailable surfaces until their own implementations are connected;
- normal shell recovery uses `Retry`, `Fix Setup`, and `Open Diagnostics` rather than direct `Start Helper` / `Check Worker` controls;
- detailed engineering/runtime controls remain under Settings -> Advanced -> Developer Diagnostics;
- canonical user-facing mode naming is `Realtime / Quality`;
- product readiness consumes the existing live meeting runtime gate and virtual-route readiness instead of treating helper/model/microphone presence alone as Meeting-ready;
- existing `runtimeProductFacade` remains the product-facing readiness boundary.

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

## Proof State

**CURRENT-PROJECT VERIFIED**

Static source/contract evidence supports:

- `main.ts` still starts `SimpleLauncherController`;
- Meeting-first navigation and product-level recovery are represented in the active shell/controller;
- normal shell no longer owns direct helper/worker operations;
- `runtimeProductFacade` maps the existing live meeting gate/virtual route into Meeting readiness;
- `Realtime` replaces stale `Fast` in the active Translation settings source;
- affected source validators were reconciled to the current product contract rather than the superseded text-first/helper-first UI.

**LOCAL PROOF REQUIRED**

The ChatGPT -> GitHub channel has not rendered or run the Tauri app. Therefore this slice does not yet prove:

- final visual composition/responsiveness;
- actual click/navigation behavior in the rendered desktop app;
- runtime readiness transitions on Windows;
- live meeting-route delivery or any microphone/CUDA/model/TTS behavior.

## Hold

Do not advance to the Settings-contract slice merely from static source proof. The Product Shell acceptance boundary includes rendered/local desktop behavior and should be checked before the next product slice.

## Next Step

Run the targeted local/rendered **Product Shell & Readiness verification** on the current `New` branch: launch the Tauri app, verify Meeting-first navigation and normal-vs-Advanced recovery surfaces, and run the existing targeted frontend/type/source-contract checks relevant to this slice.

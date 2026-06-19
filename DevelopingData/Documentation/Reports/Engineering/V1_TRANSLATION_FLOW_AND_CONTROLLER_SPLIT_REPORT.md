# V1 Translation Flow and Controller Split Report

Branch: `fix/v1-translation-flow-and-controller-split`

## Purpose

Continue the V1 repair after user/engine flow integrity was restored. This pass focuses on reducing translation runtime inefficiency and preparing a safer frontend controller split.

## Repair 1 — Text translation prefers the running helper bridge

Updated:

```text
EngineData/Frontend/RustApp/src-tauri/src/commands/translation.rs
```

Before this pass, the `translate_text` command always entered the engine manual translation path, which could spawn a worker process through `python`/`py` for each translation attempt.

After this pass, `translate_text` now follows this order:

```text
1. Try running helper bridge if it is already ready and provider-ready.
2. Send translation request to the existing helper bridge process.
3. Return translated text if the helper response contains validated `translated_text`.
4. Fall back to the existing engine manual translation path when helper bridge is unavailable, blocked, or returns no translated output.
```

This keeps backwards compatibility while reducing repeated worker spawning when the long-lived helper process is already available.

## Repair 2 — Frontend text translation controller boundary

Added:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/controller/textTranslationController.ts
```

This module contains the extracted target flow for text translation:

- source validation;
- user message saving;
- runtime translation call;
- local preview fallback;
- assistant response saving;
- translation result view construction;
- user-flow trace reporting.

The large `launcherController.ts` is intentionally not mass-rewritten in this pass because it is still a high-risk file. This controller boundary creates the next safe migration point.

## Repair 3 — Translation flow validator

Added:

```text
EngineData/Frontend/RustApp/scripts/validate_translation_flow_integrity.mjs
```

Updated:

```text
EngineData/Frontend/RustApp/package.json
```

New command:

```text
npm run validate:translation-flow
```

`npm run validate:quick` now includes translation-flow validation.

## Compatibility

This pass keeps existing user-facing command names stable:

```text
translate_text
runtimeApi.translateText
```

Existing fallback remains available through `engine::translate_text`.

## Remaining risk

1. `launcherController.ts` still owns too many responsibilities and should be split gradually.
2. The helper bridge translation path depends on the worker command returning a `translated_text` field.
3. Helper bridge translation currently waits for the worker response through the existing bridge stdout protocol. Full timeout isolation should be added in a later runtime-hardening pass.
4. Voice capture/runtime setup UX still needs a clearer setup wizard for worker/model/provider readiness.

## Required validation

Run from:

```text
EngineData/Frontend/RustApp
```

Command:

```text
npm run validate:quick
```

Manual checks:

1. Start the app.
2. Submit text without starting helper; confirm fallback/local preview still appears if models are missing.
3. Start helper from Developer Diagnostics.
4. Submit text again; confirm translation attempts use the helper bridge when provider readiness is available.
5. Confirm failed worker/provider state still produces actionable diagnostics, not a silent failure.

## Current claim

This PR improves translation flow architecture and adds the first frontend controller split boundary. It does not claim full voice translation runtime readiness or target-PC model/CUDA readiness.
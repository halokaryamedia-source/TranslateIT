# Active Launcher Controller Boundary

This folder is reserved for the next frontend modularization pass.

## Current issue

`src/app/active-launcher/launcherController.ts` is still the central runtime coordinator for too many responsibilities:

- startup and warmup;
- runtime status rendering;
- assistant/user-facing notices;
- chat session handling;
- attachment ingestion;
- manual text translation;
- voice capture orchestration;
- settings navigation/rendering;
- developer diagnostics wiring.

This is not a single-file app monolith anymore, but it is still a large controller bottleneck.

## Target split

Future safe refactors should move cohesive behavior into small controllers:

```text
controller/
  runtimeStatusController.ts
  translationController.ts
  captureController.ts
  settingsController.ts
  attachmentController.ts
  chatSessionController.ts
  assistantNoticeController.ts
```

## Migration rule

Do not split all behavior at once.

Each extraction should:

1. move one responsibility only;
2. keep public behavior unchanged;
3. keep `launcherController.ts` as the orchestration shell until all calls are stable;
4. run `npm run validate:quick` locally before merging;
5. avoid changing UI layout and runtime bridge behavior in the same commit.

## Ownership goal

`launcherController.ts` should eventually coordinate controllers, not directly own every runtime behavior branch.
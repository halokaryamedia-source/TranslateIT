# V1 Startup Runtime Readiness Report

Branch: `fix/v1-app-startup`

## Purpose

Prepare TranslateIT for a more effective final local test by making the app perform runtime readiness work automatically after it opens.

The goal is not to remove local validation from engineering. The goal is to make the user-facing app attempt the correct runtime checks and helper startup by itself so the user does not need to manually run validators before basic use.

## Improvements

### 1. Startup runtime self-check

Added:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/startupReadinessBinding.ts
```

The app now checks after launch:

- model inventory;
- GPU policy;
- helper bridge status;
- realtime status payload;
- latency target/last/p50 when provided by runtime.

If required models are visible and helper/provider is not ready, the app attempts to start the helper once per session.

This means the app tries to move toward usable runtime state when opened instead of requiring the user to manually open Developer Diagnostics first.

### 2. Settings autosave

Added:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/settingsAutosaveBinding.ts
```

Runtime-backed settings changes now schedule a save automatically when users change connected controls such as:

- runtime profile;
- language focus;
- voice output;
- realtime/quality mode;
- language pair controls.

This reduces the chance that settings appear changed in UI but are not persisted.

### 3. App entrypoint wiring

Updated:

```text
EngineData/Frontend/RustApp/src/main.ts
```

The app now starts:

- startup readiness binding;
- settings autosave binding;
- existing helper/voice/readiness monitors.

Cleanup is registered on `beforeunload`.

### 4. Validation profile

Added:

```text
EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs
```

Updated:

```text
EngineData/Frontend/RustApp/package.json
```

New command:

```text
npm run validate:startup-readiness
```

`npm run validate:quick` now includes startup readiness validation.

## Expected behavior after merge

When the app opens:

1. UI loads without needing manual validator first.
2. App checks local model inventory.
3. App checks GPU policy.
4. App checks helper status.
5. If models are visible and helper is not ready, app attempts helper startup once for that session.
6. Status pills show engine/model/helper/GPU/latency state.
7. Connected settings changes are autosaved.

## What still cannot be honestly claimed until target-PC test

This PR cannot prove by GitHub inspection alone that:

- CUDA actually runs on the target machine;
- Python worker dependencies are fully installed on the target machine;
- ctranslate2/torch provider loads correctly on the target machine;
- latency is already excellent under real microphone/translation workload;
- full ASR > Translate > TTS succeeds on the target machine.

Those need the final local test after pull.

## Effective final test checklist

After merge and pull, run:

```text
npm.cmd run validate:quick
npm.cmd run dev
```

Then test in app:

1. Wait 5-15 seconds after app opens.
2. Confirm top status changes from Checking to Engine ready, Helper starting, Text ready, or Setup needed.
3. Type text and translate.
4. Open General Settings and change runtime profile; confirm autosave notice.
5. Open Translate Settings and change language pair; confirm autosave notice.
6. Open Audio Settings and confirm voice mode controls still work.
7. Open Developer Diagnostics only if status says Setup needed or helper/provider remains blocked.

## Target quality direction

The desired runtime policy remains:

```text
GPU/CUDA first when available and provider-ready.
CPU fallback only when GPU provider cannot be used.
Latency must be visible before claiming it is optimized.
```

This PR improves automation and observability. The next deep pass after local testing should focus on provider-level benchmark evidence and measured latency optimization.
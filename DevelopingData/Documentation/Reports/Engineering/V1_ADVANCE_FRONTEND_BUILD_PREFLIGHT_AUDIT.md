# TranslateIT V1-Advance Frontend Build Preflight Audit

Branch: `V1-Advance`
Status: Phase 3 frontend build preflight added

## Purpose

This audit records the frontend build preflight gate. The goal is to validate frontend build inputs before promoting full `npm run build:frontend`.

## Added

```text
EngineData/Frontend/RustApp/scripts/validate_frontend_build_preflight.mjs
.github/workflows/translateit-v1-advance-frontend-preflight.yml
```

## Package script

```text
preflight:frontend-build
```

## Checks

The preflight checks required frontend inputs:

```text
package.json
index.html
tsconfig.json
src/main.ts
src/audioStudioEntry.ts
src/styles.css
```

It also checks that `build:frontend` remains `vite build`, that Vite and TypeScript are declared, and that the main app and Audio Studio entrypoints are wired.

## Not run

This preflight does not run full Vite build, Tauri packaging, cargo check, CUDA checks, model loading, microphone capture, virtual microphone routing, or TTS provider runtime.

## Next safe step

If this stays green, promote the actual frontend build gate:

```text
npm run build:frontend
```

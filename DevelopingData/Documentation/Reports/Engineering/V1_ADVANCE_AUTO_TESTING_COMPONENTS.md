# V1 Advance Auto Testing Components

This note tracks the new auto testing registry and matrix runner for V1 Advance.

Files:

- EngineData/Frontend/RustApp/scripts/auto_test_registry.mjs
- EngineData/Frontend/RustApp/scripts/run_auto_test_matrix.mjs

NPM profiles:

- test:auto-map
- test:auto-strict

CI now runs the non-blocking matrix report with if: always() and uploads RuntimeTestReports as source contract diagnostics.

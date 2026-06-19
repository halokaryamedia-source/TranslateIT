# TranslateIT V1 Architecture Plan

## Goal

Restructure TranslateIT into a maintainable Rust/Tauri desktop application with a clear frontend/backend split and an optional Python bridge.

## Integration Rules

- expose only validated Tauri commands
- keep UI state local to the frontend
- avoid direct file or process manipulation from the UI layer
- backend services coordinate input validation, pipeline setup, execution, and output normalization
- use Python only when the Rust path is not efficient or stable enough
- isolate invocation, timeouts, stdout/stderr capture, and exit-code handling
- configuration is loaded through backend-owned config modules
- persistent state stays under `UserData`
- unsafe paths must be rejected early
- backend returns structured errors
- frontend shows user-safe messages only
- internal diagnostics stay in logs or reports, not in end-user UI

## Root Structure

```txt
TranslateIT-Rust/
├─ DevelopingData/
├─ EngineData/
├─ UserData/
├─ README.md
└─ .gitignore
```

## Frontend Structure

```txt
EngineData/Frontend/
├─ App/
├─ Assets/
├─ Components/
├─ Layouts/
├─ Styles/
├─ Views/
└─ README.md
```

## Backend Structure

```txt
EngineData/Backend/
├─ Core/
├─ Services/
├─ TranslateEngine/
├─ TauriBridge/
├─ Config/
├─ Security/
├─ PythonBridge/
├─ Storage/
├─ ErrorHandling/
├─ Tests/
└─ README.md
```

## Module Responsibilities

- `Core`: shared domain types, invariants, lifecycle contracts, and state primitives
- `Services`: orchestration and application use cases
- `TranslateEngine`: translation pipeline, ASR/TTS flow, readiness gates
- `TauriBridge`: Tauri command registration and UI bridge surface
- `Config`: runtime configuration loading and defaults
- `Security`: path policy, input validation, and sensitive boundary checks
- `PythonBridge`: subprocess or worker integration when Rust is not the best execution path
- `Storage`: settings, sessions, persistence, and cache metadata
- `ErrorHandling`: structured errors and UI-safe conversion
- `Tests`: backend-specific validation scaffolding and fixtures

## Data Flow

1. Frontend view captures user intent.
2. Frontend calls Tauri commands through the bridge.
3. `TauriBridge` routes to backend services.
4. Services call `TranslateEngine`, `Storage`, `Config`, or `PythonBridge`.
5. Results are normalized by `ErrorHandling`.
6. Safe data returns to the frontend for rendering.

## Testing Strategy

- Rust unit/integration tests for backend services and contracts
- Tauri command smoke tests
- Frontend typecheck and build validation
- Python bridge smoke tests only where needed
- path-safety and secret-avoidance validation

## Release / Dev Separation

- `DevelopingData/` stays development-only
- `EngineData/` holds production source
- `UserData/` holds runtime output and local cache
- no release build artifacts are committed

## Assumptions

- Python remains optional and non-core
- build stability is more important than aggressive file movement

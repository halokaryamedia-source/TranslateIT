# V1 Advance Engine-First UI Contract

## Purpose

The frontend must behave like a product UI for TranslateIT, not like a collection of runtime diagnostics. The engine may expose many commands, but the main screen should only expose the actions needed to translate text, understand readiness, and perform setup.

## Runtime facade

The frontend product layer must use:

```text
EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts
```

The low-level bridge remains:

```text
EngineData/Frontend/RustApp/src/app/bridge/runtimeApi.ts
```

The controller should prefer the facade for product-level state and only use `runtimeApi.ts` directly in developer diagnostics or specific advanced settings.

## Product readiness model

The primary UI should render from this facade state:

```ts
type ProductReadiness = {
  level: "ready" | "partial" | "blocked" | "checking";
  textReady: boolean;
  helperReady: boolean;
  providerReady: boolean;
  microphoneReady: boolean;
  modelsReady: boolean;
  voiceReady: boolean;
  canTranslateText: boolean;
  canRecordVoice: boolean;
  recording: boolean;
  nextAction: string;
  blockers: string[];
  summary: string;
  textStatus: string;
  helperStatus: string;
  modelStatus: string;
  microphoneStatus: string;
  voiceStatus: string;
  runtimeStatus: string;
};
```

## Required main screen sections

### 1. Translate Workspace

Primary user action:

```text
Type text -> click Translate -> see result or clear blocker.
```

The text translate action must remain usable even if voice setup is incomplete. Voice readiness must not block text translation.

### 2. Engine Readiness Panel

Show plain-language cards:

- Text engine
- Helper bridge
- Models
- Microphone
- Voice pipeline

Each card must show `Ready`, `Needs setup`, `Blocked`, or `Checking` based on facade state.

### 3. Setup Panel

Expose setup actions clearly:

- Start Helper
- Check Worker
- Verify Models
- Check Microphone

Each action must produce a plain-language message and refresh readiness.

### 4. Voice Pipeline Panel

Voice controls are secondary until text flow is stable.

Rules:

- If `voiceReady` is false, show the blocker and setup next action.
- If `voiceReady` is true, enable start/stop capture.
- Do not present voice as ready while helper/provider/microphone/model readiness is missing.

### 5. Developer Diagnostics

Developer diagnostics must exist, but raw runtime output should not dominate the main screen.

Allowed developer content:

- Runtime command errors.
- Raw status bundle.
- Model inventory.
- GPU policy.
- Helper status.
- Logs.

## Button policy

Every main-screen button must satisfy:

1. Has exactly one user-facing purpose.
2. Calls a facade action or navigates to a clear screen.
3. Shows loading or disabled state while running.
4. Produces a visible success or blocker message.
5. Does not expose raw technical terms unless in Developer Diagnostics.

## Non-goals

- No PR/merge from `V1-Advance`.
- No release claim.
- No replacement of Rust engine command surface in this phase.
- No hiding errors by swallowing them silently.

## Implementation order

1. Facade: `runtimeProductFacade.ts`.
2. Main screen shell: Translate workspace + readiness + setup + voice status.
3. Controller: move main workflow to facade.
4. Settings cleanup.
5. Visual polish.
6. Validation and local app test.

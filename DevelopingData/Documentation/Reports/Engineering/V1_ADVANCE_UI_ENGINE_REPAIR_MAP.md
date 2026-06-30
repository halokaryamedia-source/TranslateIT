# V1 Advance UI / Engine Repair Map

## Status

Local compile and CI-style validation can pass, but the application is not usable as a product yet. The current issue is not only a compile problem. The UI shell, UI bindings, runtime bridge, and Rust engine command surface are not presented as one clear product flow.

This document maps the repair before code changes continue.

## Current evidence

### Tauri dev configuration

`tauri.conf.json` uses a Vite dev frontend at port `1420` through `beforeDevCommand = npm run dev:frontend` and `devUrl = http://127.0.0.1:1420`. The local app test path therefore depends on package scripts matching this Tauri config.

### Frontend shell shape

The current shell mounts:

- Warmup screen.
- Sidebar.
- Home workspace.
- Settings page.
- Runtime sinks.

The home workspace still reads like a chat/voice launcher with many assistant actions and sidebar chat categories. This makes the UI feel disconnected from the current engine because the main user task is not clearly framed as an engine-driven translation workflow.

### DOM binding surface

`dom.ts` requires a large list of hard-coded elements. If the shell and controller drift, the app either fails early or leaves controls bound to flows that no longer match the engine.

### Event binding surface

`launcherEventBindings.ts` binds many buttons directly to controller handlers:

- microphone / record status / quick mic.
- check microphone.
- start helper.
- check worker.
- developer diagnostics.
- chat collection buttons.
- settings controls.

The binding layer works mechanically, but the user-facing purpose of many controls is unclear. Some controls are diagnostic actions exposed too prominently.

### Runtime bridge surface

`runtimeApi.ts` has a broad Tauri command bridge. It can call commands for runtime status, diagnostics, helper bridge, voice capture, chat, settings, text translation, model inventory, GPU policy, and audio evidence. The engine surface exists, but the UI does not group these commands into a clear readiness and workflow model.

### Rust command surface

`registry.rs` exposes a broad command list, including diagnostics, helper bridge, runtime capture, ASR payload, pipeline handoff, model setup, audio input, settings, chat, text translation, audio studio, and virtual routes. The current UI only partially maps this command surface.

## Root problems

### 1. UI is launcher-first, not engine-first

The current main screen looks like a chat launcher with voice controls, recent chat, saved chat, local data, and assistant actions. The engine, however, is a local translation runtime with setup/readiness requirements. The product should start with the translation task and show engine status as supporting context.

Impact:

- Users see many buttons before they understand the required runtime state.
- Buttons feel useless because they do not explain what they unlock.
- Diagnostic concepts are mixed into primary workflow.

### 2. Readiness state is scattered

Readiness is calculated in several places from runtime bundle, helper status, worker manifest, capture gate, GPU diagnostics, and model inventory. There is no single UI-facing readiness model such as:

- text_ready
- helper_ready
- microphone_ready
- voice_ready
- models_ready
- can_translate_text
- can_record_voice
- next_action

Impact:

- Buttons are not consistently enabled/disabled based on the same source of truth.
- User messages are inconsistent.
- Engine errors appear as vague assistant notices.

### 3. Diagnostic actions are promoted as primary actions

Actions such as Start Helper, Check Worker Status, Open Developer Diagnostics, model inventory checks, and raw logs are necessary, but they should not dominate the primary translation screen.

Impact:

- App feels like a debug panel, not a translation product.
- User does not know which button is the real workflow.

### 4. Text translation flow is the most usable path, but the UI does not prioritize it enough

The bridge has `translate_text`, and the controller has `submitText`. This should become the first stable product path. Voice should be secondary until helper/worker readiness is proven.

Impact:

- The app fails the basic user expectation: type text, press translate, see result.
- Voice complexity distracts from the reliable path.

### 5. Voice pipeline is too complex for the current UI

Voice uses microphone readiness, helper provider readiness, capture start/stop, ASR payload, translation handoff, and TTS handoff. Current UI compresses this into microphone buttons and a few assistant actions.

Impact:

- Recording can appear to start/stop without a clear pipeline result.
- User cannot see where the pipeline is blocked.

### 6. Settings are too close to runtime diagnostics

Settings should be a clean product area: language pair, runtime profile, audio output, microphone device, and defaults. Developer diagnostics should be separated.

Impact:

- Normal users are exposed to internal language and raw runtime state.
- Settings are harder to trust.

### 7. The existing UI shell is too rigid

`lockedReferenceShellParts.ts` hard-codes a large shell. `dom.ts` then requires many IDs. This makes structural changes risky because controller and DOM can easily drift.

Impact:

- UI cleanup becomes many small patches.
- Dead controls are easy to keep accidentally.

## Final repair strategy

Do not patch random buttons individually. Replace the frontend launcher with a maintainable engine-first structure while keeping the current visual identity and improving the look.

### Target UI sections

1. **Translate Workspace**
   - Primary text input.
   - Source / target language selector.
   - Translate button.
   - Result panel.
   - Small engine readiness pill.

2. **Engine Readiness Panel**
   - Text engine status.
   - Helper bridge status.
   - Model status.
   - Microphone status.
   - Voice output status.
   - One clear next action.

3. **Voice Pipeline Panel**
   - Start/stop capture only if prerequisites are satisfied.
   - ASR / translation / TTS progress states.
   - Clear blocked state with next action.

4. **Setup Panel**
   - Check worker.
   - Start helper.
   - Verify models.
   - Check microphone.
   - Show setup blockers in plain language.

5. **Developer Diagnostics**
   - Raw runtime bundle.
   - Command errors.
   - Logs.
   - Contract/debug outputs.

## New frontend architecture proposal

### Runtime facade

Create a UI-facing runtime facade on top of `runtimeApi.ts`:

- `loadRuntimeReadiness()`
- `translateTextCommand(source)`
- `prepareVoiceWorkflow()`
- `startVoiceWorkflow()`
- `stopVoiceWorkflow()`
- `runSetupAction(action)`

This facade should convert raw engine responses into UI states.

### UI state model

Introduce one state object:

```ts
type AppReadiness = {
  textReady: boolean;
  helperReady: boolean;
  microphoneReady: boolean;
  modelsReady: boolean;
  voiceReady: boolean;
  canTranslateText: boolean;
  canRecordVoice: boolean;
  nextAction: string;
  blockers: string[];
};
```

### Button policy

Every button must satisfy:

- Has a visible label.
- Has one runtime action or a clear local UI action.
- Has loading state.
- Has disabled state if prerequisites are missing.
- Shows a user-facing result.

### Diagnostic policy

Raw diagnostics must not appear on the primary screen. Primary UI shows short user-facing messages. Developer panel shows raw details.

## Work phases

### Phase 1 — Contract map and facade

- Build a UI-facing readiness mapper from current runtime API.
- Keep `runtimeApi.ts` as low-level bridge.
- Add a single `runtimeFacade.ts` for product-level UI.

### Phase 2 — Replace main shell

- Replace launcher-style home screen with Translate Workspace + Engine Readiness + Setup panel.
- Keep the same branding/color direction, but modernize spacing, cards, and hierarchy.
- Reduce sidebar importance.

### Phase 3 — Rebind buttons to product actions

- Text translate button calls facade translate.
- Helper/setup buttons call setup actions.
- Voice button follows readiness policy.
- Chat collection buttons are hidden or moved out until they are meaningful.

### Phase 4 — Settings cleanup

- General settings: language focus, runtime profile.
- Translate settings: source/target, swap, save.
- Audio settings: microphone, voice output.
- Developer settings: raw diagnostics only.

### Phase 5 — Validation

- `npm run validate:quick`
- `npm run build:frontend`
- `npm run check:tauri-rust-local`
- Local `npm run dev:app` product test.

## Non-goals for this repair

- No PR or merge into another branch.
- No release claim.
- No full product polish before basic engine usability is restored.
- No removal of engine commands unless proven unused.

## Definition of done

This repair is ready for local app testing when:

- User can type text, click Translate, and see a clear result or clear engine blocker.
- User can see whether engine/helper/model/microphone are ready.
- User can click setup actions and see meaningful feedback.
- Voice buttons are not presented as ready if the voice pipeline is blocked.
- Developer diagnostics are available but not part of the main flow.
- Local compile and frontend build still pass.

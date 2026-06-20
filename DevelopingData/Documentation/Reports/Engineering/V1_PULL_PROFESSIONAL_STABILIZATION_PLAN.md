# V1-Pull Professional Stabilization Plan

Branch: `V1-Pull`

## Objective

Make TranslateIT comfortable and professional to use before merging back to `V1`.

`V1-Pull` is the active staging branch. `V1` remains stable/manual-release branch.

## Current diagnosis

From previous local runtime report:

- Worker ping: PASS
- Worker status: PASS
- Realtime ID to EN translation: PASS
- Quality ID to EN translation: PASS
- Quality EN to ID translation: PASS
- TTS synthesize: PASS
- Selected translation device: CPU
- Torch CUDA: false
- CTranslate2 CUDA: true

Main problem is no longer basic worker availability. Current problems are integration quality, device selection, UI state, voice lifecycle, and professional UX readiness.

## Stabilization tracks

### Track 1: Translation engine correctness

Goal: Text Translate must show real worker/model output, not planner/preview/fallback style output.

Work items:

1. Route app text translation through local worker first.
2. Prefer accelerated worker when present.
3. Keep old planner/manual translation only as fallback diagnostic.
4. Show output in clean user-facing format.
5. Hide technical suffix by default; expose details in Developer Diagnostics/logs.
6. Add validation that app translation path does not silently return preview output.

Acceptance:

- Text translation returns translated sentence.
- No raw planner/status text in normal chat response.
- Diagnostics clearly show model, mode, device, fallback reason, and latency.

### Track 2: GPU-first and latency optimization

Goal: Prefer GPU/CTranslate2 when available; CPU fallback must be explicit and measured.

Work items:

1. Finish CTranslate2 conversion/setup command.
2. Use accelerated worker for realtime ID to EN path.
3. Report selected device consistently: `cuda`, `cpu`, or `fallback`.
4. Add latency target bands:
   - excellent: under 1500 ms
   - acceptable: 1500 to 3000 ms
   - slow: above 3000 ms
5. Add report field for model warmup vs hot-call latency.
6. Add prewarm task so first translation does not freeze UI.

Acceptance:

- Runtime report shows accelerated worker use when CT2 model is ready.
- GPU path is attempted before CPU fallback.
- Latency is visible and classified.
- CPU fallback never appears as a success without explanation.

### Track 3: Voice capture lifecycle

Goal: Mic, click-toggle, and push-to-talk must not start and immediately shut down without clear reason.

Work items:

1. Split voice UI state into: idle, starting, recording, stopping, blocked.
2. Prevent duplicate mic event handlers.
3. Add minimum recording duration guard.
4. Store latest capture lifecycle event in report/log.
5. Separate microphone-only capture from full ASR > Translate > TTS pipeline.
6. Show clear blocker if microphone, ASR, translation, or TTS fails.
7. Add voice test report:
   - input device ready
   - capture start
   - capture stop
   - audio segment exists
   - ASR result
   - translation result
   - TTS output

Acceptance:

- Click mic once means Recording or clear Blocked message.
- Click mic again means stopped and evidence generated.
- Push-to-talk records while held and stops after release.
- Voice failure produces readable evidence file.

### Track 4: UI smoothness and app responsiveness

Goal: App should not feel heavy, hang, or stutter during startup, dragging, settings navigation, or worker/model warmup.

Work items:

1. Move heavy checks to delayed/background tasks.
2. Add frontend startup budget:
   - first paint target under 1500 ms
   - readiness checks after UI is usable
3. Avoid repeated polling while an existing request is pending.
4. Add debounce/throttle for hardware/status refresh.
5. Add non-blocking status panels.
6. Add Developer Diagnostics for UI timing:
   - startup marker
   - helper start duration
   - status refresh duration
   - translation duration

Acceptance:

- Main UI is responsive before helper/model fully warms up.
- Dragging/window interaction is not blocked by runtime polling.
- Status updates do not freeze the UI.

### Track 5: Settings that actually work

Goal: Every visible setting must either work, be disabled, or be clearly marked as planned.

Work items:

1. Audit all settings controls.
2. Remove or disable fake controls.
3. Connect runtime profile, language pair, voice mode, output voice, and helper settings to persisted runtime settings.
4. Add save/autosave confirmation.
5. Add settings reset safety.
6. Add settings validation report.

Acceptance:

- No clickable placeholder setting remains.
- Changes persist after app restart.
- User can understand which features are active vs planned.

### Track 6: Automated validation and report-first testing

Goal: User should read one report first instead of doing repeated manual testing.

Work items:

1. Keep `validate:quick` as structural/type/build gate.
2. Keep `test:runtime-report` as engine/model/GPU/TTS gate.
3. Add `test:voice-report` for voice/audio lifecycle.
4. Add `test:ui-readiness-report` for UI wiring and settings button integrity.
5. Add `test:local-final` aggregator.
6. Generate markdown and JSON reports under `UserData/LogData`.

Acceptance:

- One command produces clear PASS/FAIL and next actions.
- Manual testing starts only after report passes or identifies exact blocker.

### Track 7: Professional release gate

Goal: Merge `V1-Pull` to `V1` only when the app is stable enough.

Gate checklist:

1. `validate:quick` PASS.
2. `test:runtime-report` PASS.
3. Text translation uses real worker output.
4. GPU/CTranslate2 path is either active or CPU fallback is explicitly explained.
5. Voice capture report exists and explains status.
6. No fake settings controls remain.
7. UI remains responsive during startup and settings navigation.
8. User-facing errors are readable.
9. Developer diagnostics includes enough evidence for debugging.

## Proposed development order

### Phase A: Core text and GPU path

1. Finish accelerated text translation wiring.
2. Finish CT2 setup/report path.
3. Clean text response formatting.
4. Add translation diagnostics evidence.

### Phase B: Voice pipeline repair

1. Add guarded voice capture binding.
2. Add audio segment evidence report.
3. Add voice pipeline report.
4. Wire push-to-talk reliably.

### Phase C: UX and settings cleanup

1. Audit visible settings.
2. Hide or disable non-functional controls.
3. Improve status/latency/GPU pills.
4. Reduce startup blocking and repeated polling.

### Phase D: Full automated final gate

1. Add final report aggregator.
2. Add local staging sync for `V1-Pull`.
3. Document pass/fail interpretation.
4. Prepare manual merge checklist from `V1-Pull` to `V1`.

## Non-negotiable rules

- Do not claim GPU is used unless report says device is `cuda`.
- Do not claim voice is fixed until capture evidence exists.
- Do not expose placeholder controls as working settings.
- Do not merge `V1-Pull` to `V1` until final gate is acceptable.
- Every fix must either improve runtime behavior or improve evidence quality.

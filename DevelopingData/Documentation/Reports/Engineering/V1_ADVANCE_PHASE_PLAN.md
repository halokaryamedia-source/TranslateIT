# TranslateIT V1-Advance Phase Plan

Branch: `V1-Advance`
Status: active development plan

## Current development mode

Development is currently GitHub-first and CI-first.

Do not require local CUDA, local model files, microphone input, virtual audio devices, or installer tests during this phase.

Local target-PC testing starts only after the CI-safe foundation is stable.

## Phase 1 — Source of truth and CI foundation

Goal:

```text
Lock the product requirements and CI boundaries before adding runtime changes.
```

Tasks:

1. Create `V1-Advance` from `SourceLocal`.
2. Add product requirements source of truth.
3. Add non-local CI policy.
4. Add GitHub Actions non-local CI workflow.
5. Keep the PR as draft until CI behavior is understood.

Definition of done:

1. Branch exists.
2. Draft PR exists.
3. Requirements are documented.
4. CI policy is documented.
5. Workflow is present.

## Phase 2 — Single-engine cleanup audit

Goal:

```text
Ensure TranslateIT V1 has one active runtime engine and no active legacy alternatives.
```

Tasks:

1. Audit active runtime paths.
2. Confirm `EngineData/Frontend/RustApp` is the only app package.
3. Confirm DesignIT/FigmaDesignExport are not active dependencies.
4. Remove or quarantine unused data from active paths.
5. Update docs/contracts that still mention inactive branch names or legacy engines.

Definition of done:

1. No active dependency points to removed design/export tooling.
2. No docs claim multiple active engines.
3. Runtime paths are clean and predictable.

## Phase 3 — CI-safe app integrity

Goal:

```text
Make the app pass static checks without local hardware/runtime dependencies.
```

Tasks:

1. Stabilize `npm ci`.
2. Stabilize TypeScript typecheck.
3. Stabilize Rust cargo check.
4. Stabilize frontend build.
5. Stabilize static validation scripts.
6. Stabilize frontend-backend and worker contract checks in CI-safe mode.

Definition of done:

1. Non-local CI passes on GitHub.
2. CI does not require CUDA, models, mic, virtual audio, or TTS provider runtime.

## Phase 4 — Runtime contracts for V1-Advance

Goal:

```text
Update contracts to match the final V1-Advance product behavior before implementation.
```

Required contract updates:

1. Always-listening default.
2. Push-to-talk secondary, default Hold Space.
3. 700ms silence threshold.
4. 12s maximum speech segment.
5. Built-in virtual microphone target.
6. Mute original microphone behavior.
7. Headphone monitoring at 50% volume.
8. Indonesian speech to English TTS as first TTS priority.
9. English speech to Indonesian text-only for first target.
10. Audio recording history off by default.
11. Text history on by default.
12. Quality/Fast runtime modes only.
13. Auto/Formal/Casual tone modes.

Definition of done:

1. Contracts and UI-facing terminology match the product requirements.
2. CI validates contract consistency where possible.

## Phase 5 — Text translation path

Goal:

```text
Prepare local Indonesian-English text translation as the first functional runtime path.
```

Tasks must remain CI-safe until local testing begins.

Definition of done before local testing:

1. Translation commands are registered.
2. Frontend calls match Rust command registry.
3. Rust runtime contract matches Python worker command contract.
4. Missing local model state is guarded and surfaced honestly.

## Phase 6 — Voice conversation path

Goal:

```text
Prepare microphone -> ASR -> translation -> English TTS -> virtual microphone flow.
```

CI-safe implementation should focus on contracts, guards, state transitions, and UI wiring.

Definition of done before local testing:

1. UI can represent Always-listening and Push-to-talk modes.
2. Runtime can represent listening, processing, translating, speaking, blocked, fallback, and error states.
3. Segment settings are represented as 700ms silence and 12s max segment.
4. Transcript card contract includes original, translation, replay, and latency detail fields.
5. Virtual mic is represented as a required target but not falsely claimed ready in CI.

## Phase 7 — UI simplification

Goal:

```text
Keep the UI simple before adding advanced functionality.
```

Primary navigation:

```text
Voice
Text
History
Settings
```

Advanced:

```text
Audio Studio
Developer Diagnostics
```

Definition of done:

1. Normal users do not see technical controls by default.
2. Developer Diagnostics remains hidden under advanced access.
3. Error messages are grouped and action-oriented.

## Phase 8 — Audio Studio sample collection

Goal:

```text
Prepare Audio Studio as a secondary feature for future custom English voice actor creation.
```

Initial scope:

1. Import sample audio.
2. Record guided text samples.
3. List and manage sample metadata.
4. No training claim until implementation and validation exist.
5. No custom voice claim until target-PC evidence exists.

## Phase 9 — Local validation preparation

Goal:

```text
Prepare a local test checklist after CI-safe work is stable.
```

Local validation will later test:

1. CUDA provider readiness.
2. Model loading.
3. Whisper ASR.
4. Translation quality.
5. CTranslate2 or selected translation acceleration.
6. Microphone capture.
7. Virtual microphone routing.
8. English TTS output.
9. End-to-end meeting flow.
10. Latency from user stop speaking to first translated audio.
11. Installer behavior.

Local validation is intentionally not part of the current phase.

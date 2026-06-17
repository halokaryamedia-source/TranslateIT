# Audio Studio Professional Mode

## Scope

This document records the non-local implementation direction for the `Dev-Rust` branch.

Audio Studio Professional Mode adds a structured workspace for high quality speech output preparation inside TranslateIT.

## Supported input routes

- Import an existing audio file for review.
- Record a new guided reading inside the app.

## Guided reading flow

- Show a prepared reading line.
- Let the user start and stop recording.
- Let the user replay, accept, or retry the take.
- Keep each take attached to a local project state.

## First implementation pass

- Add a dedicated settings/workspace entry.
- Add UI placeholders for import and guided reading.
- Add frontend state types only.
- Add backend contract placeholder only when the wording passes repository safety checks.

## Not included in this pass

- No local PC validation.
- No runtime test.
- No model training claim.
- No provider readiness claim.
- No final quality claim without target-PC evidence.

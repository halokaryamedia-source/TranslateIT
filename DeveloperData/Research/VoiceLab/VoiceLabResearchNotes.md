# VoiceLab Research Notes

## Scope

Working notes for future TranslateIT custom voice planning.

## Current position

- VoiceLab is not part of the active runtime route yet.
- The active app route must remain `TranslateIT.vbs` -> `EngineData/LauncherApp/RustApp`.
- Any future custom voice implementation must not create another launcher, CLI-only route, or separate runtime engine.

## Existing voice asset notes

Earlier research identified a draft custom voice profile named `marcel` with English-focused samples and a non-publish-grade quality state. That research should be treated as planning context only, not a release-ready runtime asset.

## Quality concerns

- More clean guided recordings may be needed.
- Long-silence samples should be filtered.
- Mixed-language behavior needs a specific dataset plan.
- Runtime latency must be measured on the target PC before any release claim.

## Next checks

- Define dataset requirements.
- Define validation checklist.
- Confirm runtime packaging format.
- Confirm fallback behavior through the local worker.
- Confirm UI exposure inside Rust/Tauri settings before implementation.

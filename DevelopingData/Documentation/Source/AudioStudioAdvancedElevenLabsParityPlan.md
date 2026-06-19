# Audio Studio Advanced Parity Plan

Branch: `Dev-Rust`

## Goal

Raise Audio Studio from a basic development scaffold into an advanced professional audio workflow inspired by modern AI audio platforms.

This plan does not claim that TranslateIT already matches any commercial provider. It defines the non-local architecture needed before local runtime validation and provider integration.

## Advanced product pillars

### 1. Profile modes

Audio Studio must support three quality targets:

- Starter Profile: 1-5 minutes of clean sample audio for rapid draft and UX review.
- Production Profile: 30+ minutes of clean sample audio for higher-quality output preparation.
- Broadcast Profile: up to 3 hours of curated audio for long-form premium output preparation.

### 2. Sample acquisition

Audio Studio must support:

- Import existing audio.
- Guided reading recording.
- Multi-language reading prompts.
- Emotion and delivery prompt coverage.
- Sample review with accept, retry, and block states.

### 3. Performance controls

The UI must prepare controls for:

- Pace.
- Energy.
- Clarity.
- Emotion.
- Style strength.
- Long-form generation target.
- Streaming generation target.
- Dialogue target.

### 4. Advanced quality gate

Before production readiness, Audio Studio must score or verify:

- Duration coverage.
- Noise floor.
- Clipping.
- Silence ratio.
- Speaker consistency.
- Language coverage.
- Emotion coverage.
- Phrase variety.
- Sample rate.
- File format.

### 5. Security and authorization

Audio Studio must stay authorization-first:

- User must confirm the audio is user-owned or authorized.
- Generated audio must be traceable to a project/profile.
- Samples must stay under approved `UserData` roots.
- Delete profile/sample route must be supported before production release.
- No production-ready claim is allowed without target-PC evidence.

## Non-local work completed in this pass

- Advanced quality contract.
- Advanced frontend state.
- Advanced UI panel.
- Advanced mode selector.
- Performance control scaffold.
- Advanced quality gate scaffold.

## Blocked until local PC

- Real microphone capture check.
- Real audio quality measurement.
- Real provider generation.
- Real streaming latency measurement.
- Packaged app verification.

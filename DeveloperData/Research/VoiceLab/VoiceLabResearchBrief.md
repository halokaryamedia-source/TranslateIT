# VoiceLab Research Brief

## Objective

Plan a future custom TranslateIT voice path that:

- uses the user's own voice,
- sounds natural and not stiff,
- keeps runtime latency close to the default local voice path,
- is trained or prepared before live translation,
- does not add a parallel runtime engine route.

## Product goal

The target voice should be natural, comfortable for formal and informal output, and usable for live translated speech without blocking the Rust/Tauri app flow.

## Runtime direction

The current production direction is:

- offline preparation or training,
- local runtime reuse of prepared voice assets,
- persistent worker warmup where needed,
- no heavy model building during live translation,
- no second launcher or alternate app route.

## Constraints

Avoid:

- runtime voice cloning per utterance,
- voice-cover-only approaches,
- heavy on-the-fly conditioning,
- parallel backend routes that bypass the Rust/Tauri app.

Prefer:

- guided recording,
- clean dataset curation,
- explicit validation evidence,
- local runtime assets,
- integration through the approved local worker architecture.

## Future questions

1. What data quantity and quality are needed for a natural custom voice?
2. How should bilingual or mixed Indonesian/English output be represented?
3. How should custom voice assets be validated before release?
4. What can be cached or preloaded to protect realtime latency?
5. How should fallback behave when a custom voice is unavailable?

## Bottom line

VoiceLab remains research/planning until it is integrated into the single Rust/Tauri route and backed by local runtime validation evidence.

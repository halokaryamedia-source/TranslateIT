# V1-Advance Frontend Helper Evidence Wording Audit

Branch: `V1-Advance`
Status: completed non-local audit

## Purpose

This audit records a frontend wording cleanup for helper bridge and capture preview messages.

The goal is to avoid wording that could be interpreted as local runtime readiness before target-PC evidence exists.

## Source changed

```text
EngineData/Frontend/RustApp/src/app/active-launcher/developerHelperBridgeBinding.ts
```

## Changes made

- Helper command summaries now say `evidence returned` instead of using a generic `ok` label.
- Helper command summaries explicitly say the result is diagnostic evidence, not a local runtime readiness claim.
- Capture preview summaries now say `preview available` instead of `ready`.
- Capture preview summaries label provider and CUDA values as evidence flags.
- Capture preview summaries explicitly say the preview did not start/stop capture and is not a readiness claim.
- Worker detail tuple typing was made explicit to keep TypeScript inference stable.

## Boundary preserved

This change does not run local helper/runtime/model code.

It does not claim:

```text
helper spawn pass
ASR ready
translation ready
TTS ready
CUDA ready
microphone ready
virtual microphone ready
installer ready
latency target achieved
```

## Outcome

Developer UI helper messages are clearer for the non-local phase and better aligned with the runtime readiness report.

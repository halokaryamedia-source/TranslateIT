# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CURRENT / MY VOICE PRODUCT NAMING NORMALIZED / REPO-SIDE CLEANUP CLOSED / WINDOWS R3 HOSTED PAYLOAD PROOF PASSED / TARGET-PC ACCEPTANCE NEXT`

## Active Boundary

- `Local` is the current development authority.
- `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- Product-facing custom-voice terminology is **My Voice**. New UI/current semantic source must use `My Voice`, `MyVoice`, `myVoice`, or `my_voice` according to language convention.
- Existing `voice_lab_*` command/error identifiers and `UserData/.../VoiceLab/...` directories may remain only where they are protocol/storage compatibility identifiers. They are not current product vocabulary and must not be renamed without an explicit compatibility migration.
- Translator is `xiaomi-research/MiLMMT-46-1B-v1.0` at revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995`.
- WorkerRuntime dependency versions remain Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2; Accelerate 1.14.0 remains retained for the CUDA `device_map` path.
- The R3 packaging shape remains one offline `TranslateIT-Setup.exe` plus colocated `TranslateIT-Payload.7z`.
- Hosted Windows R3 run `32473226976` passed both the source contract and controlled Windows payload build. Its artifact proved the bounded payload build at the corresponding release-source revision; it does not prove installation or target-PC behavior.
- CI remains consolidated: MiLMMT contract, R3 release verification, read-only WorkerRuntime lock check, Code Health, and Repository Verify.
- Repository/static/hosted evidence does not prove actual Setup execution, Windows driver consent/restart behavior, installed runtime, CUDA/BF16 practicality, physical microphone behavior, VB-CABLE delivery, Meeting delivery, or clean-machine readiness.

## Closed Development Boundary

Do not reopen model selection, MiLMMT latency tuning, dependency convergence, worker architecture, R3 payload representation, installer lifecycle, or retired release-workflow cleanup without a new concrete defect or requirement. Do not rename compatibility-bound `voice_lab_*` protocol/storage identifiers merely for cosmetic consistency.

## Next Step

**After the My Voice naming candidate is verified and fast-forwarded to `Local`, resume validation with target-PC installer acceptance: install the colocated Setup + Payload, verify first launch/private runtime, then CUDA/MiLMMT, microphone/VB-CABLE/My Voice audio, Meeting end-to-end, uninstall/reinstall, and clean-machine behavior. Do not make additional source changes unless that acceptance work exposes a concrete defect.**

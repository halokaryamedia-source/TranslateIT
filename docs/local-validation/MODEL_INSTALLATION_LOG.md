# Model Installation Log

## Repository
https://github.com/halokaryamedia-source/TranslateIT.git

## Branch
`Dev-Pack`

## Previous Commit
`f68e0788`

## Scan Result

- Existing model scan found only cache metadata for the preferred ASR model.
- Required translation models were present as legacy local folders with real model markers.
- Required ASR fallback model was present as a full local folder with real model markers.

## Mapping Result

- Created local runtime directory junctions from `RuntimeAssets` to the legacy model folders.
- The preferred ASR model path is still incomplete and remains optional/preferred only.

## Setup Result

- `npm.cmd run models:setup`: PASS
- `setup:worker`: PASS

## Verify Result

- `models:inventory`: PARTIAL
- `models:verify`: PARTIAL

## Worker Smoke Result

- `npm.cmd run smoke:worker`: PASS
- `npm.cmd run smoke:worker:quality`: PASS

## Remaining Blockers

- Preferred ASR model `faster-whisper-large-v3-turbo` is still missing usable marker files.
- Piper voice assets are missing, so Windows SAPI remains the active TTS fallback.

## Notes

- The worker now loads the required fallback ASR/translation models from runtime mappings and can run local smoke tests.
- No model binaries were committed.


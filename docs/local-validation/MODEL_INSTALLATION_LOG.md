# Model Installation Log

## Repository
https://github.com/halokaryamedia-source/TranslateIT.git

## Branch
`Dev-Pack`

## Previous Commit
`f68e0788`

## Scan Result

- Existing model scan found cache metadata for the preferred ASR model before installation.
- Required translation models were present as legacy local folders with real model markers.
- Required ASR fallback model was present as a full local folder with real model markers.

## Mapping Result

- Created local runtime directory junctions from `RuntimeAssets` to the legacy model folders.
- The preferred ASR model was later installed into the runtime path and now takes priority over the fallback model.

## Setup Result

- `npm.cmd run models:setup`: PASS
- `setup:worker`: PASS

## Verify Result

- `models:inventory`: PASS
- `models:verify`: PASS

## Worker Smoke Result

- `npm.cmd run smoke:worker`: PASS
- `npm.cmd run smoke:worker:quality`: PASS

## Remaining Blockers

- Piper voice assets are missing, so Windows SAPI remains the active TTS fallback.

## Notes

- The worker now loads the required fallback ASR/translation models from runtime mappings and can run local smoke tests.
- No model binaries were committed.
- Translation CUDA is handled separately from ASR CUDA. ASR can use CTranslate2 CUDA while translation may still need a PyTorch CUDA wheel in the worker `.venv`.

# Rust Conversion Remaining Work

## Project

TranslateIT

## Branch

`ChatGPT-ConvertEngine`

## Current conversion status

The active `EngineData/LauncherApp` Python launcher files have been removed from the Rust conversion branch and the root launcher is redirected to RustApp. Core logic has been ported into Rust modules for audio preprocessing, noise filtering, VAD, ASR model planning, ASR quality filtering, language routing, latency reporting, pipeline decisions, translation planning, playback planning, session metrics, session store payloads, native execution planning, native runner contracts, transcript segment parity models, and segment builder parity logic.

## Work not yet complete

### 1. Real ASR native inference

Still needed:

- connect a real native inference backend for ASR
- load faster-whisper-compatible model files without Python runtime
- execute audio-to-text inference
- return text, timestamps, language probability, no-speech probability, log probability, and compression ratio
- feed results into Rust ASR quality filtering

Current state:

- model/profile planning exists
- native execution contract exists
- real ASR inference is not connected yet

### 2. Real translation native inference

Still needed:

- connect translation model runtime
- load tokenizer and model files
- execute text-to-text translation
- handle ID to EN and EN to ID routing
- integrate context window into real inference

Current state:

- deterministic short phrase planning exists
- language routing exists
- context window exists
- real translation inference is not connected yet

### 3. Real output/TTS execution

Still needed:

- decide final output backend
- connect playback queue
- support voice actor/custom voice path if kept
- generate or play output audio through Rust-owned output path

Current state:

- playback planning exists
- output contract exists
- real output execution is not connected yet

### 4. Live audio capture runtime

Still needed:

- connect native microphone capture loop
- feed frames into preprocessing and VAD
- create segment jobs
- handle stop/cancel/flush behavior

Current state:

- audio preprocessing exists
- VAD decision exists
- calibration/status logic exists
- live capture loop is not fully connected yet

### 5. Segment builder and transcript session parity

Still needed:

- fully port `transcript_session.py`
- ensure saved transcript JSON matches the intended session structure
- connect transcript segment parity model to runtime session store

Current state:

- `transcript_segment.py` field shape has been ported into `engine/transcript.rs`
- `segment_builder.py` duration validation and builder defaults have been ported into `engine/transcript.rs`
- transcript segment summary helper exists
- session payload models exist
- session save preview/save helper exists
- session metric logic exists
- full transcript/session parity is not complete yet

### 6. Frontend command wiring

Still needed:

- wire all new Rust commands into `src/main.ts`
- expose native runner contracts where safe
- expose session save flow with user approval
- show model/backend readiness honestly in UI

Current state:

- several Tauri commands are already exposed
- some large `main.rs` bridge updates were intentionally kept conservative while migration continues

### 7. Remaining old Python/reference folders

Still needed:

- categorize remaining Python under `TranscriptEngine` and `TranslateEngine`
- port any still-needed logic
- move or document old Python as legacy/reference only
- remove any Python path from active runtime once Rust parity is complete

Current state:

- active LauncherApp Python files were removed from the conversion branch
- some Python files remain in engine/reference/tooling areas

### 8. Final validation

Still needed after development completion:

- cargo check/build
- npm build
- Tauri build/dev startup
- RustApp command smoke test
- end-to-end input to translation to output test
- package/launcher test

Current state:

- final validation is intentionally manual-only and has not been run yet

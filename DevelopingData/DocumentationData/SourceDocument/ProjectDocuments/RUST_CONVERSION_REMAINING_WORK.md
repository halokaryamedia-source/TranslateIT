# Rust Conversion Remaining Work

## Project

TranslateIT

## Branch

`ChatGPT-ConvertEngine`

## Current conversion progress estimate

Estimated code-path conversion progress: **73-76%**.

This percentage measures how much of the Python launcher/runtime logic has been moved into Rust/Tauri code paths and command boundaries. It does **not** mean production readiness yet. Production readiness still depends on real inference execution, live capture integration, and final validation.

## Current conversion status

The active `EngineData/LauncherApp` Python launcher files have been removed from the Rust conversion branch and the root launcher is redirected to RustApp. Core logic has been ported into Rust modules for audio preprocessing, noise filtering, VAD, ASR model planning, ASR quality filtering, language routing, latency reporting, pipeline decisions, translation planning, playback planning, session metrics, session store payloads, native execution planning, native execution contract hardening, native runner contracts, native execution bridge, model path readiness guard, transcript segment parity models, segment builder parity logic, transcript session planning, runtime capture job planning, capture loop readiness contract, segment flow readiness, frontend transcript session readiness wiring, frontend segment flow wiring, and frontend native execution bridge wiring.

## Progress buckets

### Completed or mostly ported

- Rust/Tauri app scaffold and command bridge
- active LauncherApp Python cleanup
- root launcher redirection to RustApp
- runtime diagnostics
- audio preprocessing logic
- noise classification logic
- VAD decision logic
- microphone calibration decision logic
- ASR model/profile planning
- ASR quality rejection logic
- language routing logic
- latency logic
- translation context logic
- deterministic translation planning
- playback planning
- session metric and worker-health logic
- pipeline decision and stale-job guard logic
- transcript segment parity model
- segment builder duration/default parity
- transcript session planning and store preview bridge
- runtime capture job planning
- capture loop readiness adapter and Tauri command
- segment flow readiness adapter
- frontend Session Check command wiring
- frontend Segment Flow command wiring
- frontend Execution Bridge command wiring
- native execution planning and batch readiness
- native execution contract blocker hardening
- native execution bridge with existing-path model guard
- manual-only validation workflow

### Partially ported but not production-ready

- live capture lifecycle
- transcript session write/read/copy parity
- frontend approval flow for save/export
- native backend/model readiness bridge
- native execution contracts for ASR, translation, and output
- old Python/reference folder categorization

### Not complete yet

- real ASR native inference execution
- real translation native inference execution
- real output/TTS/playback execution
- microphone stream loop feeding real frames into preprocessing/VAD
- end-to-end runtime execution
- final build/test validation

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
- native execution planning exists
- native execution contract exists and blocks missing model/audio input explicitly
- native execution bridge now requires the model path to exist before ASR can be marked model-ready
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
- native execution contract blocks missing source text/model path explicitly
- native execution bridge now requires the translation model path to exist before translation can be marked model-ready
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
- output stage is represented in the native execution bridge
- real output execution is not connected yet

### 4. Live audio capture runtime

Still needed:

- connect native microphone capture loop
- feed frames into preprocessing and VAD
- create real segment jobs from captured frames
- handle stop/cancel/flush behavior

Current state:

- audio preprocessing exists
- VAD decision exists
- calibration/status logic exists
- runtime capture job planning exists
- capture loop readiness contract exists
- segment flow readiness exists
- live capture loop is not fully connected yet

### 5. Segment builder and transcript session parity

Still needed:

- implement guarded transcript session JSON write/read in the Rust session flow
- implement optional replay audio copy to saved bundle after approval-safe file operation wiring
- ensure saved transcript JSON matches the intended production session structure
- connect transcript session planner to runtime session store and frontend approval flow

Current state:

- `transcript_segment.py` field shape has been ported into `engine/transcript.rs`
- `segment_builder.py` duration validation and builder defaults have been ported into `engine/transcript.rs`
- `transcript_session.py` metadata, summary, cache path plan, saved path plan, planned cache items, planned save items, and path guard behavior have been ported into `engine/transcript_session.rs`
- transcript segment summary helper exists
- session payload models exist
- session save preview/save helper exists
- session metric logic exists
- full write/read/copy transcript session parity is not complete yet

### 6. Frontend command wiring

Still needed:

- expose approval-safe save/export flow
- expose final real inference execution results once native backend is connected
- add UI controls for selecting validated ASR/translation/output model paths if needed

Current state:

- diagnostics wiring exists
- transcript session readiness wiring exists
- segment flow readiness wiring exists
- native execution bridge wiring exists
- segment flow reads backend readiness from diagnostics instead of hardcoded false values
- capture loop contract command is exposed to Tauri backend
- several Tauri commands are already exposed

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

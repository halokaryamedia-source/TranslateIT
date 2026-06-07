# DEEP_STABILITY_LATENCY_AUDIT_P11_REPORT

## Scope

This audit is a consolidation pass for the P11 deep stability and latency effort.

Goals:

- Keep the launcher and runtime stable under repeated `stop -> start -> speak` use.
- Reduce avoidable work in hot paths so the app stays smooth during long sessions.
- Preserve the already-working low-latency custom voice path.
- Keep the custom voice and stop/start runtime state fully resettable so a stop does not poison the next start.
- Keep telemetry, diagnostics, and UI labels aligned with the actual measured latency fields.
- Avoid regressions in the safe `large-v3-turbo` ASR path, `ID/EN Focus` routing, and the default direct playback behavior.

## Executive Summary

The app now has a much more conservative and predictable hot path:

- Repeated UI refreshes are coalesced and skipped when the visible signature has not changed.
- Health/readiness/audit snapshots are deduped before writing so identical payloads do not rewrite files.
- Session persistence and benchmark report generation are cached by session signature.
- Transcript-card view models and trace exports are cached to avoid redundant rebuilds.
- Custom voice `Marcel` remains functional, direct-streamed, cancel-safe, and guarded so `Start` does not announce readiness until warmup is complete.
- `Stopping` is surfaced consistently so stop/start transitions are less confusing.

The result is a launcher that is substantially less chatty on disk and UI threads, while preserving the low-latency behavior that was already working well.

## Stability Hardening

### Stop / start lifecycle

- `EngineData/LauncherApp/app_main.py`
  - `Stop` now clears active TTS state first, increments the capture generation, and marks stale results as disposable.
  - `Stop` also invalidates `engine_startup_ready` immediately so the next restart cannot inherit a stale ready flag from the previous run.
  - `Start` clears leftover dispatch state before a new session begins.
- The launcher waits for the startup warmup worker to finish and now only declares readiness once ASR, translation, and TTS warmup are all complete.
- If a restart request is already queued, the launcher keeps the UI in `Preparing` until the queued start actually launches, so `Ready` is never shown early during a stop -> start cycle.
- If warmup is incomplete, the launcher stays in `Preparing` and re-arms warmup instead of falsely advertising readiness.
- If the user presses `Start` while the engine is still warming after a stop, the request is queued and re-tried until both the live thread and runtime TTS are actually idle, preventing the `Preparing...` dead-end and lost restart requests.
- If CUDA Core pass is not available at start time, the launcher keeps the real ASR path blocked and reports the CUDA blocker clearly instead of silently switching to CPU.
- After a successful stop, the already-loaded ASR / translation / TTS models are kept warm so a restart can begin immediately instead of paying a second warmup penalty.
- Restart warmup now reuses resident ASR and translation warmup caches when the model/device/config signature has not changed, so Stop -> Start no longer repeats the expensive inference warmup unless the runtime actually changed.
- ASR warmup cache reuse is guarded by the full realtime profile signature, including language, task, decoding settings, and prompt digest.
- Translation warmup cache reuse is guarded by model id, engine id, device, and dtype.
- TTS reset now preserves an idle warmed worker for fast Stop -> Start, while runtime/profile changes still call a full shutdown path before creating a new TTS runtime.
- `Stopping` is used consistently in the UI badge and capture status text.

### Stale-result protection

- `EngineData/LauncherApp/app_main.py`
  - TTS results from an older capture generation are skipped instead of being mixed into a newer session.
  - Playback cancellation is handled as a normal result path rather than an error path.

### UI refresh coalescing

- `EngineData/LauncherApp/app_main.py`
  - Status refreshes are coalesced with `_request_status_refresh()`.
  - `refresh_status_panel()` now has a signature guard and skips repaint work when the visible state has not changed.
  - `update_benchmark_panel()` now also has a signature guard so the benchmark label does not repaint when the summary is unchanged.
  - `setText()` calls are only performed when the text actually changes.

### Report and snapshot dedupe

- `EngineData/LauncherApp/app_main.py`
  - `write_engine_readiness_report()` now dedupes by payload fingerprint.
  - `write_engine_health_snapshot()`, `write_worker_health_snapshot()`, `write_start_stop_lifecycle_snapshot()`, `write_playback_health_snapshot()`, `write_ui_interaction_health_snapshot()`, and `write_error_health_snapshot()` all route through the same dedupe helper.
  - `write_engine_stability_audit_snapshot()` now dedupes both JSON and text report output.
  - `write_cache_session_guard_snapshot()`, `write_short_path_guard_snapshot()`, and `write_long_turn_safety_snapshot()` now dedupe their JSON output.
  - `export_reports()` now emits the benchmark `latest` JSON/text artifacts consistently through the shared benchmark export helpers.

### Session persistence hardening

- `EngineData/LauncherApp/app_main.py`
  - Session persist requests are deduped by a session signature.
  - Benchmark report generation is cached by session signature so the same session state is not rebuilt repeatedly.
  - The session persist runner uses the cache helper when available and falls back safely if needed.
  - Pending start requests now survive the full stop transition and re-arm automatically until both the live thread and runtime TTS are truly idle, preventing a lost start after stop/restart.

### Latest crash investigation

- The freshest runtime logs reviewed during this audit did not show a new traceback matching the latest smoke tests.
- Two historical fragility points were found and hardened again:
  - `handle_pipeline_segment()` now drops malformed segment objects instead of assuming `latency`, `quality`, and `replay` are always present.
  - `handle_tts_result()` now drops malformed TTS result objects instead of assuming the target segment always has all runtime sub-objects.
- This makes the launcher more tolerant of stale or partial callback payloads during heavy use.

### ASR accuracy tightening

- `EngineData/TranscriptEngine/asr_quality_filter.py`
  - The post-ASR quality gate now includes lightweight gibberish and random-context rejection for suspicious outputs.
  - The filter considers:
    - focus-language anchor words for `ID/EN Focus`
    - language probability
    - average log probability
    - no-speech probability
    - token-shape checks and short-output lexical coherence checks for suspicious outputs
    - conservative profanity detection based on exact token/phrase matches
  - This is intended to reject hallucination-like outputs such as nonsense syllables, looping uncertain transcripts, repetitive sound artifacts, and other low-focus artifacts without adding inference latency.
  - The live capture side also now rejects noise-like impulse segments using energy concentration and peak-to-RMS evidence, which is aimed at keyboard, mouse, and tap artifacts before ASR can turn them into text.

- `EngineData/TranscriptEngine/asr_model_loader.py`
  - `language_probability` from the ASR runtime is captured in the transcription result when available.
  - Realtime ASR now uses a lightweight bilingual initial prompt to bias the decoder toward Indonesian/English conversation while preserving names of people and places.
  - The prompt now explicitly asks for verbatim transcription, natural code-switching, and no invented filler/context.
  - The prompt is now Indonesian-first for short conversational utterances so phrases like "halo coba berbicara" and "lagi" stay on the Indonesian path instead of being misread as English.
  - The ASR cache key includes the prompt fingerprint so prompt changes do not reuse stale transcript output.

- `EngineData/LauncherApp/live_pipeline.py`
  - The ASR quality report now forwards `language_probability` into the post-ASR decision path.
  - The live VAD gate also receives a lightweight speech-focus score from existing audio evidence so low-focus background/crosstalk segments can be rejected before ASR without adding new inference work.
  - Translation routing now applies a lightweight text-language bias for very short, clearly Indonesian phrases before deciding whether to pass through or translate, reducing misroutes without adding inference latency.
  - A deterministic literal short-phrase map handles tiny Indonesian phrases such as "Halo coba berbicara.", "Lalu coba bicara.", and "Lagi." so the model does not paraphrase them into longer English sentences.

- `DevelopingData/Tests/test_engine_hardening.py`
  - Tests now cover both:
    - accepted short, clear speech
    - rejected gibberish-like short output
    - rejected profanity output
    - accepted person/place-name-like output so proper nouns stay usable
    - rejection-status mapping for content vs silence cases
    - prompt propagation into ASR decode
    - ASR cache-key differentiation when the prompt changes
    - config-driven initial prompt loading

### Crash recording

- `EngineData/LauncherApp/app_logger.py`
  - Unhandled Python exceptions are now recorded through a shared crash recorder helper.
  - The recorder writes both `app_crash_latest.json` and `app_crash_latest.log` with:
    - timestamp
    - event name
    - exception type/message/traceback
    - process/thread metadata
    - structured context payloads
  - A separate `app_crash_fatal.log` handle is enabled for `faulthandler` so fatal interpreter-level crashes also leave a traceback trail.

- `EngineData/LauncherApp/launcher_bootstrap.py`
  - `sys.excepthook`, `threading.excepthook`, and `sys.unraisablehook` are installed before launching the app.
  - Bootstrap-level startup/import exceptions now also write crash records before the process exits.

- `EngineData/LauncherApp/app_main.py`
  - The Qt application now uses a crash-logging `QApplication.notify()` override when PySide6 is available, so exceptions raised inside Qt event processing are recorded instead of disappearing silently.

## Latency Improvements

### Safe ASR / language routing

- `EngineData/TranscriptEngine/asr_model_loader.py`
  - Live capture remains on `large-v3-turbo`.
  - The backup model remains a fallback, not the default live route.
  - Realtime decode stays greedy (`best_of=1`) for the safe fast path.

- `EngineData/LauncherApp/live_pipeline.py`
  - `ID/EN Focus` is the default runtime mode.
  - Translation is skipped when the detected language already matches the target.
  - Audio capture and endpointing remain responsive for short utterances.

- `EngineData/TranscriptEngine/vad_pipeline.py`
  - `Headset` is the standard safe configuration.
  - `Normal Room` remains only as a compatibility alias for `Headset`.

### Translation GPU path

- `EngineData/TranslateEngine/translation_engine.py`
  - Local translation continues to prefer CUDA when it is available and stable.
  - Greedy generation is used so translation stays deterministic and fast.
  - A deterministic literal translation fast path handles tiny Indonesian phrases such as "halo coba berbicara" and "lagi" before model inference so short speech does not get expanded into verbose English paraphrases.
  - Passthrough is preserved when translation is unnecessary.

### TTS and playback

- `EngineData/TranslateEngine/tts_placeholder.py`
  - Custom voice `Marcel` uses direct streaming instead of a WAV-first playback path.
  - Playback is serialized so a second utterance waits for the first to finish instead of cutting it off.
  - Warmup is cached, cancel-safe, and guarded against overlap.
  - `reset_runtime_state()` drains pending direct requests and clears warmup/custom-voice state so stop/start does not inherit stale playback state.

- `EngineData/LauncherApp/app_main.py`
  - TTS starts before UI/report work where possible.
  - The post-TTS benchmark/UI refresh is deferred into the event loop.
  - Replay of custom direct playback does not double-play audio.

### Audio Verify and short-utterance responsiveness

- `EngineData/LauncherApp/live_pipeline.py`
  - Endpoint timing for short speech was tightened conservatively so 2–3 word utterances remain responsive.
  - The capture callback frame duration remains at 16 ms for a good responsiveness/stability balance.
- `EngineData/LauncherApp/language_routing.py`
  - Short Indonesian phrase bias now overrides obvious ASR language misfires when the text itself is clearly Indonesian.

## Custom Voice Actor

### Runtime behavior

- Default testing now points to the trained custom voice profile `marcel`.
- The custom voice path is opt-in by configuration, but the testing default keeps it active so the route can be exercised end-to-end.
- The runtime waits for warmup to complete before declaring the engine ready, preventing the user from speaking too early and accidentally causing duplicated work.
- The `Stop` path now fully resets TTS runtime state so a restart begins from a clean, recoverable state.

### Playback model

- The custom voice path is now direct-streamed for low latency.
- WAV output is retained for replay/cache purposes, but it is no longer the primary gate for playback start.
- The stop path cancels active custom playback cleanly so the next start does not inherit stale audio.

### Stability notes

- The custom voice path was repeatedly hardened against:
  - double playback
  - startup hang
  - stop/start state carry-over
  - stale warmup overlap
  - readiness being announced before the voice was actually ready
- The latest hardening keeps custom voice requests queued while direct playback is still active, so repeated speech does not overlap multiple active streams or re-enter the custom renderer before it goes idle.

## UI and Diagnostics

### UI indicators

- `EngineData/LauncherApp/app_main.py`
  - Status text is more explicit for `Preparing`, `Warming up`, `Listening`, `Processing`, `Stopping`, and `Error`.
  - The benchmark panel and status panel are cached to avoid repainting identical values.
  - The voice actor status now clearly shows whether the custom voice is enabled, which profile is selected, and whether it is ready or warming.

### Latency labeling

- `EngineData/LauncherApp/transcript_view.py`
  - The UI card uses the actual measured output proxy latency when available.
  - Missing latency stays `Latency unavailable` instead of being replaced with a fake value.

- `EngineData/LauncherApp/latency_report_reader.py`
  - Report summaries stay aligned with the UI latency representation.

### Diagnostics

- `DevelopingData/Diagnostics/latency_optimizer_review.py`
  - Reports the largest remaining bottleneck stage and latency.
  - Helps distinguish between safe latency wins and diminishing returns.

- `DevelopingData/Diagnostics/manual_latency_review_helper.py`
  - Confirms whether UI and report latency fields match when the data is available.

- `DevelopingData/Diagnostics/input_output_latency_probe.py`
  - Verifies the input/output latency budget fields and the direct dispatch ordering.

## Reporting and Telemetry

- `EngineData/LauncherApp/session_reporting.py`
  - Telemetry payloads are sanitized before persistence so runtime objects do not crash report generation.
  - STT, model runtime, text latency, cache/session guard, short-path guard, and long-turn safety payloads stay serializable and bounded.

- `EngineData/LauncherApp/app_logger.py`
  - JSON and text report writes are asynchronous.
  - Deduped queueing prevents identical report writes from blocking hot paths.
  - `write_text_report_async()` was added so audit text output can use the same worker-based path.

## Validation

The following commands were run during the audit:

```powershell
python -m compileall -q .\EngineData .\DevelopingData\Diagnostics .\DevelopingData\Tests
python -m unittest discover -s .\DevelopingData\Tests
D:\Work\AI Stuff\TranslateIT\DevelopingVersion\Experimental\DevelopingData\ToolKitData\rt\Scripts\python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test
```

### Results

- `python -m compileall` completed successfully.
- `python -m unittest discover -s .\DevelopingData\Tests` passed with **152 tests** after the ASR tightening, looping/noise rejection, noise-like segment rejection, repetitive sound artifact rejection, profanity/context filtering additions, ASR prompt bias improvements, English/Indonesian routing bias fixes, short mixed-source normalization, translation literal short-phrase routing, TTS runtime reset hardening, runtime-idle stop/start gating, stop/start capture-health cleanup, the startup warmup readiness guard, the queued-start-after-ready safeguard, the stricter CUDA-gated real-ASR start safeguard, keep-engine-warm-after-stop, strict warmup cache signatures, and preserved idle TTS worker restart optimization.
- `launcher_bootstrap --self-test` returned `PASS: launcher self-test`.

## Current Status

- The launcher is materially more resistant to crash/hang conditions caused by repeated refreshes, redundant snapshot writes, stale-session artifacts, and premature restart before the runtime is truly idle.
- The custom voice actor path is functional and preserved, with direct playback and guarded warmup.
- The safe live ASR route remains `large-v3-turbo`.
- `ID/EN Focus` remains the default language profile.
- The app is now much less likely to waste cycles on identical work in the UI, telemetry, and session persistence layers.

## Notes

- This audit intentionally preserves working behavior and focuses on reducing repeated work, stale work, and hidden hot-path pressure.
- Remaining latency gains are expected to be incremental rather than dramatic, because the largest safe wins have already been applied.

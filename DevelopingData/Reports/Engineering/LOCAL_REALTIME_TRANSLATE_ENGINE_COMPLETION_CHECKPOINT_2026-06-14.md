# Local Realtime Translate Engine Completion Checkpoint

Date: 2026-06-14
Branch: `ChatGPT-ConvertEngine`
Status: Internal pre-validation checkpoint only

## Scope Completed

This checkpoint consolidates the professional local realtime translate direction for TranslateIT:

- Two user-facing runtime profiles only: `Realtime` and `Quality`.
- Realtime target stack:
  - ASR: Faster Whisper Large V3 Turbo CT2
  - Translation: MarianMT ID -> EN
  - TTS: Piper
  - Target latency: approximately 1000 ms for short phrases when models are preloaded and local hardware is ready.
- Quality target stack:
  - ASR: Faster Whisper Large V3 Turbo CT2
  - Translation: NLLB 200 distilled 600M
  - TTS: Piper quality voice mode
  - Target latency: approximately 2500 ms.
- Local-only/no-API truth policy added to the worker stack manifest.
- Local realtime worker script added with command paths for:
  - `status`
  - `asr_preload`
  - `transcribe`
  - `translation_preload`
  - `translate`
  - `tts_preflight`
  - `synthesize`
- Worker setup script added for local Python worker dependencies.
- Worker smoke test launcher and evidence writer added.
- Rust/Tauri runtime now surfaces local worker manifest readiness in the runtime status bundle and UI.
- Internal validation gate now includes local worker stack evidence before owner validation can be allowed.
- Manual text translation now routes through the realtime translation planner instead of returning a generic disconnected message.
- Live audio path now supports two-mode VAD profile routing and target ASR WAV handoff.
- SavedProject path alignment is applied in runtime config.

## Explicit Non-Claims

This checkpoint does not claim production readiness, owner-validation readiness, release-candidate readiness, or Google/Gemini-level parity.

Real readiness remains blocked until the following checks pass on the user's machine:

1. Local worker dependency installation.
2. Local model presence check.
3. `npm run typecheck`.
4. `npm run check:rust`.
5. `npm run build:frontend`.
6. `npm run build`.
7. Launcher package open test.
8. Real microphone capture smoke test.
9. Real ASR transcript smoke test using Faster Whisper Large V3 Turbo.
10. Real translation smoke test using MarianMT and optionally NLLB Quality mode.
11. Real TTS/playback smoke test using Piper.
12. Validation evidence file confirms all gates.

## Current Engineering Readiness

The architecture and gate wiring are now close to complete for internal validation. The system is no longer only a planning scaffold: it has local worker commands, local model stack manifests, smoke-test evidence paths, and UI visibility for local worker readiness.

Remaining risk is runtime execution on the actual Windows machine with RTX 3070, installed Python dependencies, model files, Piper voice assets, and full Tauri build validation.

## Recommended Next Command Sequence on User Machine

```powershell
# 1. Setup local worker dependencies
EngineData\LauncherApp\Workers\setup_realtime_worker.ps1

# 2. Run full Rust/Tauri internal validation
DevelopingData\ToolKitData\Scripts\Execution\run_rustapp_final_validation.ps1

# 3. Run local worker smoke test with real microphone WAV sample
EngineData\LauncherApp\Workers\run_realtime_worker_smoke.ps1 -Mode Realtime -AudioPath "UserData\CacheData\audio_segments\latest_live_target_segment.wav"

# 4. Record manual runtime evidence only after real checks pass
DevelopingData\ToolKitData\Scripts\Execution\record_rustapp_manual_runtime_evidence.py --microphone-capture-smoke-test --asr-transcript-smoke-test --translation-smoke-test --tts-playback-smoke-test --launcher-package-open-test
```

Owner validation and release-candidate status must remain blocked until the evidence gate confirms completion.

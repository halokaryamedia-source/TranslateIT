# ENGINE TTS Backend P3 Report

## Summary

TranslateIT now has a selectable TTS backend abstraction with a safe fallback chain:

- `legacy_sapi_wav`
- `sapi_direct_async`
- `experimental_streaming` placeholder

The current PowerShell/SAPI implementation still does **not** provide true chunk streaming. It has two practical modes:

1. Legacy full-file WAV generation.
2. Direct asynchronous SAPI speech start without a WAV handoff.

## Current PowerShell/SAPI Behavior

The legacy backend still:

- uses a persistent PowerShell worker,
- calls `System.Speech.Synthesis.SpeechSynthesizer`,
- writes a full WAV file for the legacy path,
- waits for the worker to finish generating the audio file before replaying it.

That means the legacy path is still file-based and cannot be called true streaming.

## New Backend Feature Flag

Backend selection is controlled by:

```bash
TRANSLATEIT_TTS_BACKEND=legacy_sapi_wav
TRANSLATEIT_TTS_BACKEND=sapi_direct_async
TRANSLATEIT_TTS_BACKEND=experimental_streaming
```

If an unknown value is provided, TranslateIT falls back to `legacy_sapi_wav`.

## Direct / Async SAPI

Implemented:

- `sapi_direct_async`
- It uses a direct PowerShell/SAPI worker with `SpeakAsync`.
- It does not write a WAV file before speaking.
- It returns an honest direct-playback proxy rather than claiming real chunk streaming.

Not implemented:

- true audio chunk streaming,
- audible first-voice hardware timestamp,
- memory-buffer chunk delivery.

## Fallback Behavior

If the direct backend fails, TranslateIT falls back to the legacy WAV backend.

The report path now records:

- `tts_backend_name`
- `tts_backend_selected`
- `tts_backend_fallback_reason`
- `tts_request_start_ms`
- `tts_audio_ready_ms`
- `tts_direct_speak_called_ms`
- `tts_first_chunk_ready_ms` placeholder for future streaming support

## Files Changed

- [`Experimental/EngineData/TranslateEngine/tts_placeholder.py`](./EngineData/TranslateEngine/tts_placeholder.py)
- [`Experimental/EngineData/LauncherApp/app_main.py`](./EngineData/LauncherApp/app_main.py)
- [`Experimental/EngineData/LauncherApp/latency_report_reader.py`](./EngineData/LauncherApp/latency_report_reader.py)
- [`Experimental/tests/test_engine_hardening.py`](./tests/test_engine_hardening.py)

## Validation

Run:

```bash
python -m compileall -q Experimental\EngineData
python -m unittest discover -s Experimental\tests
```

## Validation Results

- `compileall` on `Experimental\EngineData` passed.
- `unittest` passed with the added backend-selection and latency summary tests.

## Limitations

- The direct SAPI backend is still a proxy improvement, not true streaming.
- `SpeakAsync` starts speech sooner, but exact audible onset still depends on the OS/audio stack.
- The legacy WAV path is still necessary as a fallback and for environments where direct SAPI is unavailable.

## Remaining Work

- Add a real streaming-capable TTS engine if one is introduced later.
- Improve cancellation semantics for overlapping utterances.
- Consider a memory-buffer or chunk-fed audio backend only if a backend supports it natively.

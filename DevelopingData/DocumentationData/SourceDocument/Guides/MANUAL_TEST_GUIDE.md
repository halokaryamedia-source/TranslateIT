# TranslateIT Manual Test Guide

## New UI Overview

Double-click `TranslateIT.vbs`. The TranslateIT Operator Console opens directly with no visible console window during normal launch. Use `TranslateIT.bat` only for maintenance and diagnostics.

- Sidebar: TranslateIT branding, current session, saved-session area, and Settings/Diagnostics shortcut.
- Header: session title, one unified status pill, Menu, and one large Start/Stop button.
- Start button: changes between `Start`, `Preparing`, `Listening`, `Processing`, and `Stop`.
- Transcript area: accepted segment cards with clickable `IN` Indonesian text and clickable `OUT` English text.
- Menu: Settings, audio devices, CUDA diagnostics, runtime/model details, logs, benchmark, session actions, and Advanced Testing.

The batch maintenance menu is no longer the default first screen. Use `TranslateIT.bat --menu` only for setup or repair tasks outside the app.
If you want the cleanest no-flash launch path, use `TranslateIT.vbs`.
If TranslateIT is already running, a second launch should be blocked with a clean message.

## 1. Open TranslateIT

1. Double-click `TranslateIT.bat`.
2. Confirm the Operator Console opens directly.
3. Confirm the main header shows one unified status pill only.

## 2. Prepare Runtime And CUDA

1. If runtime setup is needed, run `TranslateIT.bat --menu` and choose `2. Setup / Repair Runtime`.
2. If CUDA setup is needed, run `TranslateIT.bat --menu` and choose `4. Setup / Validate CUDA Core`.
3. If PyTorch CPU-only is detected, type `YES` to reinstall CUDA-enabled PyTorch wheels.
4. Confirm `CUDA_CORE_PASS`.
5. Run `TranslateIT.bat --validate` and confirm runtime validation passes.

## 3. Microphone Setup

1. In the Operator Console, click `Menu`.
2. Open `Settings`.
3. Select `Input Device`.
4. Select `Output Device`.
5. Microphone is fixed to `Headset`.
6. Click `Run Diagnostic` or `Run Calibration`.
7. Stay silent for the noise measurement phase, then speak normally for the speech phase.
8. Confirm the result is `Microphone usable` or `Input low but usable`.
9. Use `Use this microphone anyway` only when the input is low but still usable.

## 4. Demo Test Mode

1. Click `Menu`.
2. Open `Advanced Testing`.
3. Select `Demo Test Mode`.
4. Close the menu and click `Start`.
5. Confirm a clean transcript card appears with mock labels.

## 5. Real ASR + Mock Translation

1. Confirm `CUDA Ready`.
2. Click `Menu`.
3. Open `Advanced Testing`.
4. Select `Real ASR + Mock Translation`.
5. Click `Start`.
6. Speak: `Selamat pagi, hari ini saya sedang menguji aplikasi penerjemah suara.`
7. Confirm Indonesian transcript appears and English output is clearly labeled mock.

## 6. Real ASR + Real Translation

1. Confirm `CUDA Ready`.
2. Select `Real ASR + Real Translation` in `Menu -> Advanced Testing`.
3. Click `Start`.
4. Speak Indonesian.
5. Confirm the transcript card shows `IN` Indonesian and `OUT` English.
6. Confirm the card top row shows local time and a compact latency pill.

## 7. Save, Replay, And Reports

1. Click `Stop`.
2. Click the `IN` row on an accepted card to play the captured Indonesian source audio.
3. Click the `OUT` row to play cached local Windows voice output for the English translation. If the voice file is still being prepared, wait for the background TTS worker to finish and click `OUT` again.
4. Use `Menu -> Advanced Testing -> Save Current Session`.
5. Use `Export Session Log`.
6. Confirm benchmark files exist under `UserData/LogData`.

## 8. Silence And Latency Checks

1. Confirm `CUDA Ready` and `GPU CUDA`.
2. Press `Start` and stay silent for 10 seconds.
3. No transcript card should appear. Rejected silence/noise events belong only in Diagnostics/Logs.
4. Speak one short Indonesian sentence and stop speaking clearly.
5. Confirm the transcript card shows `You · HH:mm:ss · SEG-...` and a compact latency pill.
6. If latency is above 5 seconds, export the benchmark report. The report should show endpointing, ASR, translation, TTS, UI, and model-load timing so the bottleneck is visible.
7. If a phrase such as `Terima kasih telah menonton` or `Selamat menikmati` appears while you were silent, export the logs immediately; this should now be rejected as a no-speech candidate.

## Troubleshooting

- Operator Console does not open: check `UserData/LogData/launcher_latest.log` and `UserData/LogData/app_crash_latest.log`.
- TranslateIT is already running: the launcher should show a clean message and skip opening a second instance.
- Runtime missing: run `TranslateIT.bat --menu` and choose setup.
- `CUDA Required`: run CUDA setup from the batch menu or use Menu -> Diagnostics to validate.
- `nvidia-smi` missing: install or update the NVIDIA driver.
- PyTorch CPU-only: choose CUDA setup, type `YES`, and wait for reinstall.
- `torch.version.cuda` is `None`: current PyTorch is CPU-only.
- `torch.cuda.is_available` false: install CUDA-enabled PyTorch through CUDA setup.
- CUDA tensor execution failed: check `UserData/LogData/cuda_validation_latest.txt`.
- Microphone too low or silent: increase gain, choose the correct microphone, check Windows microphone permission, and move closer.
- Microphone considered too low when speech is audible: rerun two-phase calibration with a quiet room and confirm the microphone is set correctly in Windows.
- No transcript appears: check microphone calibration, selected mode, rejected warnings in Menu -> Logs, and CUDA status.
- Translation unavailable: check Menu -> Diagnostics for local translation model status.
- Replay disabled during capture: stop capture first.
- IN row replay unavailable: source audio was not captured for that segment.
- OUT row voice does not play: check Windows speaker output, run `Test Output`, and confirm local Windows speech synthesis is available.
- OUT voice delayed: the first voice generation can take longer; accepted segments now prepare OUT voice in the background so later clicks replay the cached WAV.
- Output device not working: select another output device in Settings and run `Test Output`.
- High latency: review Menu -> Diagnostics for active ASR device, compute type, and latency breakdown.
- High latency after OUT click: check logs for `Translation voice generated locally` and the recorded TTS latency.
- Start state unclear: the header badge and primary button should show Idle, Preparing, Listening, Processing, or Error.
- Hallucinated transcript during silence: check Menu -> Logs for `rejected_silence`, `rejected_low_energy`, or `Rejected hallucination/no-speech candidate`.
- Microphone false trigger during silence: rerun calibration with the room quiet during phase 1, then speak normally during phase 2. Live VAD uses raw microphone energy, not normalized audio.
- Translation voice disabled during capture: stop capture first so speaker output cannot feed back into the microphone.
- CPU Degraded Mode warning: this is non-target testing and does not satisfy Core App performance.

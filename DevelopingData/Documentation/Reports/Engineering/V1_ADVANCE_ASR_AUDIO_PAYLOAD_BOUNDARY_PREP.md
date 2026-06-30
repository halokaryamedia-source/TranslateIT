# V1 Advance — Live Pipeline Source Wiring Progress

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: source-side / worker-contract evidence only, bukan Windows runtime proof.

## Progress development

Progress source-side saat ini: sekitar **90%**.

Rinciannya:

- Capture → ASR boundary: source wiring tersedia.
- ASR payload → worker `asr_decode`: source wiring tersedia.
- Guarded ASR runtime path: tersedia, default guard-off.
- ASR transcript promotion: tersedia.
- Translation handoff: tersedia.
- Guarded translation runtime path: tersedia, default guard-off.
- TTS handoff: tersedia.
- Guarded TTS runtime path: tersedia, default guard-off.
- Pipeline evidence file: tersedia.
- Virtual mic preparation dari TTS output path: tersedia.
- Virtual mic route contract: tersedia, dengan scan input/output virtual audio device candidates.
- Preferred virtual mic route config: tersedia sebagai command source-side.
- Final live meeting runtime gate: tersedia sebagai source-side readiness gate.
- Runtime status bundle sekarang membaca final live meeting runtime gate.
- Yang belum selesai: real audio routing ke virtual mic device, persistent preferred-device settings, local compile proof, Windows runtime proof, dan live meeting end-to-end proof.

## Command dan flow yang tersedia

### ASR payload boundary

- `get_latest_asr_audio_payload_status`
- `prepare_asr_audio_payload_request`
- `dispatch_asr_decode_request`
- `promote_latest_asr_payload_transcript`

Perilaku utama:

- `dispatch_asr_decode_request` menyiapkan cached PCM16 WAV payload dari live target segment.
- Worker `asr_decode` default guard-off.
- Guarded runtime decode bisa diaktifkan saat validasi lokal lewat `TRANSLATEIT_ENABLE_HELPER_ASR_DECODE=1`.
- Jika guarded ASR berhasil, `transcript_text` bisa dipromosikan ke pipeline lewat `promote_latest_asr_payload_transcript`.

### Translation handoff

- `prepare_translation_handoff_request`
- `dispatch_translation_handoff_request`

Perilaku utama:

- Default guard-off: menerima contract payload tanpa menjalankan model.
- Guarded runtime translation bisa diaktifkan saat validasi lokal lewat `TRANSLATEIT_ENABLE_HELPER_TRANSLATION=1`.
- Jika guarded translation menghasilkan `translated_text`, pipeline langsung mengisi `translated_text` dan `tts_text`.

### TTS handoff

- `prepare_tts_handoff_request`
- `dispatch_tts_handoff_request`

Perilaku utama:

- Default guard-off: menerima contract payload tanpa menjalankan synthesis.
- Guarded runtime TTS bisa diaktifkan saat validasi lokal lewat `TRANSLATEIT_ENABLE_HELPER_TTS=1`.
- Jika guarded TTS menghasilkan `output_path` dan `audio_output_ready=true`, pipeline menyimpan `tts_audio_output_path`.

### Virtual mic preparation

- `prepare_virtual_mic_output_from_latest_tts`
- `get_virtual_mic_route_contract_status`
- `set_preferred_virtual_mic_route_devices`

Perilaku utama:

- Hanya bisa ready jika pipeline punya `tts_audio_output_path` dan `audio_output_ready=true`.
- Route contract melakukan source-side device scan lewat native audio device inventory.
- Auto-detect mencari kandidat virtual device seperti VB-Audio, Cable Input/Output, Voicemeeter, BlackHole, Loopback, Virtual Cable, Virtual Audio, atau Stereo Mix.
- Preferred route command dapat menyimpan selected virtual output/input device secara in-memory untuk sesi app saat ini.
- Blocker yang dapat muncul:
  - `virtual_mic:missing_tts_output`
  - `virtual_mic:output_device_missing`
  - `virtual_mic:input_device_missing`
  - `virtual_mic:selected_output_device_missing`
  - `virtual_mic:selected_input_device_missing`
  - `virtual_mic:route_not_ready`

Runtime claim:

- `virtual_mic_route_device_selection_source_side_not_audio_routing_proof`

### Final live meeting runtime gate

- `get_live_meeting_runtime_gate_status`

Gate ini hanya source-side ready jika semua marker berikut terpenuhi:

- capture boundary ready
- ASR transcript available
- transcript payload available
- translation available
- TTS text available
- TTS audio output ready
- virtual mic route ready

Runtime claim:

- `live_meeting_runtime_gate_source_side_not_windows_runtime_proof`

### Runtime status bundle integration

`get_runtime_status_bundle` sekarang ikut membawa `live_meeting_runtime_gate`, sehingga status utama app bisa membaca blocker final gate yang sama dengan Developer Diagnostics.

## Developer Diagnostics UI

Tombol yang tersedia di Developer Diagnostics:

- `Latest ASR Payload`
- `Prepare ASR Payload`
- `Dispatch ASR Decode`
- `Promote ASR Transcript`
- `Prepare Virtual Mic`
- `Final Runtime Gate`

Summary UI sekarang menampilkan:

- progress pipeline
- active blocker
- `audio_output_ready`
- `virtual_mic_ready`
- `virtual_mic_route_ready`
- virtual output device candidate
- virtual input device candidate
- `evidence_path`

## Persistent evidence

Pipeline snapshot menulis evidence ke:

```text
UserData/LogData/RustAppValidation/latest_live_pipeline_evidence.json
```

Evidence ini tetap source-side evidence dan tidak boleh dibaca sebagai Windows runtime proof.

## Batasan yang masih berlaku

Belum terbukti:

- Rust/Tauri compile setelah batch ini.
- Developer Diagnostics UI render dan click action di Windows.
- Worker `asr_decode` berjalan di Windows.
- Worker `translation_handoff` menjalankan model translation di Windows.
- Worker `tts_handoff` menghasilkan output WAV di Windows.
- WAV payload benar-benar terbentuk dari mic runtime target PC.
- Whisper/Faster-Whisper menghasilkan `transcript_text` pada target Windows.
- Translation model menghasilkan `translated_text` pada target Windows.
- TTS provider menghasilkan `output_path` pada target Windows.
- Virtual mic route belum mengirim audio ke meeting app.
- Preferred route config masih in-memory, belum persistent settings file.
- Latency meeting runtime belum terbukti.

## Cara validasi lokal nanti

Setelah source-side development selesai:

```bash
npm run check:tauri-rust-local
```

Jika compile aman, aktifkan guarded runtime env:

```bash
TRANSLATEIT_ENABLE_HELPER_ASR_DECODE=1
TRANSLATEIT_ENABLE_HELPER_TRANSLATION=1
TRANSLATEIT_ENABLE_HELPER_TTS=1
```

Flow validasi manual:

1. Start Helper.
2. Worker Status.
3. Start microphone-only capture.
4. Transcript Boundary.
5. Dispatch ASR Decode.
6. Latest ASR Payload.
7. Promote ASR Transcript.
8. Dispatch Translation Handoff.
9. Dispatch TTS Handoff.
10. Prepare Virtual Mic.
11. Final Runtime Gate.
12. Inspect `latest_live_pipeline_evidence.json`.

## Yang harus dilakukan selanjutnya

Development non-local berikutnya:

1. Persist preferred virtual route device selection ke settings file, bukan hanya in-memory.
2. Integrasikan preferred virtual route selection langsung ke `prepare_virtual_mic_output_from_latest_tts`, supaya pipeline menggunakan selected device, bukan hanya auto-detect.
3. Tambahkan source-side route payload dari `tts_audio_output_path` menuju selected output/input virtual device.
4. Setelah itu baru masuk local compile + Windows runtime validation.

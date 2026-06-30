# V1 Advance — ASR Audio Payload Boundary Prep

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: source-side / worker-contract evidence only, bukan Windows runtime proof.

## Progress development

Progress source-side saat ini: sekitar **82%**.

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
- Yang belum selesai: real virtual mic routing, local compile proof, Windows runtime proof, dan live meeting end-to-end gate.

## Tujuan batch

Batch ini memindahkan ASR handoff satu langkah lebih dekat ke runtime nyata tanpa mengklaim Whisper transcription sudah berjalan. Fokusnya adalah boundary dari live capture buffer menuju payload audio yang bisa dikirim ke Python worker, lalu menyiapkan transcript promotion, guarded translation handoff, guarded TTS handoff, persistent evidence, dan virtual mic preparation.

## Yang ditambahkan

### 1. Rust/Tauri ASR audio payload boundary

File:

- `EngineData/Frontend/RustApp/src-tauri/src/commands/asr_payload_boundary.rs`
- `EngineData/Frontend/RustApp/src-tauri/src/commands/mod.rs`
- `EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs`
- `EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs`
- `EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs`
- `EngineData/Frontend/RustApp/src-tauri/src/commands/pipeline_handoff.rs`

Command baru:

- `get_latest_asr_audio_payload_status`
- `prepare_asr_audio_payload_request`
- `dispatch_asr_decode_request`
- `promote_latest_asr_payload_transcript`
- `prepare_virtual_mic_output_from_latest_tts`

Perilaku:

- Membaca `get_capture_transcript_boundary_status()` sebagai gate awal.
- Jika boundary belum siap, command tetap mengembalikan blocker yang jelas dari capture/audio buffer.
- `prepare_asr_audio_payload_request` hanya menyiapkan schema/status tanpa menulis audio.
- `dispatch_asr_decode_request` mencoba menulis latest target ASR segment lewat `live_segment_writer::write_latest_live_target_segment_wav()`.
- Payload worker menggunakan cached PCM16 WAV path: `UserData/CacheData/audio_segments/latest_live_target_segment.wav`.
- Status terakhir disimpan di in-memory cache app session, sehingga Developer Diagnostics bisa membaca ulang hasil terakhir tanpa memicu dispatch baru.
- Dispatch ASR Decode sekarang memakai helper worker response path, sehingga status dapat menyimpan `worker_response_json` dari Python worker, bukan hanya action result ringkas.
- Worker response juga diinterpretasikan menjadi field eksplisit agar validasi lokal lebih mudah dibaca.
- `promote_latest_asr_payload_transcript` membaca cached `worker_response_json`, mengambil `transcript_text` hanya jika `dispatch_ok=true` dan `transcript_text_present=true`, lalu mengisi pipeline transcript payload untuk Translation handoff.
- `dispatch_translation_handoff_request` sekarang membaca worker response langsung. Jika guarded translation menghasilkan `translated_text`, payload pipeline langsung dipromosikan ke `translated_text` dan `tts_text` untuk TTS handoff. Jika guard belum aktif, fallback tetap memakai dev contract placeholder.
- `dispatch_tts_handoff_request` sekarang membaca worker response langsung. Jika guarded TTS menghasilkan `output_path` dan `audio_output_ready=true`, pipeline menyimpan path output audio.
- `prepare_virtual_mic_output_from_latest_tts` menandai virtual mic preparation siap hanya jika pipeline sudah punya TTS `output_path` dan `audio_output_ready=true`.
- Pipeline snapshot sekarang menulis persistent evidence ke `UserData/LogData/RustAppValidation/latest_live_pipeline_evidence.json`.
- Payload/status menyertakan metadata:
  - `sample_rate_hz`
  - `channels`
  - `pcm_format`
  - `frame_count`
  - `duration_ms`
  - `audio_path`
  - `audio_base64_present`
  - `worker_response_json`
  - `worker_stage`
  - `worker_blocker`
  - `worker_note`
  - `transcript_text_present`
  - `transcript_char_count`
  - `tts_audio_output_path`
  - `audio_output_ready`
  - `virtual_mic_ready`
  - `virtual_mic_blocker`
  - `evidence_path`
  - `runtime_claim`

Runtime claim yang dipertahankan:

- `asr_audio_payload_boundary_source_side_not_transcript_proof`
- `asr_decode_audio_file_payload_ready_no_transcript_runtime_claim`
- `asr_decode_worker_response_captured_no_windows_runtime_proof`
- `asr_decode_worker_runtime_transcribe_returned_needs_windows_validation`
- `translation_handoff_dev_payload_contract_no_model_runtime_claim`
- `translation_handoff_worker_runtime_translate_returned_needs_windows_validation`
- `tts_handoff_dev_payload_contract_no_audio_runtime_claim`
- `tts_handoff_worker_runtime_synthesize_returned_needs_windows_validation`
- `pipeline_evidence_file_source_side_not_runtime_proof`

### 2. Python worker guarded `asr_decode` command

File:

- `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker_entry.py`

Command worker baru:

- `asr_decode`

Perilaku:

- Tidak lagi menjadi `worker:unknown_command`.
- Jika tidak ada `audio_path` atau `audio_base64`, return blocker: `asr:missing_audio_payload`.
- Jika inline base64 dikirim tanpa path, return blocker: `asr:audio_base64_not_supported_yet`.
- Jika `audio_path` keluar dari allowed roots, return blocker: `asr:audio_path_invalid:*`.
- Jika file WAV tidak ditemukan, return blocker: `asr:audio_file_missing`.
- Jika faster-whisper/model belum siap, return blocker: `asr:model_not_ready`.
- Jika audio dan model siap tetapi decoder belum di-arm, return blocker: `asr:decoder_runtime_not_enabled_in_wrapper`.
- Guarded runtime decode sudah tersedia lewat `base.handle_transcribe(payload)` apabila `TRANSLATEIT_ENABLE_HELPER_ASR_DECODE=1`, `enable_decoder_runtime=true`, atau `decoder_runtime_enabled=true` diberikan saat validasi lokal.
- Jika guarded decode mengembalikan transcript, response akan memuat `transcript_text`, `transcript_text_present`, `transcript_char_count`, model/device/compute metadata, dan runtime claim `asr_decode_worker_runtime_transcribe_returned_needs_windows_validation`.

Catatan penting: guarded runtime path sudah disiapkan di source, tetapi default tetap guard-off. Ini menjaga agar source development bisa selesai tanpa mengklaim Whisper runtime sampai local compile dan Windows test membuktikannya.

### 3. Python worker guarded `translation_handoff` command

File:

- `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker_entry.py`

Command worker:

- `translation_handoff`

Perilaku:

- Jika transcript payload belum tersedia, return blocker: `translation:missing_transcript_payload`.
- Jika translation guard belum aktif, command tetap menerima contract payload tanpa menjalankan model translation.
- Guarded runtime translation tersedia lewat `base.handle_translate(payload)` apabila `TRANSLATEIT_ENABLE_HELPER_TRANSLATION=1`, `enable_translation_runtime=true`, atau `translation_runtime_enabled=true` diberikan saat validasi lokal.
- Jika import/model translation belum siap, return blocker dari preflight seperti `dependency:transformers_missing`, `dependency:torch_missing`, atau `model:marianmt_id_en_missing`.
- Jika guarded translation berhasil, response memuat `translated_text`, `translation_available=true`, `tts_text_available=true`, model/device/fallback metadata, dan runtime claim `translation_handoff_worker_runtime_translate_returned_needs_windows_validation`.

### 4. Python worker guarded `tts_handoff` command

File:

- `EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker_entry.py`

Command worker:

- `tts_handoff`

Perilaku:

- Jika translated/TTS text payload belum tersedia, return blocker: `tts:missing_translated_text_payload`.
- Jika TTS guard belum aktif, command tetap menerima contract payload tanpa menjalankan synthesis.
- Guarded runtime TTS tersedia lewat `base.handle_synthesize(payload)` apabila `TRANSLATEIT_ENABLE_HELPER_TTS=1`, `enable_tts_runtime=true`, atau `tts_runtime_enabled=true` diberikan saat validasi lokal.
- Jika TTS provider belum siap, return blocker seperti `tts:no_local_provider_available`, Piper asset issue, atau Windows SAPI issue dari preflight.
- Jika guarded TTS berhasil, response memuat `output_path`, `audio_output_ready=true`, provider metadata, dan runtime claim `tts_handoff_worker_runtime_synthesize_returned_needs_windows_validation`.

### 5. Developer Diagnostics UI binding

File:

- `EngineData/Frontend/RustApp/src/app/active-launcher/developerHelperBridgeBinding.ts`
- `EngineData/Frontend/RustApp/src/app/bridge/asrPayloadApi.ts`

UI action baru di-inject ke panel Capture helper bridge controls:

- `Latest ASR Payload`
- `Prepare ASR Payload`
- `Dispatch ASR Decode`
- `Promote ASR Transcript`
- `Prepare Virtual Mic`

Catatan implementasi:

- ASR Payload command sekarang lewat adapter kecil `asrPayloadApi.ts`, memakai shared `runCommand()` agar error bridge tercatat konsisten dengan command Tauri lain.
- Binding UI tidak lagi menyimpan fallback/type ASR Payload lokal yang duplikatif.
- Summary UI menampilkan boundary, audio readiness, WAV path, format, sample count, durasi, next action, blocker, dan detail worker response seperti `asr:model_not_ready`, `resolved_audio_path`, atau `asr:decoder_runtime_not_enabled_in_wrapper` jika tersedia.
- Summary UI juga menampilkan field interpretasi: `workerStage`, `workerBlocker`, `transcriptPresent`, dan `transcriptChars`.
- `Promote ASR Transcript` menyiapkan pipeline payload dari ASR worker response, bukan dari seed/dev text.
- Translation handoff sekarang dapat mempromosikan real `translated_text` ke payload TTS setelah guarded local validation.
- TTS handoff sekarang dapat memanggil guarded synthesis dan mengembalikan `output_path` setelah guarded local validation.
- `Prepare Virtual Mic` menyiapkan gate source-side dari TTS `output_path` menuju virtual mic route berikutnya.
- Pipeline summary menampilkan `evidence_path`, `audio_output_ready`, dan `virtual_mic_ready`.
- Ini masih diagnostic evidence, bukan user-facing runtime readiness.

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
- Virtual mic routing belum menjalankan audio ke meeting app.
- Translation/TTS/virtual mic end-to-end.
- Latency meeting runtime.

## Cara validasi milestone berikutnya

Setelah user siap menjalankan validasi lokal:

```bash
npm run check:tauri-rust-local
```

Jika compile aman, flow manual berikutnya:

1. Start Helper.
2. Worker Status.
3. Start microphone-only capture.
4. Transcript Boundary.
5. Latest ASR Payload, untuk memastikan state awal terbaca.
6. Prepare ASR Payload.
7. Dispatch ASR Decode.
8. Latest ASR Payload lagi, untuk memastikan cached evidence terakhir berubah sesuai hasil dispatch dan memuat `worker_response_json`.
9. Setelah guarded decode menghasilkan transcript, jalankan Promote ASR Transcript.
10. Pipeline Snapshot / Prepare Translation untuk memastikan transcript payload sudah masuk.
11. Dispatch Translation Handoff.
12. Pipeline Snapshot lagi untuk memastikan `payload translation=true` dan `payload tts=true` jika guarded translation mengembalikan translated text.
13. Dispatch TTS Handoff.
14. Inspect worker response untuk `output_path` dan `audio_output_ready=true` jika guarded TTS berhasil.
15. Prepare Virtual Mic.
16. Pipeline Snapshot lagi untuk memastikan `virtualMic=true` dan evidence file terbentuk.

Ekspektasi default saat env guard belum aktif:

- Belum pernah prepare/dispatch → `asr_audio_payload:no_cached_status`.
- Helper belum start → `helper_bridge:not_running`.
- Boundary belum siap → capture/audio buffer blocker.
- WAV belum bisa ditulis → live segment writer blocker.
- Model ASR belum siap → `asr:model_not_ready`.
- Audio + model ASR siap tetapi env guard belum aktif → `asr:decoder_runtime_not_enabled_in_wrapper`.
- Translation payload ada tetapi env guard belum aktif → contract accepted tanpa menjalankan model.
- TTS payload ada tetapi env guard belum aktif → contract accepted tanpa menjalankan synthesis.
- Virtual mic preparation tanpa TTS output → `virtual_mic:missing_tts_output`.

Ekspektasi saat guarded ASR + translation + TTS diaktifkan untuk validasi lokal:

- Set `TRANSLATEIT_ENABLE_HELPER_ASR_DECODE=1` pada worker environment.
- Set `TRANSLATEIT_ENABLE_HELPER_TRANSLATION=1` pada worker environment.
- Set `TRANSLATEIT_ENABLE_HELPER_TTS=1` pada worker environment.
- Jalankan Dispatch ASR Decode lagi.
- Jika berhasil, `workerStage=asr_decode`, `transcriptPresent=true`, dan `transcriptChars>0` harus muncul.
- Jalankan Promote ASR Transcript.
- Jalankan Dispatch Translation Handoff.
- Pipeline snapshot harus menunjukkan `payload transcript=true`, `payload translation=true`, dan `payload tts=true` jika translation berhasil.
- Jalankan Dispatch TTS Handoff.
- Jika TTS berhasil, worker response harus memuat `output_path` dan `audio_output_ready=true`.
- Jalankan Prepare Virtual Mic.
- Pipeline snapshot harus menunjukkan `audio=true`, `virtualMic=true`, dan `evidence_path=UserData/LogData/RustAppValidation/latest_live_pipeline_evidence.json`.
- Jika gagal, gunakan `workerBlocker`, `worker_note`, `worker_response_json`, dan `latest_live_pipeline_evidence.json` untuk debugging.

## Yang harus dilakukan selanjutnya

Development non-local berikutnya:

1. Implement source-side virtual mic route contract dari `tts_audio_output_path` menuju target output device/virtual cable.
2. Tambahkan blocker eksplisit untuk virtual mic device missing.
3. Tambahkan final live meeting runtime gate yang hanya ready jika capture, ASR, translation, TTS, output audio, dan virtual mic route semuanya valid.
4. Setelah itu baru masuk local compile + Windows runtime validation.

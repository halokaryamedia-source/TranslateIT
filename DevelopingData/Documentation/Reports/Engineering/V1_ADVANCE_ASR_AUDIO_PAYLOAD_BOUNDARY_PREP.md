# V1 Advance — ASR Audio Payload Boundary Prep

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: source-side / worker-contract evidence only, bukan Windows runtime proof.

## Tujuan batch

Batch ini memindahkan ASR handoff satu langkah lebih dekat ke runtime nyata tanpa mengklaim Whisper transcription sudah berjalan. Fokusnya adalah boundary dari live capture buffer menuju payload audio yang bisa dikirim ke Python worker.

## Yang ditambahkan

### 1. Rust/Tauri ASR audio payload boundary

File:

- `EngineData/Frontend/RustApp/src-tauri/src/commands/asr_payload_boundary.rs`
- `EngineData/Frontend/RustApp/src-tauri/src/commands/mod.rs`
- `EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs`

Command baru:

- `prepare_asr_audio_payload_request`
- `dispatch_asr_decode_request`

Perilaku:

- Membaca `get_capture_transcript_boundary_status()` sebagai gate awal.
- Jika boundary belum siap, command tetap mengembalikan blocker yang jelas dari capture/audio buffer.
- `prepare_asr_audio_payload_request` hanya menyiapkan schema/status tanpa menulis audio.
- `dispatch_asr_decode_request` mencoba menulis latest target ASR segment lewat `live_segment_writer::write_latest_live_target_segment_wav()`.
- Payload worker menggunakan cached PCM16 WAV path: `UserData/CacheData/audio_segments/latest_live_target_segment.wav`.
- Payload menyertakan metadata:
  - `sample_rate_hz`
  - `channels`
  - `pcm_format`
  - `frame_count`
  - `duration_ms`
  - `audio_path`
  - `audio_base64_present`
  - `runtime_claim`

Runtime claim yang dipertahankan:

- `asr_audio_payload_boundary_source_side_not_transcript_proof`
- `asr_decode_audio_file_payload_ready_no_transcript_runtime_claim`
- `asr_decode_worker_dispatch_returned_no_windows_runtime_proof`

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
- Jika audio dan model siap, wrapper tetap berhenti dengan blocker: `asr:decoder_runtime_not_enabled_in_wrapper`.

Catatan penting: wrapper sengaja belum memanggil `base.handle_transcribe(payload)` sampai ada compile proof dan Windows runtime proof. Ini menjaga agar batch ini tidak salah diklaim sebagai transcription proof.

### 3. Developer Diagnostics UI binding

File:

- `EngineData/Frontend/RustApp/src/app/active-launcher/developerHelperBridgeBinding.ts`

UI action baru di-inject ke panel Capture helper bridge controls:

- `Prepare ASR Payload`
- `Dispatch ASR Decode`

Catatan implementasi:

- Binding sengaja langsung memakai `invoke()` untuk command baru supaya tidak merombak `runtimeApi.ts` besar-besaran sebelum compile proof.
- Summary UI menampilkan boundary, audio readiness, WAV path, format, sample count, durasi, next action, blocker, dan batasan bahwa ini belum transcript/Windows runtime proof.
- Ini masih diagnostic evidence, bukan user-facing runtime readiness.

## Batasan yang masih berlaku

Belum terbukti:

- Rust/Tauri compile setelah batch ini.
- Developer Diagnostics UI render dan click action di Windows.
- Worker `asr_decode` berjalan di Windows.
- WAV payload benar-benar terbentuk dari mic runtime target PC.
- Whisper/Faster-Whisper menghasilkan `transcript_text`.
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
5. Prepare ASR Payload.
6. Dispatch ASR Decode.

Ekspektasi saat ini bukan transcript, tetapi blocker/evidence yang lebih spesifik:

- Boundary belum siap → capture/audio buffer blocker.
- WAV belum bisa ditulis → live segment writer blocker.
- Model belum siap → `asr:model_not_ready`.
- Audio + model siap → `asr:decoder_runtime_not_enabled_in_wrapper` sampai wrapper dipromosikan ke `base.handle_transcribe(payload)`.

## Next recommended batch

Setelah compile proof:

1. Rapikan command baru ke `runtimeApi.ts` jika TypeScript compile sudah aman.
2. Hubungkan `asr_decode` ke real `base.handle_transcribe(payload)` secara guarded.
3. Simpan response sebagai `asr_evidence`.
4. Promote `transcript_text` dari worker ke live pipeline payload hanya jika `ok=true` dan stage=`transcribe/asr_decode`.
5. Baru lanjut ke real translation handoff.

---
title: "TranslateIT Master Development Guide — Latency & Safe Optimization"
source_docx: "TranslateIT_Master_Development_Improvement_Optimization.docx"
format: "Markdown conversion"
---

# TranslateIT Master Development Guide

**Latency, Playback Reliability, and Safe Optimization**

Dokumen terpadu untuk pengembangan lanjutan TranslateIT agar Codex memiliki satu source of truth yang detail, aman, dan terukur.


| Field | Value |
| --- | --- |
| Version | Master Integrated Guide v1.0 |
| Generated | 2026-05-30 13:09 |
| Primary Target | Speech end → first translation text visible: 1.0–1.5 s |
| Secondary Target | Speech end → first audible translated voice: 1.0–1.5 s, after text path and playback instrumentation are proven |
| Primary Safety Rule | Do not break the stable speaker/TTS path while fixing text latency |
| Development Rule | Small patch, measurable evidence, rollback-ready, never all phases at once |


| Prinsip utama<br>Sistem yang stabil tetapi lambat masih bisa dioptimalkan. Sistem yang cepat tetapi sering tidak bersuara tidak bisa dipakai. Karena itu, semua optimasi latency harus berbasis measurement, guardrail, dan rollback point. |
| --- |


## Daftar Isi

1. Ringkasan Eksekutif
2. Status Saat Ini dan Definisi Masalah
3. Instruksi Wajib untuk Codex
4. Source of Truth Workflow Sistem
5. Target Latency dan Definisi Pengukuran
6. Peta Komponen dan Ownership
7. Hipotesis Bottleneck dan Risk Register
8. Playback dan TTS Reliability Layer
9. Measurement-First Strategy
10. Safe Phase Plan
11. Detail Implementasi per Fase
12. Log Schema Reference
13. QA Matrix dan Acceptance Gates
14. Rollback dan Snapshot Protocol
15. Known Failures and Do Not Repeat
16. Codex Prompt Library
17. Decision Tree dan Root Cause Playbook
18. Manual QA Procedure
19. Appendix: Checklist dan Acceptance Values

## 1. Ringkasan Eksekutif

Dokumen ini menggabungkan rencana advanced safe latency improvement dan Codex guide pack menjadi satu dokumen kerja. Tujuannya agar Codex tidak perlu membaca banyak file yang terpisah dan tidak salah konteks saat melakukan patch. Dokumen ini wajib menjadi referensi sebelum melanjutkan pengembangan TranslateIT.


| Prioritas fase terdekat<br>Fokus pertama adalah speech_end → first translation text visible dalam 1.0–1.5 detik. Jalur speaker/TTS sedang stabil, sehingga jangan disentuh agresif pada patch text-latency. |
| --- |


| Prioritas | Fokus | Alasan |
| --- | --- | --- |
| 1 | Pisahkan text latency dan voice latency | Agar sistem tidak mengoptimalkan angka yang salah. |
| 2 | Ukur ready vs visible untuk transcript/translation | Target saat ini adalah text terlihat, bukan suara. |
| 3 | Jaga speaker/TTS tetap stabil | Speaker path sering rusak saat optimasi quality/speed terlalu agresif. |
| 4 | Instrument playback worker/backend | Queued belum berarti suara sudah terdengar. |
| 5 | Optimasi scheduling ringan | Banyak delay bisa berasal dari UI/log/session write yang blocking. |
| 6 | Long speech dan voice-safe chunks | Hanya setelah short/text/playback baseline lulus. |


## 2. Status Saat Ini dan Definisi Masalah

- Aplikasi sudah berjalan dan terjemahan berhasil.
- Live microphone input sudah digunakan untuk jalur bicara user.
- Speaker/TTS saat ini stabil; karena itu, jangan diubah pada patch awal.
- Latency internal aplikasi belum selaras dengan stopwatch/manual QA.
- User melaporkan short speech sekitar 1 detik dapat terasa diproses sekitar 3 detik setelah selesai bicara sampai output keluar.
- Target terdekat adalah selesai bicara → text pertama/translation text terlihat dalam 1.0–1.5 detik.

| Area | Status Saat Ini | Masalah Mungkin | Aksi Aman |
| --- | --- | --- | --- |
| Live microphone input | Sudah live mic, bukan replay WAV. | Masih butuh timestamp proof, tetapi bukan tersangka utama jika delay dihitung setelah speech end. | Tambahkan input source proof dan speech_end timestamp. |
| Audio Verify / endpoint | Relatif kecil pada log sebelumnya. | Bisa menjadi bottleneck jika speech_end salah dihitung. | Ukur speech_end_to_endpoint_decision_ms. |
| ASR | CUDA float16 dan model quality harus dipertahankan. | ASR processing/queue bisa jadi stage terbesar internal. | Ukur asr_queue_wait dan asr_processing; jangan downgrade dulu. |
| Translate | Berhasil menghasilkan target text. | Queue atau UI dispatch bisa membuat visible text terlambat. | Ukur translation_ready vs visible. |
| TTS/speaker | Stabil saat ini. | Rawan rusak jika backend/queue/threading disentuh. | Freeze behavior pada fase text latency. |
| Latency report | Belum stopwatch-aligned. | Formula/internal ready disalahartikan sebagai user-visible latency. | Ganti ke timestamp chain. |


## 3. Instruksi Wajib untuk Codex


### 3.1 Baca Ini Sebelum Edit Kode

1. Identifikasi workspace aktif yang akan diedit.
1. Pastikan V1 fallback tidak disentuh kecuali user eksplisit meminta.
1. Pastikan logic Experimental gagal tidak dipakai ulang tanpa audit.
1. Pastikan perubahan berada di workspace aktif.
1. Jalankan compile check setelah patch.
1. Laporkan file yang berubah.
1. Jangan klaim FIXED tanpa bukti log/runtime/manual QA.

### 3.2 Larangan Keras

- Jangan mengubah V1 safe fallback.
- Jangan mengubah root stable files yang bukan workspace aktif.
- Jangan membuat mode QA khusus ketika user meminta normal flow diperbaiki.
- Jangan mengganti playback backend saat tugasnya text latency.
- Jangan mengganti TTS engine saat speaker stabil.
- Jangan mengubah output device routing tanpa bukti bottleneck.
- Jangan downgrade ASR/translation model.
- Jangan silently fallback ke CPU.
- Jangan memakai mock ASR/translation atau cloud service.
- Jangan menampilkan raw unstable partial transcript.
- Jangan menerjemahkan per kata.
- Jangan membuat TTS mengulang final correction full sentence.
- Jangan menganggap Playback Queued sama dengan suara sudah terdengar.
- Jangan menganggap compile pass sama dengan product fixed.

### 3.3 Definisi Status Laporan


| Status | Definisi | Bukti Minimal |
| --- | --- | --- |
| FIXED | Code fix + validasi runtime/log membuktikan target tercapai. | Log berisi metric target, manual/replay QA lulus, compile pass. |
| PARTIAL | Code sudah ditambah tetapi belum terbukti runtime/manual QA. | Compile pass, log schema ada, tetapi belum ada nilai runtime valid. |
| NOT FIXED | Masalah belum terselesaikan. | Target gagal atau bottleneck belum tertangani. |
| BLOCKED | Tidak bisa dilanjutkan karena dependency/data/test environment tidak tersedia. | Laporan blocker spesifik dan langkah unblock. |


## 4. Source of Truth Workflow Sistem


### 4.1 Normal Product Flow

```text
App Start
→ Engine readiness
→ Mic stream open
→ Mic callback frames confirmed
→ Ready to Listen
→ User speaks
→ Audio Verify / endpointing
→ ASR
→ Translation
→ Text UI update
→ TTS generation
→ Playback / speaker
→ Session/log/report update
```


### 4.2 Prinsip Normal Flow

- Semua perbaikan harus masuk ke normal app flow.
- QA manual user harus menguji jalur normal yang sama dengan pemakaian asli.
- Diagnostics/log boleh detail, tetapi user-facing workflow harus sederhana.
- Jangan membuat jalur khusus seperti Live Mic QA Mode sebagai mode produk.

### 4.3 Input Live Microphone

- Input suara user harus berasal dari microphone callback frames.
- Input live tidak boleh berasal dari sample WAV, replay simulation, stale cache, old segment buffer, atau previous test audio.
- Log harus membuktikan input_source = live_microphone.
```text
{
  "input_source": "live_microphone",
  "sample_wav_used": false,
  "replay_simulation_used": false,
  "cache_audio_used": false
}
```


### 4.4 Output Speaker Saat Ini

```text
Translation text
→ TTS engine
→ generated WAV file
→ ReplayController.replay_audio()
→ AudioPlaybackService.play_wav()
→ playback queue
→ playback worker
→ speaker
```


| Catatan penting<br>Input sudah live mic, tetapi output TTS secara internal masih boleh jadi WAV/file/queue path. Jangan menyebut direct audio streaming tanpa bukti kode. Jangan mengganti jalur WAV ke direct streaming sebelum bottleneck terbukti. |
| --- |


## 5. Target Latency dan Definisi Pengukuran


| Metric | Definisi | Target | Fase |
| --- | --- | --- | --- |
| speech_end_to_transcript_visible_ms | Selesai bicara sampai transcript source terlihat. | <= 700–1000 ms | Text phase |
| speech_end_to_translation_visible_ms | Selesai bicara sampai text terjemahan terlihat. | <= 1000–1500 ms | Target utama saat ini |
| speech_end_to_playback_backend_start_ms | Selesai bicara sampai backend audio mulai play. | <= 1000–1500 ms | Voice phase setelah text stabil |
| speech_start_to_first_voice_ms | Awal bicara sampai voice pertama. | Durasi bicara + 1.0–1.5 s | Fase lanjutan |


### 5.1 Jangan Salah Mengukur Voice Latency

- TTS Audio Ready bukan suara terdengar.
- Playback Queued bukan suara terdengar.
- play_wav returned Queued bukan playback started.
- Formula speech_duration + total_after_eos + tts_ms bukan actual user-visible latency.
- Text ready time bukan text visible time.
- Translation ready time bukan speaker output time.

### 5.2 Timestamp Minimal Text Latency

```text
{
  "speech_start_time": "",
  "speech_end_time": "",
  "endpoint_decision_time": "",
  "asr_start_time": "",
  "asr_end_time": "",
  "translation_start_time": "",
  "translation_end_time": "",
  "transcript_text_visible_time": "",
  "translation_text_visible_time": "",
  "speech_end_to_transcript_text_visible_ms": 0,
  "speech_end_to_translation_text_visible_ms": 0
}
```


### 5.3 Timestamp Minimal Voice Latency

```text
{
  "tts_request_time": "",
  "tts_worker_start_time": "",
  "tts_audio_ready_time": "",
  "playback_queue_put_time": "",
  "playback_worker_dequeue_time": "",
  "playback_backend_start_time": "",
  "playback_finish_time": "",
  "speech_end_to_playback_backend_start_ms": 0,
  "speech_start_to_playback_backend_start_ms": 0,
  "playback_start_measurement_type": "backend_start_proxy"
}
```


## 6. Peta Komponen dan Ownership


| Komponen | Peran | Boleh Diubah Fase Awal | Risiko |
| --- | --- | --- | --- |
| app_main.py | Orkestrasi UI, pipeline result handling, TTS trigger. | Ya, timestamp dan urutan non-risky. | Jangan pindahkan speaker logic besar-besaran. |
| live_pipeline.py | Capture, audio verify, ASR/Translate orchestration. | Ya, logging queue/timing. | Jangan tuning VAD/endpoint tanpa bukti. |
| audio_playback.py | Queue dan worker playback WAV. | Fase playback logging saja. | Jangan ganti winsound/sounddevice dulu. |
| TTS/SAPI wrapper | Generate WAV dari text. | Fase awal hanya timestamp. | Jangan ganti engine/format output. |
| session_reporting.py | Report/benchmark/session files. | Boleh background jika blocking terbukti. | Jangan hapus log. |
| Transcript card/UI | Text visible event. | Boleh tambah timestamp visible event. | Jangan redesign UI. |
| ASR runtime | Model CUDA float16. | Tidak di fase awal. | Jangan downgrade model. |
| Translate engine | Model translation lokal. | Tidak di fase awal. | Jangan ubah model quality. |


## 7. Hipotesis Bottleneck dan Risk Register


| Rank | Dugaan Sumber Delay | Gejala | Cara Membuktikan |
| --- | --- | --- | --- |
| 1 | UI/text visibility menunggu pekerjaan lain | Translation siap tapi text muncul telat. | translation_ready_to_visible_ms |
| 2 | TTS/playback path under-measured | Queued dianggap voice started. | playback_worker_dequeue/backend_start timestamps |
| 3 | translation_end → tts_request gap | Ada jeda setelah translate sebelum TTS. | translation_end_to_tts_request_ms |
| 4 | ASR queue wait | ASR processing wajar tetapi start terlambat. | asr_queue_submit → asr_worker_start |
| 5 | Heavy session/log/report blocking | Disk write sebelum UI/TTS. | log/write event timestamps |
| 6 | Endpoint/audio verify | speech_end terlambat ditentukan. | endpoint_decision_time - speech_end_time |


## 8. Playback dan TTS Reliability Layer

Playback reliability tidak berarti mengganti backend. Pada kondisi speaker stabil, pendekatan paling aman adalah menambahkan event visibility dan validation agar tidak ada silent failure.


| State | Makna | Boleh dianggap suara keluar? |
| --- | --- | --- |
| TTS Requested | TTS mulai diminta. | Tidak |
| TTS Audio Ready | File/buffer audio siap. | Tidak |
| Playback Queued | Audio masuk queue. | Tidak |
| Playback Worker Dequeued | Worker mengambil item queue. | Belum |
| Playback Backend Started | Backend mulai menjalankan audio. | Proxy ya |
| Playback Finished | Backend selesai. | Ya jika tidak error |
| Playback Failed | Ada error. | Tidak |


### 8.1 Validasi Audio Sebelum Playback

- audio_path exists
- file_size > minimum
- duration > 0
- WAV header valid
- file readable
- file not locked
- sample rate valid
- channels valid
- cache key matches text/voice

### 8.2 Penyebab Speaker Rusak Saat Improve

- Playback dipanggil sebelum file audio siap.
- Queue dibersihkan atau diubah terlalu agresif.
- TTS cache hit tetapi path cache invalid.
- Worker playback error tetapi tidak dilaporkan.
- Output device routing berubah tanpa bukti.
- Thread async baru tidak mengirim callback status.

## 9. Measurement-First Strategy

Langkah pertama harus memasang instrumentation yang mengukur event nyata. Setelah itu baru dilakukan optimasi spesifik. Semua angka harus bisa dibandingkan dengan stopwatch manual.


| Breakdown | Metric | Target Awal |
| --- | --- | --- |
| Input finalization | speech_end_to_endpoint_decision_ms | <= 100–250 ms untuk short speech |
| ASR queue | asr_queue_wait_ms | <= 50 ms |
| ASR processing | asr_processing_ms | Pertahankan kualitas; evaluasi jika >700 ms |
| Translate queue | translate_queue_wait_ms | <= 50 ms |
| Translate processing | translate_processing_ms | <= 250 ms untuk short speech |
| UI render | translation_ready_to_visible_ms | <= 50–100 ms |
| TTS scheduling | translation_end_to_tts_request_ms | <= 50–100 ms, voice phase |
| Playback queue | playback_queue_wait_ms | <= 50–150 ms, voice phase |


## 10. Safe Phase Plan


| Fase | Nama | Tujuan | Boleh Mengubah | Tidak Boleh Mengubah | Gate Lulus |
| --- | --- | --- | --- | --- | --- |
| 0 | Backup & Baseline | Pastikan current project bisa rollback. | Dokumentasi, snapshot. | Runtime behavior. | Baseline tercatat. |
| 1 | Text Latency Instrumentation | Pisahkan text latency dari voice latency. | Logging/timestamp UI. | Speaker/TTS behavior. | text_latency log lengkap. |
| 2 | Text Critical Path Optimization | Text visible tidak menunggu TTS/logging. | Ordering non-risky, background report. | Playback backend. | translation_visible <=1.5 s. |
| 3 | Playback Timing Instrumentation | Ukur actual/proxy voice path. | Worker event log. | Backend/device routing. | playback logs lengkap. |
| 4 | Playback Reliability Hardening | Jika speaker bottleneck/bug terbukti. | Validasi WAV, worker heartbeat. | Backend replacement. | No silent failure. |
| 5 | Voice Latency Optimization | TTS request/playback lebih cepat. | Scheduling, safe queue priority. | Direct streaming rewrite. | speech_end_to_backend_start <=1.5 s. |
| 6 | Voice-Safe Long Streaming | Long speech output bertahap. | Committed spoken unit. | Sebelum gate 1–5 lolos. | No repeat, no broken chunks. |


## 11. Detail Implementasi per Fase


### 11.1 Fase 1 — Text Latency Instrumentation

- Tambahkan text_latency_latest.json dan text_latency_breakdown_latest.json.
- Ukur ready vs visible untuk transcript dan translation.
- Jangan sentuh TTS/playback behavior.
- Pastikan UI text update tidak menunggu TTS result.
- Pastikan metric bersifat timestamp-based, bukan formula.

### 11.2 Fase 2 — Text Critical Path Optimization

- Jika translation_ready_to_visible_ms besar, pindahkan UI update sebelum report/session write.
- Jika ASR queue wait besar, cek stale jobs dan worker busy state.
- Jika Translate queue wait besar, prioritaskan short accepted segment.
- Jangan menunggu TTS sebelum menampilkan text.

### 11.3 Fase 3 — Playback Timing Instrumentation

- Tambahkan playback_request_id.
- Log queue_put_time, worker_dequeue_time, backend_start_time, finish/fail.
- Label backend_start sebagai proxy, bukan actual audible jika tidak bisa dibuktikan.
- Jangan mengubah backend atau routing.

### 11.4 Fase 4 — Playback Reliability Hardening

- Validasi file WAV sebelum playback.
- Pisahkan status TTS Audio Ready dan Playback Backend Started.
- Tambahkan worker heartbeat dan last_playback_error.
- Jika winsound mengabaikan selected device, log dulu backend_output_device dan default output.

### 11.5 Fase 5 — Short Utterance Optimization

- Pastikan short utterance tidak masuk long streaming logic.
- Final TTS hanya sekali.
- Text visible tidak menunggu voice path.
- Jangan gunakan forced chunking untuk short speech.

### 11.6 Fase 6 — Long Full-Turn Retention

- Stable chunk processing tidak boleh menghapus full_turn_audio_buffer.
- Final review memakai full-turn audio.
- UI tidak boleh mengganti accumulated chunks dengan tail-only chunk.
- audio_loss_suspected harus aktif jika final text terlalu pendek dibanding full audio.

### 11.7 Fase 7–8 — Future Stable/Voice Streaming

- Long text boleh keluar bertahap hanya setelah full-turn retention lulus.
- Stable chunk TTS hanya setelah playback reliability dan spoken ledger lulus.
- Setiap spoken chunk harus voice_commit_ready.
- Final review tidak boleh re-speak full correction.

## 12. Log Schema Reference


### 12.1 text_latency_latest.json

```text
{
  "session_id": "",
  "segment_id": "",
  "speech_start_time": "",
  "speech_end_time": "",
  "endpoint_decision_time": "",
  "asr_start_time": "",
  "asr_end_time": "",
  "translation_start_time": "",
  "translation_end_time": "",
  "transcript_text_visible_time": "",
  "translation_text_visible_time": "",
  "speech_end_to_transcript_text_visible_ms": 0,
  "speech_end_to_translation_text_visible_ms": 0,
  "largest_delay_stage": "",
  "largest_delay_ms": 0,
  "target_pass_1500ms": false
}
```


### 12.2 first_voice_latency_latest.json

```text
{
  "session_id": "",
  "segment_id": "",
  "speech_start_time": "",
  "speech_end_time": "",
  "tts_request_time": "",
  "tts_audio_ready_time": "",
  "playback_queue_put_time": "",
  "playback_worker_dequeue_time": "",
  "playback_backend_start_time": "",
  "speech_end_to_playback_backend_start_ms": 0,
  "speech_start_to_playback_backend_start_ms": 0,
  "playback_start_measurement_type": "backend_start_proxy",
  "target_pass_1500ms": false
}
```


### 12.3 playback_latency_latest.json

```text
{
  "playback_request_id": "",
  "segment_id": "",
  "audio_path": "",
  "audio_exists": true,
  "audio_file_size": 0,
  "audio_duration_ms": 0,
  "queue_put_time": "",
  "worker_dequeue_time": "",
  "backend_start_time": "",
  "backend_finish_time": "",
  "queue_wait_ms": 0,
  "backend_name": "",
  "output_device_name": "",
  "playback_success": true,
  "playback_error": ""
}
```


### 12.4 short_utterance_debug_latest.json

```text
{
  "segment_id": "",
  "utterance_type": "short",
  "speech_duration_ms": 0,
  "short_path_used": true,
  "long_streaming_logic_skipped": true,
  "stable_chunk_logic_skipped": true,
  "final_tts_once": true,
  "speech_end_to_translation_text_visible_ms": 0,
  "speech_end_to_playback_backend_start_ms": 0
}
```


### 12.5 long_speech_debug_latest.json

```text
{
  "turn_id": "",
  "full_turn_audio_duration_ms": 0,
  "final_asr_audio_duration_ms": 0,
  "final_used_full_turn_audio": true,
  "final_used_tail_only": false,
  "stable_chunk_count": 0,
  "card_reused_for_turn": true,
  "audio_loss_suspected": false,
  "audio_loss_reason": ""
}
```


### 12.6 model_runtime_optimization_latest.json

```text
{
  "asr_model": "",
  "asr_device": "cuda",
  "asr_compute_type": "float16",
  "translation_model": "",
  "cpu_fallback_used": false,
  "cuda_core_pass": true,
  "quality_downgraded": false
}
```


## 13. QA Matrix dan Acceptance Gates


| Test | Input/Procedure | Target | Fail Jika |
| --- | --- | --- | --- |
| Short text QA | Ucapkan: Coba bicara. | translation_visible <= 1.5 s | Text menunggu TTS/logging. |
| Short voice reference | Ucapkan: Coba bicara. | voice backend start measured | Queued dianggap voice start. |
| Speaker stability | Ucapkan 5x short speech. | Semua output bersuara. | 1x silent failure tanpa log. |
| Regression short path | Halo coba bicara. | short_path_used=true | long_streaming_logic masuk. |
| Long sentence retention | Kalimat yayasan panjang. | awal/tengah/akhir tidak hilang. | final_used_tail_only=true. |
| Log truth | Bandingkan stopwatch vs log. | Gap < 500 ms atau alasan jelas. | Gap besar tanpa penjelasan. |


## 14. Rollback dan Snapshot Protocol


| Kondisi | Tindakan |
| --- | --- |
| App tidak bisa start | Rollback patch terakhir, jangan debug di atas state rusak. |
| Mic tidak masuk | Rollback jika patch tidak terkait mic; cek accidental change. |
| Speaker tidak bersuara | Rollback jika patch menyentuh playback/TTS; jangan lanjut optimasi. |
| Latency UI membaik tetapi stopwatch tidak | Jangan rollback dulu jika behavior stabil; perbaiki measurement. |
| CUDA fallback CPU | Rollback langsung kecuali user mengaktifkan CPU degraded mode. |
| Short speech latency memburuk | Rollback long logic dan isolasi short path. |


| Rule of no stacked failure<br>Jika satu patch gagal, jangan tambahkan patch lain di atas state rusak. Rollback dulu atau perbaiki patch itu sampai lulus gate. |
| --- |


## 15. Known Failures and Do Not Repeat

- Membuat QA mode khusus padahal user ingin normal flow diperbaiki.
- Menganggap bootstrap schema log sebagai runtime evidence.
- Stable streaming belum runtime-proven tetapi dilaporkan selesai.
- Short speech ikut diperlambat long streaming logic.
- Long sentence hanya menangkap tail.
- Final correction memakai tail-only audio.
- UI mengganti accumulated text dengan last chunk.
- TTS/speaker rusak setelah optimasi.
- App menganggap Queued sebagai voice output started.
- Latency dihitung formula, bukan actual timestamp.
- Output WAV dianggap direct speaker streaming.
- File WAV valid tetapi output ASR hallucination tidak didiagnosis dengan path/hash/cache.

## 16. Codex Prompt Library


### 16.1 Phase 1 — Instrumentation Only

```text
You are Agent Codex continuing TranslateIT from the current stable project.

Task: instrumentation only.
Do not change behavior.
Do not optimize.
Do not touch speaker/TTS behavior.
Do not change ASR/translation model.

Goal:
Make latency measurement accurate and stopwatch-comparable.

Add logs:
- text_latency_latest.json
- first_voice_latency_latest.json
- playback_latency_latest.json
- real_latency_breakdown_latest.json
- short_utterance_debug_latest.json

Measure:
speech_end_to_translation_text_visible_ms
speech_end_to_playback_backend_start_ms
largest_delay_stage

Run compileall.
Do not claim latency fixed.
```


### 16.2 Phase 2 — Text Critical Path Only

```text
Focus only on text latency.
Target: speech_end_to_translation_text_visible_ms <= 1000-1500 ms.
Do not touch speaker/TTS behavior.

Fix only:
- ASR/Translate queue wait
- UI dispatch delay
- text waiting for TTS
- logging/session write blocking UI text
- short utterance fast path

Preserve ASR/translation model quality.
Run compileall.
Report exact bottleneck before/after.
```


### 16.3 Phase 3 — Playback Timing Only

```text
This patch is playback timing instrumentation only.
Do not change playback backend, TTS engine, WAV generation, output device routing, or queue semantics.

Add playback_request_id and log queue_put_time, worker_dequeue_time, backend_start_time, backend_finish_time, playback_failed_time, backend_name, output_device_name, and queue_wait_ms.
Do not call queued audio a successful voice start.
Generate playback_latency_latest.json and playback_health_latest.json.
Run compileall.
Report whether speaker behavior changed. It must be NO.
```


### 16.4 Phase 4 — Playback Reliability Only

```text
Focus on speaker reliability only.

Add:
- WAV validation before playback
- cache validation
- worker heartbeat
- worker exception logging
- backend error report
- output device diagnostics

Do not optimize speed yet.
Do not change backend unless failure proves current backend is broken.
Run compileall.
```


### 16.5 Phase 5 — Short Utterance Optimization

```text
Focus on short speech only.
Examples:
"Coba bicara."
"Halo coba bicara."

Ensure:
short_path_used = true
long_streaming_logic_skipped = true
stable_chunk_logic_skipped = true
final_tts_once = true

Do not implement long streaming.
Do not touch speaker backend.
Run compileall.
```


### 16.6 Phase 6 — Long Full-Turn Retention

```text
Focus on long speech full-turn retention.

Ensure:
full_turn_audio_buffer is preserved
stable chunk processing does not delete full-turn audio
final correction uses full-turn audio
final_used_tail_only = false
audio_loss_suspected = false

Do not implement spoken chunks yet.
Run compileall.
```


### 16.7 Phase 7 — Stable Phrase Streaming Text

```text
Focus on text-only stable phrase streaming.
Long speech may output stable translated text chunks.
Do not enable stable chunk TTS.
Do not re-speak final correction.
Keep full-turn audio.
Keep short path separate.
Run compileall and generate long_speech_debug_latest.json.
```


### 16.8 Phase 8 — Voice-Safe Spoken Chunks

```text
Only after text streaming and playback reliability are proven.

Implement Committed Spoken Unit:
- chunk must be voice_commit_ready
- pre-speak review passes
- no hanging connector ending
- no duplicate TTS
- spoken segment ledger
- final review no full re-speak
- speak only unspoken tail if safe

Do not claim fixed without voice playback logs.
```


## 17. Decision Tree dan Root Cause Playbook


| Jika log menunjukkan | Interpretasi | Patch berikutnya |
| --- | --- | --- |
| speech_end_to_endpoint_decision_ms besar | Endpoint terlalu konservatif atau speech_end salah dihitung. | Tuning audio verify hanya setelah input proof jelas. |
| asr_queue_wait_ms besar | ASR worker antre atau stale job blocking. | Prioritaskan accepted short segment; bersihkan rejected job. |
| asr_processing_ms besar | ASR inference bottleneck. | Cek CUDA aktif, model reload, warmup; jangan downgrade dulu. |
| translate_queue_wait_ms besar | Translate worker antre. | Prioritaskan short segment dan hindari translate ulang. |
| translation_ready_to_visible_ms besar | UI dispatch/render atau logging menghambat text. | Update card sebelum heavy reports. |
| translation_end_to_tts_request_ms besar | TTS request terlambat. | Request TTS sebelum session/benchmark write. |
| tts_request_to_audio_ready_ms besar | TTS WAV generation lambat. | TTS warmup/cache validation; jangan ganti engine dulu. |
| playback_queue_wait_ms besar | Audio menunggu worker/queue. | Playback queue priority atau stale queue diagnosis. |
| backend_start ada tapi tidak terdengar | Output device/backend issue. | Log default device, selected device, volume/mute, fallback. |


## 18. Manual QA Procedure

1. Restart app fresh agar worker state bersih.
1. Pastikan CUDA status ready dan mic selected benar.
1. Test 1: ucapkan "Coba bicara" lima kali dengan jeda 3 detik antar percobaan.
1. Catat stopwatch speech end → text visible dan speech end → voice heard.
1. Bandingkan dengan text_latency_latest.json dan playback_latency_latest.json.
1. Jika app log berbeda >500 ms dari stopwatch, jangan optimasi; perbaiki measurement.
1. Jika speaker hilang satu kali saja, ambil playback_health_latest.json sebelum restart.
1. Jangan lanjut fase berikutnya jika gate fase saat ini gagal.

## 19. Appendix: Checklist dan Acceptance Values


### 19.1 Checklist Sebelum Codex Patch

- Workspace aktif jelas.
- V1 fallback aman.
- Task phase jelas.
- Target metric jelas.
- Larangan jelas.
- Log output jelas.
- QA phrase jelas.
- Final report format jelas.

### 19.2 Checklist Setelah Codex Patch

- Active project root modified.
- Files changed.
- Compile command executed.
- Logs generated.
- Measured latency values.
- Largest delay stage.
- Short path status.
- Speaker behavior unchanged if not targeted.
- ASR/translation quality unchanged.
- CUDA float16 still active.
- Known blockers.
- Exact next QA steps.

### 19.3 Acceptance Values yang Harus Ditagih dari Codex

```text
speech_end_to_transcript_visible_ms
speech_end_to_translation_visible_ms
translation_ready_to_visible_ms
largest_text_delay_stage
short_path_used
long_streaming_logic_skipped
speaker_behavior_changed=false
playback_backend_changed=false
asr_model_unchanged=true
translation_model_unchanged=true
cuda_float16_active=true
no_cpu_fallback=true
```


| Recommended Next Step<br>Untuk kondisi saat ini, langkah paling aman adalah Phase 1: Instrumentation Only untuk text latency dan playback timing. Setelah timestamp benar dan text latency terbukti, baru lanjut optimasi stage yang terbukti lambat. |
| --- |

# V1 Advance — Live Pipeline Source Wiring Progress

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: source-side / worker-contract evidence only, bukan Windows runtime proof.

## Progress development yang dikalibrasi ulang

Progress gabungan realistis saat ini: sekitar **70%**.

Catatan kalibrasi:

- Angka 90%+ sebelumnya lebih cocok untuk **source-side scaffold progress**, bukan total readiness.
- Setelah dikalibrasi dengan compile/runtime proof yang belum ada, progress total tetap konservatif.
- Progress naik dari 68% ke 70% karena CI workflow, route runtime stub, CI/dev notes, dan static compile-risk fix sudah ditambahkan.
- Yang sudah kuat: source wiring, payload contract, evidence, blocker, diagnostic commands, owner checklist, dan CI guard setup.
- Yang belum terbukti: CI run result, local compile, Windows runtime, ASR runtime, translation runtime, TTS runtime, output route runtime, latency, dan end-to-end meeting proof.

## Rincian status

- Capture → ASR boundary: source wiring tersedia.
- ASR payload → worker `asr_decode`: source wiring tersedia.
- Guarded ASR runtime path: tersedia, default guard-off.
- ASR transcript promotion: tersedia.
- Translation handoff: tersedia.
- Guarded translation runtime path: tersedia, default guard-off.
- TTS handoff: tersedia.
- Guarded TTS runtime path: tersedia, default guard-off.
- Pipeline evidence file: tersedia.
- Virtual route contract: tersedia dengan scan device candidates.
- Preferred virtual route config dipersist ke `UserData/CacheData/virtual_mic_route_preference.json`.
- `prepare_virtual_mic_output_from_latest_tts` membaca selected/preferred route dari persistent config.
- Pipeline payload menyertakan `virtual_mic_route_claim` dan `virtual_mic_route_preference_path`.
- Dedicated route evidence file tersedia di `UserData/LogData/RustAppValidation/latest_virtual_mic_route_evidence.json`.
- Route output contract summary tersedia melalui `route_output_contract_json`.
- Guarded route runtime stub tersedia melalui `prepare_virtual_mic_output_route_runtime_stub`.
- Route runtime stub evidence file tersedia di `UserData/LogData/RustAppValidation/latest_virtual_mic_output_route_stub.json`.
- Final runtime gate: tersedia sebagai source-side readiness gate.
- Runtime status bundle membaca final runtime gate.
- Owner validation checklist tersedia di `DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_OWNER_VALIDATION_CHECKLIST.md`.
- CI workflow tersedia di `.github/workflows/v1-advance-ci.yml`.
- CI/non-local development notes tersedia di `DevelopingData/Documentation/Reports/Engineering/V1_ADVANCE_CI_AND_NON_LOCAL_DEV_NOTES.md`.
- Static compile-risk fix dilakukan untuk route runtime stub JSON agar tidak memindahkan borrowed route fields.

## CI guard

Workflow:

```text
.github/workflows/v1-advance-ci.yml
```

Job utama:

- `source-contract-guards`
- `rust-tauri-compile-guard`

CI menjalankan:

- `npm ci`
- `npm run validate:quick`
- `npm run test:frontend-backend-contract`
- `npm run test:worker-contract`
- `npm run test:rust-linkage-report`
- `npm run test:ui-binding-report`
- `npm run test:action-binding-report`
- `cargo check --manifest-path src-tauri/Cargo.toml`

Catatan:

- CI setup ini belum sama dengan CI result.
- Progress baru bisa dinaikkan lagi jika workflow benar-benar hijau.

## Command dan flow yang tersedia

### ASR payload boundary

- `get_latest_asr_audio_payload_status`
- `prepare_asr_audio_payload_request`
- `dispatch_asr_decode_request`
- `promote_latest_asr_payload_transcript`

### Translation handoff

- `prepare_translation_handoff_request`
- `dispatch_translation_handoff_request`

### TTS handoff

- `prepare_tts_handoff_request`
- `dispatch_tts_handoff_request`

### Virtual route preparation

- `prepare_virtual_mic_output_from_latest_tts`
- `get_virtual_mic_route_contract_status`
- `set_preferred_virtual_mic_route_devices`
- `prepare_virtual_mic_output_route_runtime_stub`

Perilaku utama:

- Route contract melakukan source-side device scan.
- Preferred route command menyimpan selected output/input device ke `UserData/CacheData/virtual_mic_route_preference.json`.
- Pipeline preparation memakai selected/preferred route selection jika tersedia, lalu fallback ke auto-detect dari route contract.
- Route status menampilkan `preference_persisted`, `preference_path`, `evidence_path`, dan `route_output_contract_json`.
- Route runtime stub menerima optional `source_audio_path`; jika kosong, blocker menjadi `virtual_route:missing_source_audio_path`.
- Route runtime stub tidak menjalankan audio output; statusnya tetap source-side contract.
- Pipeline snapshot menampilkan `virtual_mic_route_claim` dan `virtual_mic_route_preference_path`.
- Dedicated route evidence ditulis ke `UserData/LogData/RustAppValidation/latest_virtual_mic_route_evidence.json`.
- Dedicated route stub evidence ditulis ke `UserData/LogData/RustAppValidation/latest_virtual_mic_output_route_stub.json`.
- Blocker yang dapat muncul:
  - `virtual_mic:missing_tts_output`
  - `virtual_mic:output_device_missing`
  - `virtual_mic:input_device_missing`
  - `virtual_mic:selected_output_device_missing`
  - `virtual_mic:selected_input_device_missing`
  - `virtual_mic:route_not_ready`
  - `virtual_route:missing_source_audio_path`
  - `virtual_route:stub_not_ready`

Runtime claim:

- `virtual_mic_route_device_selection_source_side_not_audio_routing_proof`
- `virtual_route_output_contract_source_side_not_audio_runtime_proof`
- `virtual_route_evidence_source_side_not_audio_runtime_proof`
- `virtual_mic_output_route_runtime_stub_source_side_no_audio_execution`
- `virtual_route_runtime_stub_evidence_source_side_no_audio_execution`
- `live_meeting_runtime_gate_source_side_not_windows_runtime_proof`

## Developer Diagnostics UI

Tombol yang tersedia di Developer Diagnostics:

- `Latest ASR Payload`
- `Prepare ASR Payload`
- `Dispatch ASR Decode`
- `Promote ASR Transcript`
- `Virtual Route Status`
- `Route Runtime Stub`
- `Prepare Virtual Mic`
- `Final Runtime Gate`

Summary UI sekarang menampilkan:

- progress pipeline
- active blocker
- `audio_output_ready`
- `virtual_mic_ready`
- `virtual_mic_route_ready`
- selected output/input device
- `virtual_mic_route_claim`
- `virtual_mic_route_preference_path`
- route evidence path
- route output contract presence
- route runtime stub blocker
- `evidence_path`

## Persistent evidence

Pipeline snapshot menulis evidence ke:

```text
UserData/LogData/RustAppValidation/latest_live_pipeline_evidence.json
```

Route status menulis evidence ke:

```text
UserData/LogData/RustAppValidation/latest_virtual_mic_route_evidence.json
```

Route runtime stub menulis evidence ke:

```text
UserData/LogData/RustAppValidation/latest_virtual_mic_output_route_stub.json
```

Evidence ini tetap source-side evidence dan tidak boleh dibaca sebagai Windows runtime proof.

## Batasan yang masih berlaku

Belum terbukti:

- CI workflow hijau.
- Rust/Tauri compile setelah batch ini.
- Developer Diagnostics UI render dan click action di Windows.
- Worker `asr_decode` berjalan di Windows.
- Worker `translation_handoff` menjalankan model translation di Windows.
- Worker `tts_handoff` menghasilkan output file di Windows.
- ASR menghasilkan `transcript_text` pada target Windows.
- Translation menghasilkan `translated_text` pada target Windows.
- TTS menghasilkan `output_path` pada target Windows.
- Runtime route belum terbukti.
- Latency runtime belum terbukti.
- End-to-end meeting route belum terbukti.

## Cara validasi lokal nanti

Setelah user mengizinkan validasi lokal:

```bash
npm run check:tauri-rust-local
```

Jika compile aman, aktifkan guarded runtime env:

```bash
TRANSLATEIT_ENABLE_HELPER_ASR_DECODE=1
TRANSLATEIT_ENABLE_HELPER_TRANSLATION=1
TRANSLATEIT_ENABLE_HELPER_TTS=1
```

Flow validasi manual nanti:

1. Pastikan CI hijau.
2. Start Helper.
3. Worker Status.
4. Start microphone-only capture.
5. Transcript Boundary.
6. Dispatch ASR Decode.
7. Latest ASR Payload.
8. Promote ASR Transcript.
9. Dispatch Translation Handoff.
10. Dispatch TTS Handoff.
11. Virtual Route Status.
12. Route Runtime Stub.
13. Prepare Virtual Mic.
14. Final Runtime Gate.
15. Inspect `latest_live_pipeline_evidence.json`.
16. Inspect `latest_virtual_mic_route_evidence.json`.
17. Inspect `latest_virtual_mic_output_route_stub.json`.

## Yang harus dilakukan selanjutnya

Development non-local berikutnya:

1. Monitor/inspect CI result setelah workflow berjalan di GitHub.
2. Jika CI gagal, perbaiki source/CI berdasarkan error log.
3. Lanjut source-side cleanup untuk file besar yang berubah.
4. Setelah user mengizinkan, baru masuk local compile + Windows runtime validation.

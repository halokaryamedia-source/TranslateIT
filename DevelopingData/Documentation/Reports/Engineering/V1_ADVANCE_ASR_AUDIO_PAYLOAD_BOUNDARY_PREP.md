# V1 Advance — Live Pipeline Source Wiring Progress

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: source-side / worker-contract evidence only, bukan Windows runtime proof.

## Progress development

Progress source-side saat ini: sekitar **93%**.

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
- Virtual route contract: tersedia dengan scan device candidates.
- Preferred virtual route config dipersist ke `UserData/CacheData/virtual_mic_route_preference.json`.
- `prepare_virtual_mic_output_from_latest_tts` membaca selected/preferred route dari persistent config.
- Pipeline payload menyertakan `virtual_mic_route_claim` dan `virtual_mic_route_preference_path`.
- Dedicated route evidence file tersedia di `UserData/LogData/RustAppValidation/latest_virtual_mic_route_evidence.json`.
- Route output contract summary tersedia melalui `route_output_contract_json`.
- Final runtime gate: tersedia sebagai source-side readiness gate.
- Runtime status bundle membaca final runtime gate.
- Yang belum selesai: runtime output route implementation, local compile proof, Windows runtime proof, dan end-to-end proof.

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

Perilaku utama:

- Route contract melakukan source-side device scan.
- Preferred route command menyimpan selected output/input device ke `UserData/CacheData/virtual_mic_route_preference.json`.
- Pipeline preparation memakai selected/preferred route selection jika tersedia, lalu fallback ke auto-detect dari route contract.
- Route status menampilkan `preference_persisted`, `preference_path`, `evidence_path`, dan `route_output_contract_json`.
- Pipeline snapshot menampilkan `virtual_mic_route_claim` dan `virtual_mic_route_preference_path`.
- Dedicated route evidence ditulis ke `UserData/LogData/RustAppValidation/latest_virtual_mic_route_evidence.json`.
- Blocker yang dapat muncul:
  - `virtual_mic:missing_tts_output`
  - `virtual_mic:output_device_missing`
  - `virtual_mic:input_device_missing`
  - `virtual_mic:selected_output_device_missing`
  - `virtual_mic:selected_input_device_missing`
  - `virtual_mic:route_not_ready`

Runtime claim:

- `virtual_mic_route_device_selection_source_side_not_audio_routing_proof`
- `virtual_route_output_contract_source_side_not_audio_runtime_proof`
- `virtual_route_evidence_source_side_not_audio_runtime_proof`
- `live_meeting_runtime_gate_source_side_not_windows_runtime_proof`

## Developer Diagnostics UI

Tombol yang tersedia di Developer Diagnostics:

- `Latest ASR Payload`
- `Prepare ASR Payload`
- `Dispatch ASR Decode`
- `Promote ASR Transcript`
- `Virtual Route Status`
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

Evidence ini tetap source-side evidence dan tidak boleh dibaca sebagai Windows runtime proof.

## Batasan yang masih berlaku

Belum terbukti:

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

Flow validasi manual nanti:

1. Start Helper.
2. Worker Status.
3. Start microphone-only capture.
4. Transcript Boundary.
5. Dispatch ASR Decode.
6. Latest ASR Payload.
7. Promote ASR Transcript.
8. Dispatch Translation Handoff.
9. Dispatch TTS Handoff.
10. Virtual Route Status.
11. Prepare Virtual Mic.
12. Final Runtime Gate.
13. Inspect `latest_live_pipeline_evidence.json`.
14. Inspect `latest_virtual_mic_route_evidence.json`.

## Yang harus dilakukan selanjutnya

Development non-local berikutnya:

1. Tambahkan runtime output route implementation stub yang tetap guarded dan source-side safe.
2. Tambahkan final owner-validation checklist untuk membedakan source readiness, local compile proof, Windows runtime proof, dan end-to-end proof.
3. Setelah itu baru masuk local compile + Windows runtime validation.

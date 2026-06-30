# V1 Advance — CI and Non-Local Development Notes

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: non-local development guidance; bukan bukti local/runtime.

## Tujuan CI

Workflow CI ditambahkan untuk menangkap risiko source-side sebelum masuk local validation.

Workflow:

```text
.github/workflows/v1-advance-ci.yml
```

CI ini fokus pada:

1. Frontend/source contract guards.
2. TypeScript typecheck.
3. Rust/Tauri compile guard via GitHub Actions.
4. Contract/report scripts yang sudah tersedia di `package.json`.
5. Virtual route bridge/command/type/action consistency.

## CI jobs

### 1. Source contract guards

Job ini berjalan di:

```text
EngineData/Frontend/RustApp
```

Langkah utama:

```bash
npm ci
npm run validate:quick
npm run test:frontend-backend-contract
npm run test:worker-contract
npm run test:rust-linkage-report
npm run test:ui-binding-report
npm run test:action-binding-report
```

`validate:quick` sekarang juga menjalankan:

```bash
npm run validate:virtual-route
```

Tujuan:

- Menangkap import/type/action binding issue.
- Menangkap frontend/backend contract mismatch.
- Menangkap worker contract drift.
- Menangkap registry/linkage consistency issue.
- Menangkap virtual route command/type/bridge drift.
- Menangkap route diagnostics yang kembali mengirim hardcoded null source audio path.

### 2. Rust/Tauri compile guard

Job ini memasang dependency Linux untuk compile guard Tauri lalu menjalankan:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Tujuan:

- Menangkap missing Rust symbol.
- Menangkap Tauri command registry mismatch.
- Menangkap struct/function signature error.
- Menangkap borrow/move error dari perubahan Rust source.

Catatan:

- Ini tetap CI compile guard, bukan Windows runtime proof.
- Jika CI gagal karena dependency Linux/Tauri package, perbaiki workflow sebelum menganggap source salah.

## Non-local development order

Urutan yang disarankan sebelum local validation:

1. Source-side compile-risk review.
2. CI workflow aktif di branch `V1-Advance`.
3. Perbaiki error CI jika muncul.
4. Lengkapi documentation/evidence contract.
5. Baru minta izin user untuk local compile validation.

## Local validation order nanti

Jika user sudah mengizinkan local validation:

1. Jalankan local compile check.
2. Pastikan frontend typecheck dan Rust compile aman.
3. Start helper worker.
4. Check worker status.
5. Start microphone-only capture.
6. Validate capture boundary.
7. Dispatch ASR decode.
8. Promote ASR transcript.
9. Dispatch translation handoff.
10. Dispatch TTS handoff.
11. Check virtual route status.
12. Prepare route runtime stub with actual TTS output path.
13. Prepare virtual mic route.
14. Final runtime gate.
15. Baru lanjut route runtime implementation validation.

## Expected failure points

### Compile/source failures

- Missing Tauri command registration.
- TypeScript union type belum mencakup response baru.
- Tauri invoke argument naming mismatch.
- Rust borrow/move error saat membuat JSON evidence.
- Missing module export di `commands/mod.rs`.
- Virtual route bridge tidak membaca latest pipeline TTS output path.
- Virtual route diagnostics mengirim hardcoded null source audio path.

### Runtime setup failures

- Helper worker tidak start.
- Model ASR belum siap.
- Translation model belum siap.
- TTS provider belum siap.
- Virtual device tidak ditemukan.
- Source audio path belum tersedia.

### End-to-end failures

- Transcript tidak muncul.
- Translation kosong.
- TTS output path kosong.
- Route target salah device.
- Meeting app tidak menerima audio.
- Latency terlalu tinggi.

## Progress calibration

Progress gabungan tetap sekitar **72%** sampai minimal CI dan local compile proof tersedia.

Jika CI source-contract + Rust/Tauri compile guard hijau, progress bisa dinaikkan konservatif ke sekitar **74-76%**.

Jika Windows runtime ASR/Translation/TTS juga terbukti, progress bisa naik ke sekitar **82-86%**.

Jika route runtime dan end-to-end meeting terbukti, baru layak mendekati **90%+**.

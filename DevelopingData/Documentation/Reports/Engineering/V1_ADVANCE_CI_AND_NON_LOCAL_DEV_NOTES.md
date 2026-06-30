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

Scope penting:

- CI ini hanya untuk branch `V1-Advance`.
- Branch `Developing` tidak ditargetkan karena branch itu adalah wadah kosong dan tidak boleh disentuh oleh V1 Advance CI.
- Scope ini dijaga oleh script `validate:ci-scope` agar workflow tidak kembali memasukkan `Developing`.

CI ini fokus pada:

1. Frontend/source contract guards.
2. TypeScript typecheck.
3. Real Vite frontend build guard.
4. Rust/Tauri compile guard via GitHub Actions.
5. Contract/report scripts yang sudah tersedia di `package.json`.
6. Virtual route bridge/command/type/action consistency.
7. Reproducible Cargo dependency validation through `--locked`.
8. V1-Advance-only workflow scope validation.

## CI jobs

### 1. Source contract guards

Job ini berjalan di:

```text
EngineData/Frontend/RustApp
```

Runner dipin ke:

```text
ubuntu-22.04
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
npm run validate:ci-scope
npm run validate:virtual-route
npm run typecheck
npm run check:rust
npm run preflight:frontend-build
```

Tujuan:

- Menangkap import/type/action binding issue.
- Menangkap frontend/backend contract mismatch.
- Menangkap worker contract drift.
- Menangkap registry/linkage consistency issue.
- Menangkap virtual route command/type/bridge drift.
- Menangkap route diagnostics yang kembali mengirim hardcoded null source audio path.
- Menangkap stale professional readiness gaps dan duplicate route-stub preparation pattern.
- Menangkap workflow yang tanpa sengaja kembali menyentuh branch `Developing`.

### 2. Frontend typecheck and Vite build guard

Job ini sengaja dipisahkan dari source-contract guards agar error build frontend terlihat jelas.

Runner dipin ke:

```text
ubuntu-22.04
```

Langkah utama:

```bash
npm ci
npm run typecheck
npm run build:frontend
```

Tujuan:

- Menangkap TypeScript compile error.
- Menangkap Vite import/bundling error.
- Menangkap missing CSS/entrypoint import.
- Mengurangi kemungkinan local frontend validation gagal karena issue yang bisa terlihat di CI.

### 3. Rust/Tauri compile guard

Job ini memasang dependency Linux untuk compile guard Tauri lalu menjalankan:

```bash
cargo check --locked --manifest-path src-tauri/Cargo.toml
```

Runner dipin ke:

```text
ubuntu-22.04
```

Linux packages yang dipasang:

```text
build-essential
curl
libgtk-3-dev
libayatana-appindicator3-dev
librsvg2-dev
libssl-dev
libwebkit2gtk-4.1-dev
pkg-config
```

Tujuan:

- Menangkap missing Rust symbol.
- Menangkap Tauri command registry mismatch.
- Menangkap struct/function signature error.
- Menangkap borrow/move error dari perubahan Rust source.
- Menangkap Cargo.lock drift lebih awal melalui `--locked`.

Catatan:

- Ini tetap CI compile guard, bukan Windows runtime proof.
- Jika CI gagal karena dependency Linux/Tauri package, perbaiki workflow sebelum menganggap source salah.
- GitHub connector saat ini tidak menampilkan workflow run untuk commit terbaru karena endpoint yang tersedia memfilter pull-request-triggered runs; jadi kosongnya workflow run belum otomatis berarti workflow tidak berjalan.

## Non-local development order

Urutan yang disarankan sebelum local validation:

1. Source-side compile-risk review.
2. CI workflow aktif di branch `V1-Advance` atau via PR menuju `V1-Advance`.
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
- Vite gagal menemukan frontend entrypoint/CSS import.
- Cargo.lock drift setelah dependency Rust berubah.
- Workflow tanpa sengaja kembali menargetkan `Developing`.

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

Jika CI source-contract + frontend build + Rust/Tauri compile guard hijau, progress bisa dinaikkan konservatif ke sekitar **76-78%**.

Jika Windows runtime ASR/Translation/TTS juga terbukti, progress bisa naik ke sekitar **82-86%**.

Jika route runtime dan end-to-end meeting terbukti, baru layak mendekati **90%+**.

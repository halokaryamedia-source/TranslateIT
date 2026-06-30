# V1 Advance — Owner Validation Checklist

Tanggal: 2026-06-30
Branch: `V1-Advance`
Status: checklist validasi; bukan bukti runtime.

## Progress yang dikalibrasi ulang

Progress gabungan saat ini: sekitar **68%**.

Angka ini lebih konservatif daripada progress source-scaffold sebelumnya karena development belum melewati local compile, Windows runtime, dan end-to-end validation.

## Pembagian progress

| Area | Status | Estimasi |
| --- | --- | ---: |
| Source-side pipeline scaffolding | Banyak sudah tersedia | 85% |
| Evidence dan blocker instrumentation | Banyak sudah tersedia | 80% |
| Local compile proof | Belum dilakukan | 0% |
| Windows runtime proof | Belum dilakukan | 0% |
| ASR runtime proof | Belum terbukti | 0% |
| Translation runtime proof | Belum terbukti | 0% |
| TTS runtime proof | Belum terbukti | 0% |
| Virtual route runtime proof | Belum terbukti | 0% |
| End-to-end live meeting proof | Belum terbukti | 0% |

## Checklist source readiness

- [x] Capture boundary status tersedia.
- [x] ASR payload boundary tersedia.
- [x] Worker `asr_decode` contract tersedia.
- [x] Guarded ASR runtime path tersedia, default guard-off.
- [x] Transcript promotion tersedia.
- [x] Translation handoff tersedia.
- [x] Guarded translation runtime path tersedia, default guard-off.
- [x] TTS handoff tersedia.
- [x] Guarded TTS runtime path tersedia, default guard-off.
- [x] Pipeline evidence file tersedia.
- [x] Preferred virtual route config tersedia dan persistent.
- [x] Route contract evidence tersedia.
- [x] Route runtime stub evidence tersedia.
- [x] Final runtime gate tersedia sebagai source-side gate.
- [x] Runtime status bundle membaca final runtime gate.

## Checklist local compile proof

- [ ] `npm run check:tauri-rust-local` berhasil.
- [ ] Rust command registry compile tanpa missing symbol.
- [ ] TypeScript compile tanpa missing type/action.
- [ ] Tauri command argument naming tervalidasi.
- [ ] Developer Diagnostics UI render tanpa error.

## Checklist Windows runtime proof

- [ ] Helper worker start/stop berhasil di Windows.
- [ ] Worker status membaca model/provider state dengan benar.
- [ ] Capture microphone-only berjalan di Windows.
- [ ] Target ASR segment WAV terbentuk dari live capture.
- [ ] `asr_decode` guarded runtime menghasilkan transcript.
- [ ] Translation guarded runtime menghasilkan translated text.
- [ ] TTS guarded runtime menghasilkan output audio path.
- [ ] Virtual route selection menemukan selected output/input device yang valid.
- [ ] Route runtime stub menerima source audio path dan route ready.

## Checklist end-to-end proof

- [ ] Mic input diterima.
- [ ] ASR transcript muncul.
- [ ] Translation muncul.
- [ ] TTS output terbentuk.
- [ ] Output audio route runtime berjalan.
- [ ] Meeting app menerima audio route sesuai device target.
- [ ] Latency diukur.
- [ ] Failure case memiliki blocker yang jelas.

## Owner decision gate

Owner validation baru boleh dianggap siap jika:

1. Local compile proof selesai.
2. Windows runtime proof selesai minimal untuk ASR, translation, dan TTS.
3. Virtual route runtime proof selesai.
4. End-to-end proof minimal satu skenario meeting selesai.

Sebelum empat area itu selesai, status tetap source-side readiness, bukan product-ready runtime.

## Yang harus dilakukan selanjutnya

1. Lanjutkan non-local source cleanup bila masih ada contract yang belum lengkap.
2. Setelah user mengizinkan validasi lokal, jalankan local compile check.
3. Setelah compile aman, jalankan Windows runtime validation bertahap dari helper worker sampai end-to-end route.

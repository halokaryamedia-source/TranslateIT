# TranslateIT GitHub Setup Guide

Tujuan: menjadikan source TranslateIT sebagai repository GitHub private, aman dari cache/log/user data, dan siap dibaca oleh ChatGPT/Codex setelah repository terkoneksi.

## 1. Struktur source yang terdeteksi

Source paket saat ini berisi root berikut:

```text
DeveloperData/
DevelopingData/
EngineData/
UserData/
README.md
TranslateIT.vbs
.gitignore
```

Catatan penting:

- Belum ada `.gitignore` pada paket source.
- `UserData/CacheData` berisi banyak file audio `.wav` runtime/cache.
- `UserData/LogData` berisi log runtime besar.
- Untuk GitHub, folder runtime/cache/log/user output sebaiknya tidak ikut dipush.

## 2. Rekomendasi visibility repository

Gunakan **Private Repository** untuk tahap pengembangan TranslateIT, karena source aplikasi masih berisi dokumentasi internal, struktur engine, dan kemungkinan data runtime.

Nama repository yang disarankan:

```text
TranslateIT
```

## 3. File `.gitignore` yang disarankan

Buat file bernama `.gitignore` di root project dan isi dengan template berikut:

```gitignore
# Python cache
__pycache__/
*.py[cod]
*.pyo
*.pyd
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
htmlcov/

# Virtual environments
.venv/
venv/
env/
ENV/

# Runtime logs
*.log
UserData/LogData/
DevelopingData/Reports/**/*.log

# User/runtime cache data
UserData/CacheData/
UserData/SavedData/
UserData/SavedProject/

# Audio/generated runtime files
*.wav
*.mp3
*.flac
*.ogg

# Local model/cache data
DevelopingData/ToolKitData/ModelCache/HuggingFaceHome/
EngineData/**/ModelCache/
EngineData/**/models/
*.bin
*.safetensors
*.gguf
*.onnx
*.pt
*.pth

# Secrets and local config
.env
.env.*
*.pem
*.key
*.crt
secrets.json
config.local.json

# Windows/editor files
Thumbs.db
Desktop.ini
.vscode/
.idea/

# Build/dist output
dist/
build/
*.spec
```

Jika ada file contoh yang ingin tetap masuk repo, gunakan pola seperti:

```gitignore
!UserData/README.md
!UserData/**/README.md
```

## 4. Cara paling cepat: GitHub CLI

Jalankan di PowerShell dari folder root project:

```powershell
cd "D:\Work\AI Stuff\TranslateIT\Developing\Experimental"

git --version
gh --version

git init -b main
git add .gitignore
git add DeveloperData DevelopingData EngineData UserData TranslateIT.vbs UPLOAD_NOTES.txt
git status
git commit -m "Initial TranslateIT source baseline"

gh auth login
gh repo create TranslateIT --private --source=. --remote=origin --push
```

Jika repo berada di organisasi, gunakan:

```powershell
gh repo create NAMA_ORGANISASI/TranslateIT --private --source=. --remote=origin --push
```

## 5. Cara manual tanpa GitHub CLI

1. Buka GitHub.
2. Buat repository baru bernama `TranslateIT`.
3. Pilih **Private**.
4. Jangan centang README, `.gitignore`, atau license dari website GitHub.
5. Copy URL repository, contoh:

```text
https://github.com/USERNAME/TranslateIT.git
```

6. Jalankan command berikut dari root project:

```powershell
cd "D:\Work\AI Stuff\TranslateIT\Developing\Experimental"

git init -b main
git add .gitignore
git add DeveloperData DevelopingData EngineData UserData TranslateIT.vbs UPLOAD_NOTES.txt
git status
git commit -m "Initial TranslateIT source baseline"

git remote add origin https://github.com/USERNAME/TranslateIT.git
git remote -v
git push -u origin main
```

## 6. Update berikutnya setelah ada perubahan source

Setiap selesai memperbaiki aplikasi:

```powershell
git status
git add .
git commit -m "Describe the TranslateIT update"
git push
```

Contoh commit message yang rapi:

```text
Fix startup engine stuck at preparing
Add engine readiness diagnostics
Repair launcher entry point
Update transcript engine fallback path
```

## 7. Menghubungkan repository ke ChatGPT

Setelah repository ada di GitHub:

1. Buka ChatGPT.
2. Masuk ke **Settings → Apps**.
3. Cari **GitHub**.
4. Install/authorize GitHub app.
5. Pilih repository `TranslateIT`.
6. Setelah tersambung, gunakan pertanyaan seperti:

```text
Baca repository TranslateIT saya. Audit kenapa Start Engine stuck di Preparing, lalu tunjukkan file yang perlu diperbaiki.
```

Catatan: koneksi GitHub di ChatGPT utamanya untuk membaca, menganalisis, dan mencari kode. Untuk membuat perubahan langsung ke repo, gunakan Codex atau lakukan perubahan lokal lalu `git push`.

## 8. Pemeriksaan sebelum push

Sebelum `git push`, cek:

```powershell
git status
```

Pastikan yang tidak ikut masuk:

- `UserData/CacheData/`
- `UserData/LogData/`
- file `.wav` hasil runtime
- file `.log`
- model lokal besar seperti `.gguf`, `.safetensors`, `.bin`, `.onnx`
- `.env`, API key, token, password

## 9. Jika file besar sudah terlanjur masuk commit

Jangan langsung push. Jalankan:

```powershell
git reset --soft HEAD~1
```

Lalu perbaiki `.gitignore`, ulangi:

```powershell
git add .gitignore
git add .
git status
git commit -m "Initial TranslateIT source baseline"
```

## 10. Target workflow harian

```text
Edit source di PC
→ Test launcher/app
→ git status
→ git add .
→ git commit -m "pesan update"
→ git push
→ ChatGPT/Codex baca repo terbaru dari GitHub
```

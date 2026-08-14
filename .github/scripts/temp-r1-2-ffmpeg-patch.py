from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


voice = Path("EngineData/Backend/RuntimeAssets/Voice/README.md")
text = voice.read_text(encoding="utf-8")
text = text.replace(
    "      ├─ ffmpeg.exe\n      ├─ nltk_data/",
    "      ├─ ffmpeg.exe\n      ├─ FFMPEG_LICENSE.txt\n      ├─ FFMPEG_SOURCE.txt\n      ├─ nltk_data/",
    1,
)
text = text.replace(
    "`ffmpeg.exe` is the local decoder used by the approved headless English training path. VoiceLab does not rely on a system-PATH FFmpeg installation. `ffprobe.exe` is not part of the current required asset contract because the approved A4 path does not consume it.",
    "`ffmpeg.exe` is the local decoder used by the approved headless English training path. VoiceLab does not rely on a system-PATH FFmpeg installation. `FFMPEG_LICENSE.txt` and `FFMPEG_SOURCE.txt` are required release companions for that exact binary. `ffplay.exe`, `ffprobe.exe`, and libav DLLs are not part of the current runtime contract because the approved path does not consume them.",
    1,
)
old = '''### FFmpeg

`ffmpeg.exe` is **not license-cleared by the current source contract**. FFmpeg is LGPL 2.1-or-later by default, but a build that enables GPL-covered components is governed by GPL terms. The historical GPT-SoVITS-linked Windows binary having a known file hash or being hosted inside an MIT-labelled model repository does not establish its FFmpeg build configuration or license profile.

Before a distributable release, record the exact Windows FFmpeg build origin/configuration and satisfy the corresponding FFmpeg license/source obligations. Do not treat `ffmpeg.exe` presence alone as release clearance.
'''
new = '''### FFmpeg

The VoiceLab decoder provenance/profile is pinned to one reviewed **static LGPL Windows build** rather than the historical provenance-unknown binary:

```text
builder                 BtbN/FFmpeg-Builds
builder release tag     autobuild-2026-08-10-13-17
builder commit          2437e7b868da3c11872367b15f3c613b87c24819
archive                 ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip
archive SHA-256         b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab
FFmpeg version          n8.1.2-34-g9b6c8969e0-20260810
FFmpeg source commit    9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b
ffmpeg.exe SHA-256      ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d
LICENSE.txt SHA-256     da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768
license profile         LGPL-3.0-or-later
build profile           win64-lgpl static executable
```

Hosted inspection of this exact archive confirmed `--pkg-config-flags=--static` and `--enable-version3`, no `--enable-gpl`, no `--enable-nonfree`, and zero DLL files in the archive. `ffmpeg -L` reports GNU Lesser General Public License version 3 or later. A decode smoke using the same VoiceLab shape (`WAV -> f32le / mono / 32 kHz`) also passed. The static executable therefore preserves the existing single-`ffmpeg.exe` runtime behavior; TranslateIT does not add libav DLL loading, `ffprobe`, `ffplay`, or another decoder owner.

The staged runtime must contain exactly these FFmpeg companions beside the GPT-SoVITS source:

```text
ffmpeg.exe
FFMPEG_LICENSE.txt   # exact copy of LICENSE.txt from the pinned BtbN archive
FFMPEG_SOURCE.txt    # bounded provenance/source record below
```

`FFMPEG_SOURCE.txt` must retain at least these exact records:

```text
source_kind=ffmpeg
binary_builder=BtbN/FFmpeg-Builds
builder_release_tag=autobuild-2026-08-10-13-17
builder_commit=2437e7b868da3c11872367b15f3c613b87c24819
archive=ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip
archive_sha256=b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab
ffmpeg_version=n8.1.2-34-g9b6c8969e0-20260810
ffmpeg_source_commit=9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b
ffmpeg_exe_sha256=ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d
license_profile=LGPL-3.0-or-later
build_profile=win64-lgpl-static
```

This resolves the **binary provenance and observed license profile** source-side; it is not a legal-opinion or whole-release clearance claim. A distributable release must preserve the LGPL license text and make the exact corresponding FFmpeg source/build provenance available in the manner required for that distribution. The release operator remains responsible for satisfying the applicable LGPL and third-party obligations. Do not replace this pin with BtbN `latest`, another build variant, or an arbitrary `ffmpeg.exe` without repeating the provenance/profile and VoiceLab decode proof.
'''
if old not in text:
    raise SystemExit("Voice FFmpeg section anchor not found")
voice.write_text(text.replace(old, new, 1), encoding="utf-8")

payload = Path("EngineData/Frontend/RustApp/scripts/validate_release_payload.mjs")
text = payload.read_text(encoding="utf-8")
text = text.replace(
    'import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";\n',
    'import { createHash } from "node:crypto";\nimport { existsSync, readFileSync, readdirSync, statSync } from "node:fs";\n',
    1,
)
text = text.replace(
    'const expectedRevision = "d523079fc05d9a8028d6085bffe4a2757c32abb6";\n',
    'const expectedRevision = "d523079fc05d9a8028d6085bffe4a2757c32abb6";\nconst expectedFfmpegExeSha256 = "ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d";\nconst expectedFfmpegLicenseSha256 = "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768";\n',
    1,
)
text = text.replace(
    'const hasAnyFile = (root) => {\n',
    'const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");\nconst hasAnyFile = (root) => {\n',
    1,
)
old = 'requireFile(join(voiceSourceRoot, "ffmpeg.exe"), "GPT-SoVITS/Source/ffmpeg.exe");\n'
new = '''const ffmpegPath = join(voiceSourceRoot, "ffmpeg.exe");
const ffmpegLicensePath = join(voiceSourceRoot, "FFMPEG_LICENSE.txt");
const ffmpegSourcePath = join(voiceSourceRoot, "FFMPEG_SOURCE.txt");
requireFile(ffmpegPath, "GPT-SoVITS/Source/ffmpeg.exe");
requireFile(ffmpegLicensePath, "GPT-SoVITS/Source/FFMPEG_LICENSE.txt");
requireFile(ffmpegSourcePath, "GPT-SoVITS/Source/FFMPEG_SOURCE.txt");
if (existsSync(ffmpegPath) && sha256File(ffmpegPath) !== expectedFfmpegExeSha256) {
  fail("GPT-SoVITS/Source/ffmpeg.exe does not match the pinned BtbN LGPL static executable.");
}
if (existsSync(ffmpegLicensePath)) {
  if (sha256File(ffmpegLicensePath) !== expectedFfmpegLicenseSha256) {
    fail("GPT-SoVITS/Source/FFMPEG_LICENSE.txt must be the exact LICENSE.txt from the pinned BtbN archive.");
  }
  const ffmpegLicense = readFileSync(ffmpegLicensePath, "utf8");
  if (!ffmpegLicense.includes("GNU LESSER GENERAL PUBLIC LICENSE") || !ffmpegLicense.includes("Version 3, 29 June 2007")) {
    fail("FFMPEG_LICENSE.txt does not contain the expected LGPL v3 license text.");
  }
}
if (existsSync(ffmpegSourcePath)) {
  const sourceRecord = readFileSync(ffmpegSourcePath, "utf8");
  for (const marker of [
    "source_kind=ffmpeg",
    "binary_builder=BtbN/FFmpeg-Builds",
    "builder_release_tag=autobuild-2026-08-10-13-17",
    "builder_commit=2437e7b868da3c11872367b15f3c613b87c24819",
    "archive=ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip",
    "archive_sha256=b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab",
    "ffmpeg_version=n8.1.2-34-g9b6c8969e0-20260810",
    "ffmpeg_source_commit=9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b",
    `ffmpeg_exe_sha256=${expectedFfmpegExeSha256}`,
    "license_profile=LGPL-3.0-or-later",
    "build_profile=win64-lgpl-static",
  ]) {
    if (!sourceRecord.includes(marker)) fail(`FFMPEG_SOURCE.txt provenance marker is missing: ${marker}`);
  }
}
'''
if old not in text:
    raise SystemExit("release payload ffmpeg anchor not found")
text = text.replace(old, new, 1)
text = text.replace(
    '  "tools/subfix_webui.py",\n];',
    '  "tools/subfix_webui.py",\n  "ffplay.exe",\n  "ffprobe.exe",\n];',
    1,
)
text = text.replace(
    'console.log("[release-payload] Required private Python runtime, release model inventory, pruned GPT-SoVITS VoiceLab payload, and standard VB-CABLE provider package are present for Tauri/NSIS staging. This is payload-input proof only, not driver-install, installed-runtime, licensing, or clean-machine proof.");',
    'console.log("[release-payload] Required private Python runtime, release model inventory, pruned GPT-SoVITS VoiceLab payload, pinned FFmpeg LGPL executable/license/source record, and standard VB-CABLE provider package are present for Tauri/NSIS staging. This is controlled payload-input proof only, not whole-release legal, driver-install, installed-runtime, or clean-machine proof.");',
    1,
)
payload.write_text(text, encoding="utf-8")

contract = Path("EngineData/Frontend/RustApp/scripts/validate_release_package_contract.mjs")
text = contract.read_text(encoding="utf-8")
text = text.replace(
    'const buildRelease = readFileSync(join(scriptDir, "build_release.ps1"), "utf8");\n',
    'const buildRelease = readFileSync(join(scriptDir, "build_release.ps1"), "utf8");\nconst releasePayloadValidator = readFileSync(join(scriptDir, "validate_release_payload.mjs"), "utf8");\n',
    1,
)
old = '''for (const marker of [
  "336b2ec4e8d4ac74740798dd40af44e74659ecaf",
  "87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a",
  "d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b",
  "not license-cleared by the current source contract",
  "CMU states research/commercial use is unrestricted",
]) {
  if (!voiceAssetsReadme.includes(marker)) fail(`Voice release provenance/license gate marker is missing: ${marker}`);
}
'''
new = '''for (const marker of [
  "336b2ec4e8d4ac74740798dd40af44e74659ecaf",
  "87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a",
  "d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b",
  "autobuild-2026-08-10-13-17",
  "ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip",
  "b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab",
  "ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d",
  "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768",
  "9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b",
  "LGPL-3.0-or-later",
  "FFMPEG_LICENSE.txt",
  "FFMPEG_SOURCE.txt",
  "CMU states research/commercial use is unrestricted",
]) {
  if (!voiceAssetsReadme.includes(marker)) fail(`Voice release provenance/license gate marker is missing: ${marker}`);
}
for (const marker of [
  'expectedFfmpegExeSha256 = "ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d"',
  'expectedFfmpegLicenseSha256 = "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768"',
  '"FFMPEG_LICENSE.txt"',
  '"FFMPEG_SOURCE.txt"',
  '"builder_release_tag=autobuild-2026-08-10-13-17"',
  '"ffmpeg_source_commit=9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b"',
  '"license_profile=LGPL-3.0-or-later"',
  '"ffplay.exe"',
  '"ffprobe.exe"',
]) {
  if (!releasePayloadValidator.includes(marker)) fail(`FFmpeg release-payload pin marker is missing: ${marker}`);
}
'''
if old not in text:
    raise SystemExit("release package voice marker anchor not found")
text = text.replace(old, new, 1)
text = text.replace(
    'console.log("[release-package-contract] Release source policy is aligned: private Python/model/provider inputs remain controlled, g2p-en 2.1.0 excludes its source-reviewed unused Distance dependency from the frozen Python graph, GPT-SoVITS provenance remains pinned, FFmpeg/VB-CABLE licensing gates remain explicit, and packaged mode has no system-Python fallback. This is dependency/source-contract evidence, not overall legal or installed-runtime clearance.");',
    'console.log("[release-package-contract] Release source policy is aligned: private Python/model/provider inputs remain controlled, the Distance containment stays bounded, GPT-SoVITS provenance remains pinned, FFmpeg is pinned to the reviewed BtbN win64 LGPL static executable with exact license/source companions, VB-CABLE retains its separate distribution gate, and packaged mode has no system-Python fallback. This is dependency/provenance source-contract evidence, not whole-release legal or installed-runtime clearance.");',
    1,
)
contract.write_text(text, encoding="utf-8")

print("[r1.2] persistent FFmpeg provenance/profile contract patched")

from pathlib import Path

path = Path("docs/knowledge/next-action.md")
text = path.read_text(encoding="utf-8")

old_mode = "**Plan / R1.1 Python GPL Dependency Containment CLOSED — R1.2 FFMPEG PROVENANCE NEXT**"
new_mode = "**Plan / R1.2 FFmpeg Provenance/Profile CLOSED — R1.3 THIRD-PARTY NOTICE BUNDLE NEXT**"
if old_mode not in text:
    raise SystemExit("R1.2 current-mode anchor not found")
text = text.replace(old_mode, new_mode, 1)

marker = "## Existing Source-Closed Boundaries\n"
section = '''## R1.2 FFmpeg Provenance / License-Profile Closure

The bounded non-local FFmpeg provenance/profile gate is source-closed without changing VoiceLab audio behavior. The prior provenance-unknown `ffmpeg.exe` release assumption was replaced by one exact reviewed Windows build candidate.

Pinned decoder provenance:

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

Hosted inspection of the exact timestamped archive confirmed a static package marker, `--enable-version3`, no `--enable-gpl`, no `--enable-nonfree`, zero DLL files in the archive, and an `ffmpeg -L` result identifying LGPL version 3 or later. A VoiceLab-shaped decode proof (`WAV -> f32le / mono / 32 kHz`) produced the expected output. FFmpeg source identity was resolved to the full upstream commit shown above; the BtbN timestamped release tag resolves to the recorded build-system commit.

The controlled VoiceLab payload contract now requires exactly three FFmpeg companions at the existing source root:

```text
ffmpeg.exe
FFMPEG_LICENSE.txt
FFMPEG_SOURCE.txt
```

`ffmpeg.exe` and `FFMPEG_LICENSE.txt` are hash-pinned. `FFMPEG_LICENSE.txt` must be the exact `LICENSE.txt` from the reviewed BtbN archive. `FFMPEG_SOURCE.txt` must record the exact builder tag/commit, archive/hash, FFmpeg source commit, executable hash, static LGPL profile, and version. `ffplay.exe` and `ffprobe.exe` are explicitly excluded because the approved VoiceLab path does not consume them.

`validate_release_payload.mjs` now fails closed for a wrong FFmpeg executable, wrong/missing license companion, or incomplete source/provenance record. `validate_release_package_contract.mjs` protects those pins at source level. This resolves binary provenance and the observed license profile; it does **not** claim whole-release legal clearance. A distributable release must still satisfy the applicable LGPL/source-availability and third-party notice obligations, and VB-CABLE retains its separate concrete distribution-rights gate.

Accepted hosted evidence:

```text
inspection run 31803628221
Windows Server 2022
archive SHA-256 -> PASS
ffmpeg.exe SHA-256 -> PASS
archive LICENSE.txt SHA-256 -> PASS
static / zero-DLL package -> PASS
no --enable-gpl / --enable-nonfree -> PASS
ffmpeg -L LGPL v3-or-later -> PASS
VoiceLab-shaped decode -> PASS

closure run 31803854783
exact external candidate verification -> PASS
VoiceLab decode operation -> PASS
bounded three-owner source change -> PASS
release scripts syntax -> PASS
release package source contract -> PASS
persistent pins match inspected candidate -> PASS
source commit -> 8d9913cc26b1254ebca71be52bc3fca58fbafcb9
```

The temporary R1.2 inspection, patch, and closure resources were removed after successful proof.

'''
if "## R1.2 FFmpeg Provenance / License-Profile Closure" not in text:
    if marker not in text:
        raise SystemExit("source-closed anchor not found")
    text = text.replace(marker, section + marker, 1)

old_list = "R1.1 g2p-en / Distance dependency containment\nP3 private Python/runtime/model packaging contract"
new_list = "R1.1 g2p-en / Distance dependency containment\nR1.2 FFmpeg provenance / LGPL profile pinning\nP3 private Python/runtime/model packaging contract"
if old_list not in text:
    raise SystemExit("source-closed list anchor not found")
text = text.replace(old_list, new_list, 1)

old_next = "**R1.2 — resolve the controlled `ffmpeg.exe` release provenance/license-profile gate without changing VoiceLab audio behavior. Identify an exact Windows FFmpeg build origin and build configuration whose redistribution obligations are reviewable, pin the selected artifact/version and SHA-256 in the existing voice/release owners, and update the release contract so a floating or provenance-unknown FFmpeg binary cannot be promoted. If no acceptable distributable build/profile can be established from authoritative evidence, STOP and record that blocker instead of substituting another decoder or claiming release clearance. Do not start local Windows testing.**"
new_next = "**R1.3 — close the remaining non-local third-party release notice/source bundle at the existing release owners. Derive the distributable notice/license/source requirements from the frozen `uv.lock`, CPython runtime, pinned ASR/translation/GPT-SoVITS assets, CMUdict, and pinned FFmpeg companions; create only the minimum deterministic notice bundle needed by the installer and make release preflight fail closed when a required notice/source record is absent. Keep VB-CABLE concrete redistribution rights as an external gate: if those rights are not established for the intended release, do not stage provider bytes or claim release clearance. Do not start local Windows testing or installer runtime claims.**"
if old_next not in text:
    raise SystemExit("R1.2 next-step anchor not found")
text = text.replace(old_next, new_next, 1)

path.write_text(text, encoding="utf-8")
print("[r1.2-state] canonical closure prepared")

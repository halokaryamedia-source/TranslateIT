#!/usr/bin/env python3
"""Build TranslateIT's R3 colocated external offline payload.

This script is build-time only. It never downloads assets. It packages the already
validated/staged private runtime inputs into one 7z/LZMA2 payload, computes the
payload hash, renders the NSIS installer hook with that trusted hash, and writes
build evidence outside the user-facing release pair.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

SCHEMA = "translateit.r3.external_payload.v1"
PAYLOAD_FILENAME = "TranslateIT-Payload.7z"
MILMMT_REVISION = "4fc480b6c58dec29c159dcdf9fde0f6d5c354995"
ASR_REVISION = "0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf"
GPT_SOVITS_REVISION = "d523079fc05d9a8028d6085bffe4a2757c32abb6"

PAYLOAD_ROOTS = (
    "EngineData/Backend/LocalWorker/PythonRuntime",
    "EngineData/Backend/RuntimeAssets/ASR/ModelData",
    "EngineData/Backend/RuntimeAssets/Translation/ModelData",
    "EngineData/Backend/RuntimeAssets/Voice/GPTSoVITS",
    "EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/Package",
)

REQUIRED_MARKERS = {
    "EngineData/Backend/LocalWorker/PythonRuntime/python.exe": None,
    "EngineData/Backend/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo/.translateit_model_revision": ASR_REVISION,
    "EngineData/Backend/RuntimeAssets/Translation/ModelData/xiaomi-research--MiLMMT-46-1B-v1.0/.translateit_model_revision": MILMMT_REVISION,
    "EngineData/Backend/RuntimeAssets/Voice/GPTSoVITS/Source/TRANSLATEIT_GPTSOVITS_REVISION.txt": GPT_SOVITS_REVISION,
    "EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/Package/VBCABLE_Setup_x64.exe": None,
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_file(path: Path, label: str) -> None:
    if not path.is_file() or path.stat().st_size <= 0:
        raise RuntimeError(f"missing required file: {label}: {path}")


def validate_inputs(repo_root: Path) -> None:
    for relative in PAYLOAD_ROOTS:
        path = repo_root / relative
        if not path.is_dir():
            raise RuntimeError(f"missing payload root: {relative}")

    for relative, expected_text in REQUIRED_MARKERS.items():
        path = repo_root / relative
        require_file(path, relative)
        if expected_text is not None:
            actual = path.read_text(encoding="utf-8").strip()
            if actual != expected_text:
                raise RuntimeError(
                    f"payload marker mismatch: {relative}: expected {expected_text}, got {actual}"
                )


def find_tar() -> str:
    for candidate in ("tar.exe", "tar"):
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    raise RuntimeError(
        "Windows tar/bsdtar is required to build the R3 7z payload. "
        "Do not substitute a user-facing 7-Zip dependency."
    )


def create_payload(repo_root: Path, output_path: Path, tar_program: str) -> list[str]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.unlink(missing_ok=True)

    command = [
        tar_program,
        "--format=7zip",
        "--options",
        "7zip:compression=lzma2,7zip:compression-level=9",
        "-cf",
        str(output_path),
        "-C",
        str(repo_root),
        *PAYLOAD_ROOTS,
    ]
    subprocess.run(command, check=True)
    require_file(output_path, PAYLOAD_FILENAME)

    listing = subprocess.run(
        [tar_program, "-tf", str(output_path)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    ).stdout.splitlines()
    entries = [line.strip().replace("\\", "/") for line in listing if line.strip()]
    if not entries:
        raise RuntimeError("payload archive listing is empty")

    allowed_prefixes = tuple(root.rstrip("/") + "/" for root in PAYLOAD_ROOTS)
    allowed_exact = set(PAYLOAD_ROOTS)
    for entry in entries:
        normalized = entry.rstrip("/")
        if normalized.startswith("/") or "../" in f"/{normalized}/":
            raise RuntimeError(f"unsafe payload archive entry: {entry}")
        if normalized not in allowed_exact and not normalized.startswith(allowed_prefixes):
            raise RuntimeError(f"payload archive entry escapes approved roots: {entry}")

    for marker in REQUIRED_MARKERS:
        normalized = marker.replace("\\", "/")
        if normalized not in {entry.rstrip("/") for entry in entries}:
            raise RuntimeError(f"required payload marker absent from archive: {normalized}")
    return entries


def render_hook(template_path: Path, generated_hook_path: Path, helper_path: Path, digest: str) -> None:
    template = template_path.read_text(encoding="utf-8")
    replacements = {
        "@@PAYLOAD_SCHEMA@@": SCHEMA,
        "@@PAYLOAD_FILENAME@@": PAYLOAD_FILENAME,
        "@@PAYLOAD_SHA256@@": digest,
        "@@INSTALLER_HELPER_SOURCE@@": str(helper_path.resolve()).replace("/", "\\"),
    }
    rendered = template
    for token, value in replacements.items():
        if token not in rendered:
            raise RuntimeError(f"installer hook template token missing: {token}")
        rendered = rendered.replace(token, value)
    if "@@" in rendered:
        raise RuntimeError("installer hook template contains unresolved placeholders")

    generated_hook_path.parent.mkdir(parents=True, exist_ok=True)
    generated_hook_path.write_text(rendered, encoding="utf-8", newline="\n")


def write_evidence(path: Path, payload_path: Path, digest: str, entries: list[str], tar_program: str) -> None:
    evidence = {
        "schema": SCHEMA,
        "payload_file": PAYLOAD_FILENAME,
        "payload_path": str(payload_path.resolve()),
        "sha256": digest,
        "archive_format": "7z",
        "compression": "LZMA2",
        "compression_level": 9,
        "install_root": "$INSTDIR",
        "runtime_root_contract": "Windows Tauri resource_dir == main executable directory",
        "tar_program": tar_program,
        "payload_roots": list(PAYLOAD_ROOTS),
        "entry_count": len(entries),
        "expected_revisions": {
            "milmmt": MILMMT_REVISION,
            "faster_whisper": ASR_REVISION,
            "gpt_sovits": GPT_SOVITS_REVISION,
        },
        "user_facing_files": ["TranslateIT-Setup.exe", PAYLOAD_FILENAME],
        "network_download": False,
        "manual_extraction": False,
        "second_installer": False,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--hook-template", required=True, type=Path)
    parser.add_argument("--installer-helper", required=True, type=Path)
    parser.add_argument("--generated-hook", required=True, type=Path)
    parser.add_argument("--evidence", required=True, type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    if not (repo_root / "AGENTS.md").is_file():
        raise RuntimeError(f"invalid TranslateIT repository root: {repo_root}")
    require_file(args.hook_template, "R3 NSIS hook template")
    require_file(args.installer_helper, "R3 installer helper")

    validate_inputs(repo_root)
    tar_program = find_tar()
    entries = create_payload(repo_root, args.output.resolve(), tar_program)
    digest = sha256_file(args.output.resolve())
    render_hook(
        args.hook_template.resolve(),
        args.generated_hook.resolve(),
        args.installer_helper.resolve(),
        digest,
    )
    write_evidence(args.evidence.resolve(), args.output.resolve(), digest, entries, tar_program)

    print(f"[r3-payload] payload={args.output.resolve()}")
    print(f"[r3-payload] sha256={digest}")
    print(f"[r3-payload] entries={len(entries)}")
    print(f"[r3-payload] generated_hook={args.generated_hook.resolve()}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001 - build boundary must fail closed with one clear reason.
        print(f"[r3-payload] FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)

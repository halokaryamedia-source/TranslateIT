"""Headless execution boundary for pinned GPT-SoVITS VoiceLab stages.

The reviewed VoiceLab path consumes only ``clean_path`` and ``load_audio`` from
upstream ``tools.my_utils``. Upstream couples that module to Gradio for WebUI
warnings, which is not part of TranslateIT. This runner injects only the two
functions the approved training/evaluation path consumes, then executes the
pinned upstream script unchanged.
"""

from __future__ import annotations

import importlib
import os
import runpy
import sys
import types
from pathlib import Path
from typing import Any

import ffmpeg
import numpy as np


def clean_path(path_value: Any) -> str:
    path = str(path_value)
    if path.endswith(("\\", "/")):
        return clean_path(path[:-1])
    return path.replace("/", os.sep).replace("\\", os.sep).strip(" '\n\"\u202a")


def _ffmpeg_program(source_root: Path) -> Path:
    return source_root / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")


def _load_audio(source_root: Path, file: Any, sample_rate: Any) -> np.ndarray:
    audio_path = clean_path(file)
    if not os.path.isfile(audio_path):
        raise RuntimeError("voice_lab:upstream_audio_missing")
    ffmpeg_program = _ffmpeg_program(source_root)
    if not ffmpeg_program.is_file():
        raise RuntimeError("voice_lab:ffmpeg_runtime_missing")
    try:
        output, _ = (
            ffmpeg.input(audio_path, threads=0)
            .output(
                "-",
                format="f32le",
                acodec="pcm_f32le",
                ac=1,
                ar=int(sample_rate),
            )
            .run(
                cmd=[str(ffmpeg_program), "-nostdin"],
                capture_stdout=True,
                capture_stderr=True,
            )
        )
    except Exception as exc:
        raise RuntimeError("voice_lab:upstream_audio_decode_failed") from exc
    return np.frombuffer(output, np.float32).flatten()


def install_headless_my_utils(source_root: Path) -> None:
    source_root = source_root.resolve()
    gpt_sovits_root = source_root / "GPT_SoVITS"
    if not gpt_sovits_root.is_dir():
        raise RuntimeError("voice_lab:gpt_sovits_source_missing")

    for path in (str(gpt_sovits_root), str(source_root)):
        if path not in sys.path:
            sys.path.insert(0, path)

    tools_package = importlib.import_module("tools")
    module = types.ModuleType("tools.my_utils")
    module.clean_path = clean_path
    module.load_audio = lambda file, sr: _load_audio(source_root, file, sr)
    sys.modules["tools.my_utils"] = module
    setattr(tools_package, "my_utils", module)


def run_upstream_script(source_root: Path, script: Path, script_args: list[str]) -> None:
    source_root = source_root.resolve()
    script = script.resolve()
    try:
        script.relative_to(source_root)
    except ValueError as exc:
        raise RuntimeError("voice_lab:upstream_script_outside_source") from exc
    if not script.is_file():
        raise RuntimeError("voice_lab:upstream_script_missing")

    install_headless_my_utils(source_root)
    sys.argv = [str(script), *script_args]
    runpy.run_path(str(script), run_name="__main__")


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: voice_lab_upstream_stage.py <source-root> <script> [args...]", file=sys.stderr)
        return 2
    run_upstream_script(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3:])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

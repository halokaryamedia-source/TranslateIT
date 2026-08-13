"""Create verified derived copies for the pinned GPT-SoVITS TorchAudio imports.

The upstream asset tree stays immutable. Only audio I/O/resampling imports are
replaced; model, preprocessing, training, and inference logic remains pinned.
"""

from __future__ import annotations

from pathlib import Path


class CompatibilityPatchError(RuntimeError):
    pass


def _replace_once(text: str, old: str, new: str, label: str) -> str:
    if text.count(old) != 1:
        raise CompatibilityPatchError(f"compat_source_mismatch:{label}")
    return text.replace(old, new, 1)


def _write_derived(source: Path, target: Path, replacements: list[tuple[str, str, str]]) -> Path:
    text = source.read_text(encoding="utf-8")
    for old, new, label in replacements:
        text = _replace_once(text, old, new, label)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8", newline="\n")
    return target


def prepare_sv_script(source: Path, target_dir: Path) -> Path:
    return _write_derived(
        source,
        target_dir / "2-get-sv-translateit.py",
        [
            ("import torchaudio", "import voice_lab_audio_compat as torchaudio", "sv_torchaudio_import"),
            (
                "torchaudio.transforms.Resample(32000, 16000)",
                "torchaudio.Resample(32000, 16000)",
                "sv_resample_constructor",
            ),
        ],
    )


def prepare_tts_script(source: Path, target_dir: Path) -> Path:
    return _write_derived(
        source,
        target_dir / "TTS-translateit.py",
        [
            ("import torchaudio", "import voice_lab_audio_compat as torchaudio", "tts_torchaudio_import"),
            (
                "torchaudio.transforms.Resample(sr0, sr1)",
                "torchaudio.Resample(sr0, sr1)",
                "tts_resample_constructor",
            ),
            (
                "from tools.audio_sr import AP_BWE",
                "class AP_BWE:\n    def __init__(self, *_args, **_kwargs):\n        raise FileNotFoundError",
                "tts_optional_super_resolution_import",
            ),
        ],
    )

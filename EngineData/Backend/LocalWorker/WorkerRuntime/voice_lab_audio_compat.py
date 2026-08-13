"""Audio I/O/resampling compatibility for VoiceLab's pinned V2ProPlus path."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import librosa
import numpy as np
import soundfile as sf
import torch


def load(uri: str | Path, *args: Any, **kwargs: Any) -> tuple[torch.Tensor, int]:
    del args, kwargs
    audio, sample_rate = sf.read(str(uri), dtype="float32", always_2d=True)
    if audio.size == 0 or sample_rate <= 0:
        raise RuntimeError("voice_lab:audio_load_empty")
    return torch.from_numpy(np.ascontiguousarray(audio.T)), int(sample_rate)


def resample(waveform: torch.Tensor, orig_freq: int, new_freq: int) -> torch.Tensor:
    if orig_freq <= 0 or new_freq <= 0:
        raise ValueError("invalid sample rate")
    if waveform.numel() == 0 or orig_freq == new_freq:
        return waveform.clone()

    source = waveform.detach()
    shape = tuple(source.shape)
    rows = source.float().cpu().reshape(-1, shape[-1]).numpy()
    converted = np.stack(
        [librosa.resample(row, orig_sr=orig_freq, target_sr=new_freq, res_type="soxr_hq") for row in rows]
    ).astype(np.float32, copy=False)
    output = torch.from_numpy(converted.reshape(*shape[:-1], converted.shape[-1]))
    return output.to(device=source.device, dtype=source.dtype)


class Resample:
    def __init__(self, orig_freq: int, new_freq: int) -> None:
        self.orig_freq = int(orig_freq)
        self.new_freq = int(new_freq)

    def to(self, *_args: object, **_kwargs: object) -> "Resample":
        return self

    def __call__(self, waveform: torch.Tensor) -> torch.Tensor:
        return resample(waveform, self.orig_freq, self.new_freq)

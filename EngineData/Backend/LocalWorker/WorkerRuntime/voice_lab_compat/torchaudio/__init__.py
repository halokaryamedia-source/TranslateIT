"""VoiceLab-only compatibility surface for the pinned GPT-SoVITS source.

PyTorch 2.13 stable has no matching TorchAudio wheel. The reviewed V2ProPlus
path only needs WAV loading and resampling, so VoiceLab supplies exactly those
operations without installing a second/incompatible torch stack.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf
import torch

from . import functional, transforms

__all__ = ["functional", "load", "transforms"]


def load(uri: str | Path, *args: Any, **kwargs: Any) -> tuple[torch.Tensor, int]:
    del args, kwargs
    audio, sample_rate = sf.read(str(uri), dtype="float32", always_2d=True)
    if audio.size == 0 or sample_rate <= 0:
        raise RuntimeError("voice_lab:audio_load_empty")
    channels_first = np.ascontiguousarray(audio.T)
    return torch.from_numpy(channels_first), int(sample_rate)
